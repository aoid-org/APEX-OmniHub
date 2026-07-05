---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

> **Current-state note (2026-07-04):** Current repo scan shows 102 SQL migration files (98 forward + 4 rollback) and 34 Supabase function directories (33 + `_shared`). Live Supabase project health/RLS must be re-verified with owner credentials before production certification.


# SUPABASE_SETUP.md

# Supabase Configuration Guide for APEX-OmniHub

## Prerequisites

- Supabase project created at [supabase.com](https://supabase.com)
- Project URL and service-role key in `.env`

## Enable pg_cron Extension

1. Open your Supabase Dashboard
2. Navigate to **Database → Extensions**
3. Search for `pg_cron`
4. Click **Enable**

> **Note:** pg_cron is available on Pro plan and above.
> On free tier, the migration will skip gracefully via the `IF NOT EXISTS` guard.

## Apply Migrations

```bash
# From project root
supabase db push

# Verify the cron job was created
psql "$SUPABASE_DB_URL" -f scripts/verify_cron.sql
```

## Receipt Cleanup Job

The migration `20260226000000_pg_cron_receipts.sql` creates:

| Component     | Description                                              |
| ------------- | -------------------------------------------------------- |
| **Extension** | `pg_cron` — PostgreSQL job scheduler                     |
| **Index**     | `idx_receipts_cleanup` on `receipts(created_at, status)` |
| **Job**       | `clean-receipts` — runs daily at 03:00 UTC               |

### What it does

Deletes receipts older than 30 days with `status = 'processed'`.

### Rollback

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260226000001_rollback.sql
```

## Environment Variables

| Variable                    | Required | Description                         |
| --------------------------- | -------- | ----------------------------------- |
| `SUPABASE_URL`              | Yes      | Project API URL                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Service role key (server-side only) |
| `SUPABASE_DB_URL`           | Yes      | Direct PostgreSQL connection string |
| `VITE_SUPABASE_URL`         | Yes      | Browser Supabase project URL        |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_ANON_KEY` | Yes | Browser-safe Supabase publishable/anon key; values are never logged by the build guard |

CI/production builds fail closed if browser Supabase variables are missing. Local UI-only development may opt out with `APEX_ALLOW_MISSING_SUPABASE_CONFIG=true`; do not set that override in CI, Cloudflare Pages, or production.

---

## Security Posture (as of 2026-05-04)

The following security hardening has been applied to the production project (`rtopreovkywofgwgmozi`):

### RLS Coverage
All public-schema tables now have RLS enabled. Tables added to RLS coverage on 2026-05-04:
`media_assets`, `leagues`, `products`, `product_media`, `ingest_jobs`, `ingest_artifacts`,
`armageddon_runs`, `armageddon_events`, `ingest_parse_results`, `ingest_dead_letters`.

All these tables have a `service_role_all` policy that preserves full backend access.
No end-user (authenticated role) data is exposed without an explicit RLS policy.

### View Security
`user_provider_connections_safe` and `active_idempotency_receipts` are configured as
`SECURITY INVOKER` (not DEFINER). They rely on the underlying table's RLS policies,
which are properly scoped (`auth.uid()` isolation for `provider_connections`).

### Function Execute Permissions
- **Trigger functions** (8): EXECUTE revoked from PUBLIC. Invocable only by trigger machinery + service_role.
- **Maintenance functions** (4): EXECUTE revoked from PUBLIC. Invocable only by service_role (pg_cron, operator).
- **Business-logic functions** (20): anon EXECUTE revoked; authenticated + service_role access preserved.
- **search_path**: Pinned to `public` on all previously-mutable SECURITY DEFINER functions.

### admin_claim_secrets
Has RLS enabled with `service_role_all` policy. The admin claim flow uses the service_role key.

### Supabase Auth
> **ACTION REQUIRED (manual):** Enable "Leaked Password Protection" (HaveIBeenPwned.org check)
> in Supabase Dashboard → Authentication → Settings. This cannot be set via SQL migration.
