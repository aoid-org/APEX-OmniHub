# Apply Migrations Manually - Step by Step Guide

## Why Manual Application?

Due to the complexity of programmatically executing multi-statement SQL migrations via the Supabase API, the most reliable approach is to apply them directly in the Supabase Dashboard SQL Editor.

## Prerequisites

- Access to Supabase Dashboard: https://supabase.com/dashboard
- Your project: `rtopreovkywofgwgmozi`
- Direct URL: https://supabase.com/dashboard/project/rtopreovkywofgwgmozi/editor

## Step-by-Step Instructions

### Migration 1: Admin Role Unification

1. **Open Supabase Dashboard SQL Editor**
   - Go to: https://supabase.com/dashboard/project/rtopreovkywofgwgmozi/sql
   - Click "New Query"

2. **Copy Migration 1 SQL**
   - Location: `supabase/migrations/20260205000000_unify_admin_system.sql`
   - Open the file in your code editor
   - Select ALL contents (⌘A / Ctrl+A)
   - Copy (⌘C / Ctrl+C)

3. **Paste and Execute**
   - Paste the SQL into the SQL Editor
   - Click "Run" button (or press ⌘Enter / Ctrl+Enter)
   - Wait for execution to complete

4. **Verify Success**
   - Look for "Success" message
   - Check for any error messages
   - If errors appear, screenshot them and we'll debug

### Migration 2: Paid Access Integration

1. **Open New Query**
   - Stay in SQL Editor
   - Click "New Query" again

2. **Copy Migration 2 SQL**
   - Location: `supabase/migrations/20260205000001_omnidash_paid_access.sql`
   - Select ALL contents
   - Copy

3. **Paste and Execute**
   - Paste into the SQL Editor
   - Click "Run"
   - Wait for completion

4. **Verify Success**
   - Look for "Success" message
   - Check for any errors

### Verification: Run Diagnostic Queries

1. **Open New Query**
   - Click "New Query" in SQL Editor

2. **Copy Diagnostic SQL**
   - Location: `scripts/diagnose-production-issue.sql`
   - Select ALL contents
   - Copy

3. **Paste and Execute**
   - Paste into SQL Editor
   - Click "Run"
   - Review the results

4. **Expected Results:**
   - ✅ Migrations 20260205000000 and 20260205000001 appear in `schema_migrations`
   - ✅ `user_roles` table exists
   - ✅ `subscriptions` table exists
   - ✅ `is_admin()` function exists and returns boolean
   - ✅ `is_paid_user()` function exists and returns boolean
   - ✅ All OmniDash tables have updated RLS policies

### Grant Yourself Access

After migrations are applied, you need to grant yourself admin + paid access:

1. **Get Your User ID**
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```
   Copy the `id` (UUID) from the result

2. **Grant Admin Role**
   ```sql
   -- Replace YOUR-USER-UUID with the UUID from step 1
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('YOUR-USER-UUID', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

3. **Grant Paid Subscription**
   ```sql
   -- Replace YOUR-USER-UUID with the UUID from step 1
   INSERT INTO public.subscriptions (
     user_id,
     tier,
     status,
     current_period_start,
     current_period_end
   )
   VALUES (
     'YOUR-USER-UUID',
     'pro',
     'active',
     NOW(),
     NOW() + INTERVAL '1 year'
   )
   ON CONFLICT (user_id) DO UPDATE
   SET
     tier = 'pro',
     status = 'active',
     current_period_end = NOW() + INTERVAL '1 year';
   ```

4. **Verify Access**
   ```sql
   -- Replace YOUR-USER-UUID with your UUID
   SELECT
     public.is_admin('YOUR-USER-UUID') as is_admin,
     public.is_paid_user('YOUR-USER-UUID') as is_paid;
   ```
   Expected result: Both should return `true`

## Test the Application

1. **Log out** of the application (if logged in)
2. **Clear browser cache** (optional but recommended)
3. **Log back in** with your admin email
4. **Expected behavior:**
   - You should be redirected to `/omnidash` (admin users)
   - Dashboard should be accessible at `/dashboard`
   - Desktop access should work (no mobile-only gate)
   - Landing page tiles should navigate correctly
   - All OmniDash features should work

## Troubleshooting

### Error: "relation user_roles does not exist"
**Solution:** The `user_roles` table wasn't created by an earlier migration. Check if migration `20260127000000_seed_admin_role.sql` was applied.

### Error: "function is_admin does not exist"
**Solution:** Check if migration `20260107000000_create_paid_access_system.sql` was applied, which should create the `is_admin()` function.

### Error: "function is_paid_user does not exist"
**Solution:** Check if migration `20260107000000_create_paid_access_system.sql` was applied.

### Migrations succeed but still no access
1. Run diagnostic queries to verify your user has admin role and subscription
2. Check browser console for errors
3. Try logging out and back in
4. Clear browser cache and cookies

### Need to rollback migrations
See the "ROLLBACK" section at the bottom of each migration file for reversal steps.

## Quick Reference

**Migration Files:**
- `supabase/migrations/20260205000000_unify_admin_system.sql`
- `supabase/migrations/20260205000001_omnidash_paid_access.sql`

**Diagnostic Script:**
- `scripts/diagnose-production-issue.sql`

**Emergency Access Fix:**
- `scripts/emergency-access-fix.sql`

**Full Documentation:**
- `PRODUCTION-ISSUE-DIAGNOSIS.md`

## Success Criteria

✅ Both migrations execute without errors
✅ Diagnostic queries show all expected tables/functions exist
✅ Your user has admin role in `user_roles` table
✅ Your user has paid subscription in `subscriptions` table
✅ `is_admin(your_user_id)` returns `true`
✅ `is_paid_user(your_user_id)` returns `true`
✅ You can access `/dashboard` without errors
✅ You can access `/omnidash` without errors
✅ Landing page tiles navigate correctly

---

**Need Help?** If you encounter any errors during migration, copy the error message and we'll debug together.
