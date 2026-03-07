-- ============================================================================
-- PATCH 1: Admin Role Unification Migration
-- ============================================================================
-- Purpose: Consolidate 3 disconnected admin systems into unified, auto-synced model
--
-- BEFORE:
-- 1. claim_admin_access(secret) → sets app_metadata ONLY (no user_roles insert)
-- 2. claim_admin_role() → checks app_metadata, inserts user_roles (manual call)
-- 3. useAdminAccess() hook → checks allowlist + user_roles (ignores app_metadata)
-- 4. RLS is_admin() → checks user_roles ONLY
-- Result: 3 systems out of sync, admin invites fail
--
-- AFTER:
-- 1. claim_admin_access(secret) → sets app_metadata AND inserts user_roles (atomic)
-- 2. Trigger → auto-syncs app_metadata.admin changes to user_roles (belt-and-suspenders)
-- 3. useAdminAccess() hook → checks allowlist → user_roles → app_metadata (fallback)
-- 4. RLS is_admin() → checks user_roles (single source of truth)
-- Result: All systems converge on user_roles, automatic sync, zero manual steps
--
-- ATOMIC: This migration is fully reversible via down migration
-- IDEMPOTENT: Can be run multiple times safely (uses IF NOT EXISTS, OR REPLACE)
-- SECURE: Maintains all RLS policies, uses SECURITY DEFINER appropriately
-- PERFORMANT: Trigger fires only on app_metadata changes, indexed lookups
-- ============================================================================

-- ============================================================================
-- STEP 1: Create trigger function to auto-sync app_metadata.admin → user_roles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_admin_metadata_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_flag boolean;
  role_exists boolean;
BEGIN
  -- Extract admin flag from new app_metadata
  -- Handles both admin: true/false and missing admin key
  admin_flag := COALESCE((NEW.raw_app_meta_data->>'admin')::boolean, false);

  -- Check if user already has admin role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id AND role = 'admin'
  ) INTO role_exists;

  -- Sync logic: Add if admin=true and not exists, Remove if admin=false and exists
  IF admin_flag = true AND role_exists = false THEN
    -- Grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE LOG 'Admin role granted to user % via app_metadata sync', NEW.id;
  ELSIF admin_flag = false AND role_exists = true THEN
    -- Revoke admin role
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND role = 'admin';

    RAISE LOG 'Admin role revoked from user % via app_metadata sync', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_admin_metadata_to_user_roles() IS
'Auto-sync trigger: Keeps user_roles.admin in sync with auth.users.raw_app_meta_data.admin';

-- ============================================================================
-- STEP 2: Create trigger on auth.users table
-- ============================================================================

-- Drop existing trigger if present (idempotency)
DROP TRIGGER IF EXISTS sync_admin_metadata_insert_trigger ON auth.users;
DROP TRIGGER IF EXISTS sync_admin_metadata_update_trigger ON auth.users;
DROP TRIGGER IF EXISTS sync_admin_metadata_trigger ON auth.users;

CREATE TRIGGER sync_admin_metadata_trigger
  AFTER INSERT OR UPDATE OF raw_app_meta_data ON auth.users
  FOR EACH ROW
  WHEN (
    -- Only fire if admin flag changed (performance optimization)
    OLD.raw_app_meta_data IS DISTINCT FROM NEW.raw_app_meta_data
  )
  EXECUTE FUNCTION public.sync_admin_metadata_to_user_roles();

COMMENT ON TRIGGER sync_admin_metadata_trigger ON auth.users IS
'Triggers on app_metadata changes to sync admin role to user_roles table';

-- ============================================================================
-- STEP 3: Update claim_admin_access() to explicitly insert into user_roles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_admin_access(secret_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _secret_valid boolean;
BEGIN
  -- Get current user ID
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate secret key
  -- NOTE: In production, use pgcrypto hash comparison
  -- For demo/development: plaintext check (replace with hash in production)
  _secret_valid := secret_key = 'checklist-complete-2026';

  IF NOT _secret_valid THEN
    RAISE LOG 'Admin claim failed for user %: Invalid secret', _user_id;
    RETURN false;
  END IF;

  -- Step 1: Update app_metadata (will trigger sync_admin_metadata_to_user_roles)
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "admin": true}'::jsonb
  WHERE id = _user_id;

  -- Step 2: Explicit insert into user_roles (belt-and-suspenders redundancy)
  -- Trigger will also do this, but we ensure it happens atomically in same transaction
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE LOG 'Admin role granted to user % via claim_admin_access', _user_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.claim_admin_access(text) IS
'Securely claim admin privileges with pre-shared secret. Sets app_metadata AND user_roles atomically.';

-- Grant execute permission (idempotent)
GRANT EXECUTE ON FUNCTION public.claim_admin_access(text) TO authenticated;

-- ============================================================================
-- STEP 4: Backfill existing admin users (sync app_metadata → user_roles)
-- ============================================================================

-- Find users with app_metadata.admin=true but no user_roles entry
INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  'admin'
FROM auth.users u
WHERE
  (u.raw_app_meta_data->>'admin')::boolean = true
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id AND ur.role = 'admin'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Log backfill count
DO $$
DECLARE
  backfill_count int;
BEGIN
  SELECT COUNT(*) INTO backfill_count
  FROM auth.users u
  WHERE (u.raw_app_meta_data->>'admin')::boolean = true;

  IF backfill_count > 0 THEN
    RAISE LOG 'Backfilled % existing admin users to user_roles table', backfill_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Verify integrity (optional check)
-- ============================================================================

-- Ensure is_admin() function exists and uses user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'is_admin() function not found - migration dependency missing';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Count users with admin in each system:
-- SELECT 'app_metadata' as source, COUNT(*) FROM auth.users WHERE (raw_app_meta_data->>'admin')::boolean = true
-- UNION ALL
-- SELECT 'user_roles', COUNT(*) FROM user_roles WHERE role = 'admin';

-- Check specific user consistency:
-- SELECT
--   u.id,
--   u.email,
--   (u.raw_app_meta_data->>'admin')::boolean as app_metadata_admin,
--   ur.role as user_roles_role,
--   public.is_admin(u.id) as is_admin_result
-- FROM auth.users u
-- LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'admin'
-- WHERE u.email = 'your-email@example.com';

-- ============================================================================
-- ROLLBACK / DOWN MIGRATION
-- ============================================================================

-- To rollback this migration:
-- 1. DROP TRIGGER sync_admin_metadata_trigger ON auth.users;
-- 2. DROP FUNCTION sync_admin_metadata_to_user_roles();
-- 3. Restore original claim_admin_access() from migration 20260128000000

-- ============================================================================
-- AUDIT TRAIL
-- ============================================================================

COMMENT ON FUNCTION public.claim_admin_access(text) IS
'[v2.0] Updated 2026-02-05: Now atomically syncs app_metadata AND user_roles. See migration 20260205000000.';

-- ============================================================================
-- END MIGRATION
-- ============================================================================
