<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
# Admin Secret Setup (Post-Deploy)

After deploying migrations, you must configure the admin claim secret via the
Supabase service role. Admin access is determined **exclusively** by the
`public.user_roles` table (checked by `is_admin(auth.uid())` in RLS policies).

> **Never** rely on `VITE_OMNIDASH_ADMIN_EMAILS` for auth — it is a
> deprecated UI hint only.

## How it works

1. `claim_admin_access(secret)` verifies the secret against a bcrypt hash in
   `admin_claim_secrets`.
2. On success it **atomically** sets `app_metadata.admin = true` AND inserts
   a row into `public.user_roles (user_id, role='admin')`.
3. RLS policies call `is_admin(auth.uid())` which reads `user_roles` — the
   single source of truth.
4. The `sync_admin_metadata_to_user_roles` trigger keeps `user_roles` in sync
   if `app_metadata` is changed externally (belt-and-suspenders).

## Steps

### 1. Generate a bcrypt hash

Connect to your database (via Supabase SQL editor or psql with service role):

```sql
SELECT crypt('YOUR_CHOSEN_SECRET', gen_salt('bf'));
```

Copy the resulting hash (starts with `$2a$`).

### 2. Insert the secret hash

```sql
INSERT INTO public.admin_claim_secrets (secret_hash)
VALUES ('PASTE_HASH_HERE');
```

### 3. Claim admin as an authenticated user

From the app or via Supabase client:

```sql
SELECT public.claim_admin_access('YOUR_CHOSEN_SECRET');
-- Should return: true
```

This sets `app_metadata.admin = true` **and** inserts into `user_roles`.

### 4. Verify

```sql
-- Check user_roles
SELECT * FROM public.user_roles WHERE role = 'admin';

-- Check RLS function
SELECT public.is_admin('YOUR_USER_ID_HERE');
-- Should return: true
```

## Rotation

To rotate the secret:

```sql
UPDATE public.admin_claim_secrets
SET secret_hash = crypt('NEW_SECRET', gen_salt('bf')),
    rotated_at = now();
```

## Rollback

To revert to the previous behavior:

```sql
-- Remove the bcrypt table
DROP TABLE IF EXISTS public.admin_claim_secrets;
-- The claim_admin_access function will return false until reconfigured
```
