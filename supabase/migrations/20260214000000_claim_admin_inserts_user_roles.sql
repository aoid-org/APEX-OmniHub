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
  _admin_role constant text := 'admin';
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
      COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', _admin_role, 'admin', true)
    WHERE id = _user_id;

    -- Step 2: Explicit insert into user_roles (source of truth for RLS is_admin())
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _admin_role)
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

-- ============================================================================
-- Fix: sync_admin_metadata_to_user_roles() trigger search_path hardening
-- ============================================================================
-- The 20260205 migration used SET search_path = public which is too permissive
-- for a SECURITY DEFINER function. Harden to search_path = '' with explicit
-- schema qualification (already present in the function body).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_admin_metadata_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_flag boolean;
  role_exists boolean;
  _admin_role constant text := 'admin';
BEGIN
  admin_flag := COALESCE((NEW.raw_app_meta_data->>'admin')::boolean, false);

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id AND role = _admin_role
  ) INTO role_exists;

  IF admin_flag = true AND role_exists = false THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _admin_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE LOG 'Admin role granted to user % via app_metadata sync', NEW.id;
  ELSIF admin_flag = false AND role_exists = true THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND role = _admin_role;
    RAISE LOG 'Admin role revoked from user % via app_metadata sync', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_admin_metadata_to_user_roles() IS
'[v2.0] Auto-sync trigger: Keeps user_roles.admin in sync with auth.users.raw_app_meta_data.admin. search_path hardened.';
