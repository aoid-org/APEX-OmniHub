-- ============================================================================
-- Fix: claim_admin_access() must insert into user_roles (not just app_metadata)
-- ============================================================================
-- The 20260208 bcrypt migration replaced claim_admin_access() but only set
-- app_metadata. The trigger from 20260205 should sync to user_roles, but
-- triggers on auth.users may not always fire in all Supabase environments.
-- This patch adds an explicit belt-and-suspenders INSERT into user_roles
-- so that claim_admin_access() atomically grants DB-backed admin.
--
-- Result: claim_admin_access(secret) -> app_metadata + user_roles (atomic)
-- This ensures is_admin(auth.uid()) returns true immediately after claim.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_admin_access(secret_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _user_id uuid;
  _stored_hash text;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Retrieve the stored bcrypt hash (single-row table)
  SELECT secret_hash INTO _stored_hash
  FROM public.admin_claim_secrets
  LIMIT 1;

  -- If no hash configured yet, deny access
  IF _stored_hash IS NULL THEN
    RETURN false;
  END IF;

  -- bcrypt comparison via pgcrypto
  IF public.crypt(secret_key, _stored_hash) = _stored_hash THEN
    -- Step 1: Set app_metadata (triggers sync_admin_metadata_to_user_roles if present)
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "admin": true}'::jsonb
    WHERE id = _user_id;

    -- Step 2: Explicit insert into user_roles (source of truth for RLS is_admin())
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE LOG 'Admin role granted to user % via claim_admin_access (bcrypt)', _user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Permissions (idempotent)
GRANT EXECUTE ON FUNCTION public.claim_admin_access(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_admin_access(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.claim_admin_access(text) FROM anon;

COMMENT ON FUNCTION public.claim_admin_access(text) IS
'[v3.0] Bcrypt-verified admin claim. Atomically sets app_metadata AND inserts user_roles. See migration 20260214000000.';
