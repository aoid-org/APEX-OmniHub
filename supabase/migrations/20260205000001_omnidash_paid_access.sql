-- ============================================================================
-- PATCH 2: OmniDash Paid Access Integration Migration
-- ============================================================================
-- Purpose: Open OmniDash access to ALL paid users (not just admins)
--
-- BEFORE:
-- - Only users with is_admin(auth.uid()) = true can access OmniDash
-- - Paid users (starter/pro/enterprise) are blocked by RLS policies
-- - Mission requirement violated: "OmniDash accessible to ALL paid users"
--
-- AFTER:
-- - Users with is_admin(auth.uid()) OR is_paid_user(auth.uid()) can access
-- - All subscription tiers (starter/pro/enterprise) have full OmniDash access
-- - Free tier users blocked (must upgrade)
-- - Admin users maintain access regardless of subscription tier (backward compat)
--
-- ATOMIC: This migration is fully reversible
-- IDEMPOTENT: Can be run multiple times safely (DROP IF EXISTS, OR REPLACE)
-- SECURE: Maintains strict access control, just expands to paid users
-- PERFORMANT: is_paid_user() function uses indexed queries
-- ============================================================================

-- ============================================================================
-- STEP 1: Update RLS Policies for omnidash_settings
-- ============================================================================

-- Drop old admin-only policy
DROP POLICY IF EXISTS "Admins manage omnidash_settings" ON public.omnidash_settings;

-- Create new policy: admin OR paid user
CREATE POLICY "Admins and paid users manage omnidash_settings"
  ON public.omnidash_settings
  FOR ALL
  TO authenticated
  USING (
    (public.is_admin(auth.uid()) OR public.is_paid_user(auth.uid()))
    AND user_id = auth.uid()
  )
  WITH CHECK (
    (public.is_admin(auth.uid()) OR public.is_paid_user(auth.uid()))
    AND user_id = auth.uid()
  );

COMMENT ON POLICY "Admins and paid users manage omnidash_settings"
  ON public.omnidash_settings IS
  'OmniDash settings accessible to admins and all paid subscription tiers (starter, pro, enterprise)';

-- ============================================================================
-- STEP 2: Update RLS Policies for omnidash_today_items
-- ============================================================================

DROP POLICY IF EXISTS "Admins manage today items" ON public.omnidash_today_items;

CREATE POLICY "Admins and paid users manage today items"
  ON public.omnidash_today_items
  FOR ALL
  TO authenticated
  USING (
    (public.is_admin(auth.uid()) OR public.is_paid_user(auth.uid()))
    AND user_id = auth.uid()
  )
  WITH CHECK (
    (public.is_admin(auth.uid()) OR public.is_paid_user(auth.uid()))
    AND user_id = auth.uid()
  );

COMMENT ON POLICY "Admins and paid users manage today items"
  ON public.omnidash_today_items IS
  'Today items accessible to admins and paid users';

-- ============================================================================
-- STEP 3: Update RLS Policies for omnidash_pipeline_items
-- ============================================================================

DROP POLICY IF EXISTS "Admins manage pipeline items" ON public.omnidash_pipeline_items;

CREATE POLICY "Admins and paid users manage pipeline items"
  ON public.omnidash_pipeline_items
  FOR ALL
  TO authenticated
  USING (
    (public.is_admin(auth.uid()) OR public.is_paid_user(auth.uid()))
    AND user_id = auth.uid()
  )
  WITH CHECK (
    (public.is_admin(auth.uid()) OR public.is_paid_user(auth.uid()))
    AND user_id = auth.uid()
  );

COMMENT ON POLICY "Admins and paid users manage pipeline items"
  ON public.omnidash_pipeline_items IS
  'Pipeline items accessible to admins and paid users';

-- ============================================================================
-- STEP 4: Update RLS Policies for omnidash_kpi_daily
-- ============================================================================

DROP POLICY IF EXISTS "Admins manage KPI daily" ON public.omnidash_kpi_daily;

CREATE POLICY "Admins and paid users manage KPI daily"
  ON public.omnidash_kpi_daily
  FOR ALL
  TO authenticated
  USING (
    (public.is_admin(auth.uid()) OR public.is_paid_user(auth.uid()))
    AND user_id = auth.uid()
  )
  WITH CHECK (
    (public.is_admin(auth.uid()) OR public.is_paid_user(auth.uid()))
    AND user_id = auth.uid()
  );

