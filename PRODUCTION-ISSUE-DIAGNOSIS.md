# Production Issue Diagnosis & Fix

## Issue Summary

All code changes have been successfully merged to `main`, but the application is not working:
- ❌ No admin status detected
- ❌ No access to dashboard (redirects to pricing/upgrade)
- ❌ Landing page tiles are non-functional
- ❌ Users blocked by mobile gate on desktop

## Root Cause

**The Supabase database migrations have NOT been applied to production.**

The code in the repository is correct and fully functional, but the database schema is out of sync with the application code.

## What Was Implemented

### PATCH 1: Admin Role Unification (`92e7b8d`, `581c368`)
- **Migration**: `supabase/migrations/20260205000000_unify_admin_system.sql`
- **Creates**:
  - `user_roles` table with admin entries
  - `sync_admin_metadata_to_user_roles()` trigger function
  - Updated `claim_admin_access()` function
  - `is_admin(user_id)` RLS helper function
- **Client Changes**:
  - `src/omnidash/hooks.tsx`: 3-tier admin check (allowlist → user_roles → app_metadata)
  - `src/hooks/useCapabilities.ts`: Queries `user_roles` table for admin detection

### PATCH 2: Paid Access Integration (`b1badf4`, `f11749c`)
- **Migration**: `supabase/migrations/20260205000001_omnidash_paid_access.sql`
- **Updates**: All OmniDash RLS policies from `is_admin()` to `(is_admin() OR is_paid_user())`
- **Client Changes**:
  - `src/pages/OmniDash/OmniDashLayout.tsx`: Checks both admin AND paid access
  - `src/components/PaidAccessRoute.tsx`: Blocks routes for non-paid users

### PATCH 3: Intelligent Post-Login Routing (`5e45f71`, `3825aa8`)
- **Files**:
  - `src/utils/postLoginRouter.ts`: Route access validation
  - `src/hooks/useLoginRedirect.ts`: Post-login redirect hook
  - `src/pages/Auth.tsx`: Uses `useLoginRedirect()` instead of hardcoded `/dashboard`
  - `src/components/ProtectedRoute.tsx`: Preserves deep-link URLs
- **Behavior**: Admin → `/omnidash`, Paid → `/dashboard`, Free → `/pricing`

### PATCH 5: Apple-Grade Visual Design (`8f04662`, `c8de369`)
- **Files**:
  - `src/omnidash/types.ts`: Lucide-react icons instead of letters
  - `src/components/OmniDashNavIconButton.tsx`: Complete redesign
  - `src/omnidash/useOmniDashKeyboardShortcuts.ts`: Keyboard navigation
  - `src/pages/OmniDash/OmniDashLayout.tsx`: Theme toggle integration

## Architecture Flow

```
User Login
    ↓
useLoginRedirect() hook
    ↓
Query user_roles table → isAdmin?
Query subscriptions table → isPaid?
    ↓
Route Decision:
  - Admin → /omnidash
  - Paid (non-admin) → /dashboard
  - Free → /pricing
    ↓
Protected Routes:
  - PaidAccessRoute: Checks subscriptions table
  - MobileOnlyGate: Checks user_roles for admin bypass
    ↓
Dashboard/OmniDash renders
```

## Why It's Broken

The application code expects these database objects to exist:

1. **`user_roles` table** with structure:
   ```sql
   CREATE TABLE public.user_roles (
     user_id UUID REFERENCES auth.users(id),
     role TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     PRIMARY KEY (user_id, role)
   );
   ```

2. **`subscriptions` table** (from earlier migration `20260107000000`):
   ```sql
   CREATE TABLE public.subscriptions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) UNIQUE,
     tier TEXT,  -- 'free', 'starter', 'pro', 'enterprise'
     status TEXT, -- 'active', 'trialing', 'canceled', etc.
     current_period_end TIMESTAMPTZ,
     ...
   );
   ```

3. **RLS helper functions**:
   - `public.is_admin(user_id UUID) RETURNS BOOLEAN`
   - `public.is_paid_user(user_id UUID) RETURNS BOOLEAN`

