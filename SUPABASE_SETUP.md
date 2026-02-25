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
