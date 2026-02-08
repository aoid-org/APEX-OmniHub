-- Secure Admin Claim System - bcrypt upgrade
-- Replaces hardcoded plaintext secret with bcrypt hash lookup from admin_claim_secrets table.
--
-- Post-deploy setup required:
-- 1. Generate a bcrypt hash for your admin secret:
--      SELECT public.crypt('YOUR_SECRET_HERE', public.gen_salt('bf'));
-- 2. Insert the hash using service role:
--      INSERT INTO public.admin_claim_secrets (secret_hash)
--      VALUES ('$2a$06$...');
--
-- Rollback: DROP TABLE public.admin_claim_secrets; then re-run the original migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A) Create admin_claim_secrets table (one-row design)
CREATE TABLE IF NOT EXISTS public.admin_claim_secrets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  secret_hash text,
  created_at timestamptz DEFAULT now(),
  rotated_at timestamptz
);

-- Only service role can read/write this table
ALTER TABLE public.admin_claim_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_claim_secrets FROM public;
REVOKE ALL ON public.admin_claim_secrets FROM authenticated;
REVOKE ALL ON public.admin_claim_secrets FROM anon;
GRANT ALL ON public.admin_claim_secrets TO service_role;

COMMENT ON TABLE public.admin_claim_secrets IS
  'Stores bcrypt hash for admin claim secret. Set secret_hash post-deploy via service role.';

-- B) Replace claim_admin_access function with bcrypt comparison
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
    -- Grant Admin Role via App Metadata (Supabase Auth)
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "admin": true}'::jsonb
    WHERE id = _user_id;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Ensure authenticated users can call the function
GRANT EXECUTE ON FUNCTION public.claim_admin_access(text) TO authenticated;

-- Revoke public execute (function is SECURITY DEFINER)
REVOKE EXECUTE ON FUNCTION public.claim_admin_access(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.claim_admin_access(text) FROM anon;
