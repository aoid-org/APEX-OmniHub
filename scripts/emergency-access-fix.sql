-- ============================================================================
-- EMERGENCY ACCESS FIX
-- ============================================================================
-- Use this ONLY if migrations haven't been applied and you need immediate access
-- RECOMMENDED: Apply migrations properly via `supabase db push` instead
-- ============================================================================

-- ============================================================================
-- STEP 1: Find your user ID
-- ============================================================================
SELECT
  id as your_user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'YOUR-EMAIL@example.com'; -- REPLACE WITH YOUR EMAIL

-- Copy the 'id' (UUID) from the result above, you'll need it below

-- ============================================================================
-- STEP 2: Grant admin role
-- ============================================================================
-- REPLACE 'YOUR-USER-UUID-HERE' with the UUID from Step 1

INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR-USER-UUID-HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it worked
SELECT * FROM public.user_roles WHERE user_id = 'YOUR-USER-UUID-HERE';

-- ============================================================================
-- STEP 3: Grant paid subscription
-- ============================================================================
-- REPLACE 'YOUR-USER-UUID-HERE' with the UUID from Step 1

INSERT INTO public.subscriptions (
  user_id,
  tier,
  status,
  current_period_start,
  current_period_end,
  trial_start,
  trial_end,
  canceled_at,
  cancel_at_period_end
)
VALUES (
  'YOUR-USER-UUID-HERE',
  'pro',              -- Options: 'starter', 'pro', 'enterprise'
  'active',           -- Status: 'active', 'trialing', 'canceled'
  NOW(),              -- Current period start
  NOW() + INTERVAL '1 year',  -- Current period end (1 year from now)
  NULL,               -- No trial
  NULL,
  NULL,               -- Not canceled
  false               -- Won't cancel at period end
)
ON CONFLICT (user_id) DO UPDATE
SET
  tier = 'pro',
  status = 'active',
  current_period_end = NOW() + INTERVAL '1 year',
  cancel_at_period_end = false;

-- Verify it worked
SELECT * FROM public.subscriptions WHERE user_id = 'YOUR-USER-UUID-HERE';

-- ============================================================================
-- STEP 4: Verify RLS functions work
-- ============================================================================
-- These should return TRUE for your user

-- Check admin status
SELECT public.is_admin('YOUR-USER-UUID-HERE') as is_admin_result;

-- Check paid status
SELECT public.is_paid_user('YOUR-USER-UUID-HERE') as is_paid_result;

-- ============================================================================
-- STEP 5: Test in browser
-- ============================================================================
-- After running the above:
-- 1. Log out of the app
-- 2. Log back in with your email
-- 3. You should now have:
--    - Admin access (bypasses mobile gate on desktop)
--    - Paid access (can access dashboard)
--    - OmniDash access (admin OR paid)
-- ============================================================================

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
-- Remove admin role
DELETE FROM public.user_roles
WHERE user_id = 'YOUR-USER-UUID-HERE' AND role = 'admin';

-- Remove subscription (set to free)
UPDATE public.subscriptions
SET tier = 'free', status = 'canceled'
WHERE user_id = 'YOUR-USER-UUID-HERE';
*/