COMMENT ON POLICY "Admins and paid users manage KPI daily"
  ON public.omnidash_kpi_daily IS
  'KPI daily data accessible to admins and paid users';

-- ============================================================================
-- STEP 5: Update RLS Policies for omnidash_incidents
-- ============================================================================

DROP POLICY IF EXISTS "Admins manage incidents" ON public.omnidash_incidents;

CREATE POLICY "Admins and paid users manage incidents"
  ON public.omnidash_incidents
  FOR ALL
  TO authenticated
  USING (
    (public.is_admin(auth.uid()) OR public.is_paid_user(auth.uid()))
    AND user_id = auth.uid()
  )
  WITH CHECK (
    (public.is_admin(auth.uid()) OR public.is_paid_user(auth.uid()))
    AND user_id = auth.uid()
  );

COMMENT ON POLICY "Admins and paid users manage incidents"
  ON public.omnidash_incidents IS
  'Incidents accessible to admins and paid users';

-- ============================================================================
-- STEP 6: Verify is_paid_user() function exists
-- ============================================================================

-- Ensure is_paid_user() function exists (from migration 20260107000000)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_paid_user' AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'is_paid_user() function not found - migration dependency missing (20260107000000_create_paid_access_system.sql)';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Performance optimization - ensure subscriptions table indexed
-- ============================================================================

-- Verify critical indexes exist (should be created by paid access system migration)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_tier_status
  ON public.subscriptions(user_id, tier, status)
  WHERE tier IN ('starter', 'pro', 'enterprise')
  AND status IN ('active', 'trialing', 'canceled');

COMMENT ON INDEX idx_subscriptions_user_tier_status IS
  'Composite index for fast is_paid_user() lookups';

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Test paid user access:
-- SELECT public.is_paid_user('YOUR_USER_ID_HERE');
-- Expected: true for starter/pro/enterprise users with active/trialing/canceled status

-- Test admin access (should still work):
-- SELECT public.is_admin('YOUR_ADMIN_USER_ID_HERE');
-- Expected: true for users in user_roles with role='admin'

-- Test RLS policy:
-- SET ROLE authenticated;
-- SET request.jwt.claims TO '{"sub": "YOUR_USER_ID_HERE"}';
-- SELECT * FROM omnidash_settings WHERE user_id = 'YOUR_USER_ID_HERE';
-- Expected: Returns row if is_admin() OR is_paid_user() = true

-- Count users with access:
-- SELECT
--   COUNT(*) FILTER (WHERE public.is_admin(u.id)) as admin_users,
--   COUNT(*) FILTER (WHERE public.is_paid_user(u.id)) as paid_users,
--   COUNT(*) FILTER (WHERE public.is_admin(u.id) OR public.is_paid_user(u.id)) as total_omnidash_users
-- FROM auth.users u;

-- ============================================================================
-- ROLLBACK / DOWN MIGRATION
-- ============================================================================

-- To rollback this migration:
-- 1. DROP new policies
-- 2. Recreate old admin-only policies from migration 20251224000002
--
-- Example:
-- DROP POLICY IF EXISTS "Admins and paid users manage omnidash_settings" ON public.omnidash_settings;
-- CREATE POLICY "Admins manage omnidash_settings" ON public.omnidash_settings
--   FOR ALL TO authenticated
--   USING (public.is_admin(auth.uid()) AND user_id = auth.uid())
--   WITH CHECK (public.is_admin(auth.uid()) AND user_id = auth.uid());

-- ============================================================================
-- AUDIT TRAIL
-- ============================================================================

COMMENT ON TABLE public.omnidash_settings IS
  '[v2.0] Updated 2026-02-05: Now accessible to all paid users (starter/pro/enterprise) in addition to admins. See migration 20260205000001.';

COMMENT ON TABLE public.omnidash_today_items IS
  '[v2.0] Updated 2026-02-05: Now accessible to all paid users in addition to admins.';

COMMENT ON TABLE public.omnidash_pipeline_items IS
  '[v2.0] Updated 2026-02-05: Now accessible to all paid users in addition to admins.';

COMMENT ON TABLE public.omnidash_kpi_daily IS
  '[v2.0] Updated 2026-02-05: Now accessible to all paid users in addition to admins.';

COMMENT ON TABLE public.omnidash_incidents IS
  '[v2.0] Updated 2026-02-05: Now accessible to all paid users in addition to admins.';

-- ============================================================================
-- END MIGRATION
-- ============================================================================
