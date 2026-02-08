# Admin Secret Setup (Post-Deploy)

After deploying the `20260208000000_secure_admin_bcrypt.sql` migration,
you must configure the admin claim secret via the Supabase service role.

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

### 3. Verify

As an authenticated user, call:

```sql
SELECT public.claim_admin_access('YOUR_CHOSEN_SECRET');
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
