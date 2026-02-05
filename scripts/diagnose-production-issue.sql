-- ============================================================================
-- PRODUCTION DIAGNOSTIC SCRIPT
-- ============================================================================
-- Run this in your Supabase SQL Editor to diagnose access issues
-- Reports: migration status, admin roles, subscriptions, RLS policies
-- ============================================================================

-- Check current user
SELECT
  'Current User' as check_name,
  auth.uid() as your_user_id,
  auth.email() as your_email;

-- ============================================================================
-- CHECK 1: Are critical migrations applied?
-- ============================================================================
SELECT
  'Migration Status' as check_name,
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE version >= '20260205'
ORDER BY version;

-- Expected: Should see 20260205000000 and 20260205000001

-- ============================================================================
-- CHECK 2: Does user_roles table exist and have data?
-- ============================================================================
SELECT
  'user_roles Table' as check_name,
  COUNT(*) as total_roles,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_count
FROM public.user_roles;

-- Expected: At least 1 admin role

-- Show all admin users
SELECT
  'Admin Users' as check_name,
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';

-- ============================================================================
-- CHECK 3: Does subscriptions table exist and have data?
-- ============================================================================
SELECT
  'subscriptions Table' as check_name,
  COUNT(*) as total_subscriptions,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE tier != 'free') as paid_count
FROM public.subscriptions;

-- Expected: At least some subscription entries

-- Show current user's subscription
SELECT
  'Your Subscription' as check_name,
  tier,
  status,
  current_period_start,
  current_period_end
FROM public.subscriptions
WHERE user_id = auth.uid();

-- ============================================================================
-- CHECK 4: Do RLS helper functions exist?
-- ============================================================================
SELECT
  'is_admin() Function' as check_name,
  public.is_admin(auth.uid()) as result;

SELECT
  'is_paid_user() Function' as check_name,
  public.is_paid_user(auth.uid()) as result;

-- ============================================================================
-- CHECK 5: Critical tables existence
-- ============================================================================
SELECT
  'Table Existence' as check_name,
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN ('user_roles', 'subscriptions', 'omnidash_settings', 'omnidash_today_items')
AND schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- CHECK 6: RLS policies on critical tables
-- ============================================================================
SELECT
  'RLS Policies' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('user_roles', 'subscriptions', 'omnidash_settings')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUMMARY: What should you see?
-- ============================================================================
-- ✓ Migration 20260205000000 and 20260205000001 in schema_migrations
-- ✓ user_roles table with at least 1 admin
-- ✓ subscriptions table with entries
-- ✓ is_admin() returns true for admin users
-- ✓ is_paid_user() returns true for paid users
-- ✓ All critical tables exist (user_roles, subscriptions, omnidash_*)
-- ✓ RLS policies reference is_admin() OR is_paid_user()

-- ============================================================================
-- EMERGENCY FIX: If migrations aren't applied, manually grant access
-- ============================================================================
-- UNCOMMENT AND RUN THESE ONLY IF MIGRATIONS ARE MISSING:

/*
-- Grant yourself admin role (replace YOUR-EMAIL with your actual email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'YOUR-EMAIL@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Grant yourself paid subscription
INSERT INTO public.subscriptions (
  user_id,
  tier,
  status,
  current_period_start,
  current_period_end
)
SELECT
  id,
  'pro',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year'
FROM auth.users
WHERE email = 'YOUR-EMAIL@example.com'
ON CONFLICT (user_id) DO UPDATE
SET
  tier = 'pro',
  status = 'active',
  current_period_end = NOW() + INTERVAL '1 year';
*/
