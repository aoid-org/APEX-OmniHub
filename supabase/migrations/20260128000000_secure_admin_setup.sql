-- Secure Admin Claim System (sanitized)
-- Original migration created the claim_admin_access function.
-- The function is replaced by migration 20260208000000_secure_admin_bcrypt.sql
-- which removes the hardcoded secret and uses bcrypt comparison via admin_claim_secrets table.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Placeholder function (will be replaced by subsequent migration)
CREATE OR REPLACE FUNCTION public.claim_admin_access(secret_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- This function is replaced by migration 20260208000000_secure_admin_bcrypt.sql
  RETURN false;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_admin_access(text) TO authenticated;

COMMENT ON FUNCTION public.claim_admin_access IS 'Securely claim admin privileges providing the correct launch key.';
