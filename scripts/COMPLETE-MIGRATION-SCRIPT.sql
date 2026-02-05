-- ============================================================================
-- COMPLETE MIGRATIONS SCRIPT FOR SUPABASE SQL EDITOR
-- ============================================================================
-- Migration 1: Admin Role Unification (20260205000000)
-- Migration 2: OmniDash Paid Access Integration (20260205000001)
--
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE file
-- 2. Go to: https://supabase.com/dashboard/project/rtopreovkywofgwgmozi/sql/new
-- 3. Paste into SQL Editor
-- 4. Click "Run" button
-- 5. Wait for "Success" message
-- 6. Then grant yourself access (see bottom of file)
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Admin Role Unification
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
  admin_flag := COALESCE((NEW.raw_app_meta_data->>'admin')::boolean, false);

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id AND role = 'admin'
  ) INTO role_exists;

  IF admin_flag = true AND role_exists = false THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE LOG 'Admin role granted to user % via app_metadata sync', NEW.id;
  ELSIF admin_flag = false AND role_exists = true THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND role = 'admin';

    RAISE LOG 'Admin role revoked from user % via app_metadata sync', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_admin_metadata_to_user_roles() IS
'Auto-sync trigger: Keeps user_roles.admin in sync with auth.users.raw_app_meta_data.admin';

DROP TRIGGER IF EXISTS sync_admin_metadata_trigger ON auth.users;

CREATE TRIGGER sync_admin_metadata_trigger
  AFTER INSERT OR UPDATE OF raw_app_meta_data ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.raw_app_meta_data IS DISTINCT FROM NEW.raw_app_meta_data
  )
  EXECUTE FUNCTION public.sync_admin_metadata_to_user_roles();

COMMENT ON TRIGGER sync_admin_metadata_trigger ON auth.users IS
'Triggers on app_metadata changes to sync admin role to user_roles table';

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
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  _secret_valid := secret_key = 'checklist-complete-2026';

  IF NOT _secret_valid THEN
    RAISE LOG 'Admin claim failed for user %: Invalid secret', _user_id;
    RETURN false;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "admin": true}'::jsonb
  WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE LOG 'Admin role granted to user % via claim_admin_access', _user_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.claim_admin_access(text) IS
'Securely claim admin privileges with pre-shared secret. Sets app_metadata AND user_roles atomically.';

GRANT EXECUTE ON FUNCTION public.claim_admin_access(text) TO authenticated;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'is_admin() function not found - migration dependency missing';
  END IF;
END $$;

COMMENT ON FUNCTION public.claim_admin_access(text) IS
'[v2.0] Updated 2026-02-05: Now atomically syncs app_metadata AND user_roles. See migration 20260205000000.';

-- ============================================================================
-- MIGRATION 2: OmniDash Paid Access Integration
-- ============================================================================

DROP POLICY IF EXISTS "Admins manage omnidash_settings" ON public.omnidash_settings;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_paid_user' AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'is_paid_user() function not found - migration dependency missing (20260107000000_create_paid_access_system.sql)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_tier_status
  ON public.subscriptions(user_id, tier, status)
  WHERE tier IN ('starter', 'pro', 'enterprise')
  AND status IN ('active', 'trialing', 'canceled');

COMMENT ON INDEX idx_subscriptions_user_tier_status IS
  'Composite index for fast is_paid_user() lookups';

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
-- ✅ MIGRATIONS COMPLETE! Now grant yourself access below
-- ============================================================================

-- STEP 1: Find your user ID (replace 'your-email@example.com')
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- STEP 2: Copy the UUID from above, then run these (replace YOUR-USER-ID):

-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('YOUR-USER-ID', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- INSERT INTO public.subscriptions (user_id, tier, status, current_period_start, current_period_end)
-- VALUES ('YOUR-USER-ID', 'pro', 'active', NOW(), NOW() + INTERVAL '1 year')
-- ON CONFLICT (user_id) DO UPDATE SET tier = 'pro', status = 'active', current_period_end = NOW() + INTERVAL '1 year';

-- STEP 3: Verify it worked (replace YOUR-USER-ID):
-- SELECT public.is_admin('YOUR-USER-ID') as is_admin, public.is_paid_user('YOUR-USER-ID') as is_paid;

-- Expected: Both should return TRUE
-- Then log out and log back in to test!