4. **OmniDash tables** with updated RLS policies:
   - `omnidash_settings`
   - `omnidash_today_items`
   - `omnidash_pipeline_items`
   - `omnidash_kpi_daily`
   - `omnidash_incidents`

**If these don't exist, the application will fail silently:**
- `useCapabilities()` queries `user_roles` → no rows → `isAdmin=false`
- `usePaidAccess()` queries `subscriptions` → no rows → `isPaid=false`
- `PaidAccessRoute` sees `isPaid=false` → blocks access → shows upgrade prompt
- `MobileOnlyGate` sees `isAdmin=false` on desktop → blocks access → shows mobile-only message

## How to Fix

### Option 1: Apply Migrations (RECOMMENDED)

```bash
# Connect to your Supabase project
cd /home/user/APEX-OmniHub
supabase link --project-ref YOUR-PROJECT-REF

# Apply all migrations
supabase db push

# Verify migrations were applied
supabase db inspect
```

### Option 2: Run Diagnostic Script

1. Go to your Supabase Dashboard → SQL Editor
2. Open the file: `scripts/diagnose-production-issue.sql`
3. Copy and paste the entire script
4. Click "Run"
5. Review the results to see what's missing

### Option 3: Emergency Manual Fix

**⚠️ Use only if migrations can't be applied immediately**

1. Go to your Supabase Dashboard → SQL Editor
2. Open the file: `scripts/emergency-access-fix.sql`
3. Replace `YOUR-EMAIL@example.com` with your actual email
4. Replace `YOUR-USER-UUID-HERE` with your user ID (get from Step 1 in script)
5. Run each section sequentially
6. Log out and log back in

This will manually:
- Grant you admin role in `user_roles` table
- Grant you a paid subscription in `subscriptions` table
- Allow you to bypass mobile gate and access dashboard

## Verification Checklist

After fixing, verify these conditions:

- [ ] Run diagnostic script - all checks pass
- [ ] `user_roles` table has at least 1 admin entry
- [ ] `subscriptions` table has entries for users
- [ ] `is_admin(auth.uid())` returns `true` for admin users
- [ ] `is_paid_user(auth.uid())` returns `true` for paid users
- [ ] Desktop admin users can access `/dashboard` without mobile gate
- [ ] Paid users can access `/dashboard` on mobile/tablet
- [ ] Landing page app tiles navigate correctly
- [ ] OmniDash at `/omnidash` loads for admin/paid users

## Testing After Fix

1. **Test as Admin User**:
   ```
   - Log in with admin email
   - Should redirect to /omnidash
   - Desktop access should work (bypasses mobile gate)
   - All OmniDash nav items should work
   ```

2. **Test as Paid Non-Admin User**:
   ```
   - Log in with paid user (non-admin)
   - Should redirect to /dashboard
   - Mobile/tablet access should work
   - Desktop should see mobile-only gate (unless admin)
   ```

3. **Test as Free User**:
   ```
   - Log in with free user
   - Should redirect to /pricing
   - Dashboard route should show upgrade prompt
   ```

4. **Test Landing Page**:
   ```
   - Visit / (landing page)
   - Click "APEX" app tile
   - Should navigate to appropriate route based on auth status
   ```

## Files to Reference

- **Migrations**: `supabase/migrations/20260205*.sql`
- **Diagnostic Script**: `scripts/diagnose-production-issue.sql`
- **Emergency Fix**: `scripts/emergency-access-fix.sql`
- **Hooks**:
  - `src/hooks/usePaidAccess.ts`
  - `src/hooks/useCapabilities.ts`
  - `src/omnidash/hooks.tsx`
- **Route Guards**:
  - `src/components/PaidAccessRoute.tsx`
  - `src/components/MobileOnlyGate.tsx`
- **Routing**:
  - `src/utils/postLoginRouter.ts`
  - `src/hooks/useLoginRedirect.ts`

## Contact & Support

If migrations still fail after following these steps, the issue may be:
1. Supabase project not linked correctly
2. Migration permissions issue
3. Conflicting schema changes from other agents/branches

In that case, you'll need to manually apply the migration SQL files in Supabase Dashboard.
