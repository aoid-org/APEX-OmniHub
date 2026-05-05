# OPS_RUNBOOKS.md — APEX-OmniHub Operations Runbooks

> **Status:** Current operations index (canonical).
>
> Related canonical docs:
> - `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`
> - `docs/infrastructure/CI_RUNTIME_GATES.md`
> - `docs/infrastructure/PRODUCTION_DEPLOYMENT_GUIDE.md`
> - `docs/ops/INCIDENT_RESPONSE.md`

## Table of Contents

1. [Idempotency Monitoring](#idempotency-monitoring)
2. [Receipt Cleanup (pg_cron)](#receipt-cleanup-pg_cron)
3. [CI Guardrail Alerts](#ci-guardrail-alerts)

---

## Idempotency Monitoring

### Overview

Prometheus counters track semantic-cache hit/miss rates for the orchestrator's
idempotency layer. A sustained hit rate below 95% over 5 minutes triggers a
Grafana alert.

### Metrics

| Metric                     | Type    | Labels          | Description       |
| -------------------------- | ------- | --------------- | ----------------- |
| `idempotency_hits_total`   | Counter | `workflow_type` | Cache/replay hits |
| `idempotency_misses_total` | Counter | `workflow_type` | Cache misses      |

### Endpoints

- **`GET /metrics`** — Prometheus scrape endpoint (ASGI, mounted on FastAPI)

### Runbook: Hit Rate Alert < 95%

1. Check Grafana dashboard: `APEX Idempotency Monitoring` (uid: `apex-idempotency`)
2. Verify Redis health: `redis-cli ping`
3. Check orchestrator logs: `docker compose logs orchestrator --tail 100`
4. Verify semantic cache: `python main.py test`
5. If Redis is down → restart: `docker compose restart redis`
6. If cache is corrupted → flush and warm: `redis-cli FLUSHDB`

### Deployment

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Receipt Cleanup (pg_cron)

### Overview

A nightly pg_cron job (`clean-receipts`) deletes processed receipts older than
30 days from the `receipts` table.

### Schedule

`0 3 * * *` — Every day at 03:00 UTC

### Verification

```bash
psql "$SUPABASE_DB_URL" -f scripts/verify_cron.sql
```

### Runbook: Job Not Running

1. Verify pg_cron extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```
2. Check job registration:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'clean-receipts';
   ```
3. Check recent run history:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobname = 'clean-receipts'
   ORDER BY start_time DESC LIMIT 5;
   ```
4. Re-apply migration if missing:
   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/migrations/20260226000000_pg_cron_receipts.sql
   ```

### Rollback

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260226000001_rollback.sql
```

---

## CI Guardrail Alerts

### Overview

The CI Runtime Gates workflow includes a "Guardrail Scan" step (Phase 5.5) that
greps CI logs for `GUARD_RAIL_VIOLATION` or `policy.*breach` patterns. On
detection:

1. CI fails with exit code 1
2. The `alert-guard-rail-violation.yml` workflow fires
3. Slack notification sent to `#platform-alerts`
4. GitHub Issue created with `guard-rail-violation` label

### Runbook: Guardrail Violation Detected

1. Open the GitHub Issue (label: `guard-rail-violation`)
2. Click "View Run" to see the failing CI job
3. Inspect the Guardrail Scan step output for the specific log file/line
4. Fix the violation in the source code
5. Push fix → verify CI passes → close the issue

### False Positives

If the violation pattern appears in legitimate code (e.g., documentation):

- Add the file path to `security/.gitleaks.toml` allowlist
- The CI grep only scans `logs/` directory, not source files

### Required Secrets

| Secret            | Purpose                        |
| ----------------- | ------------------------------ |
| `SLACK_BOT_TOKEN` | Slack notifications            |
| `GITHUB_TOKEN`    | Issue creation (auto-provided) |


## Legacy deep-dive archives

- `docs/archive/legacy-runbooks/OPS_RUNBOOK_legacy_2026-01-25.md`
- `docs/archive/legacy-runbooks/PRODUCTION_DEPLOYMENT_GUIDE_legacy.md`
- `docs/archive/legacy-runbooks/CI_RUNTIME_GATES_legacy.md`
- `docs/archive/legacy-runbooks/MIGRATION_RUNBOOK_legacy.md`

---

## Supabase Security Posture Gates (Added 2026-05-04)

**Version:** 1.0 | **Date:** 2026-05-04 | **Branch:** `claude/apex-omnihub-supabase-fixes-RnSc6`

### What Changed in Production

Four migrations applied to `rtopreovkywofgwgmozi` — see `docs/audits/SUPABASE_SECURITY_AUDIT_2026_05_04.md` for full detail.

| Migration | Timestamp | Change |
|---|---|---|
| `omnibridge_events` | 20260417000000 | OmniBridge v1.6.0 tables live in production |
| `fix_security_advisor_findings` | 20260426000000 | RLS on 10 tables; 2 views set security_invoker |
| `security_hardening_functions_rls` | 20260504000000 | Function execute permissions hardened |
| `fk_indexes_performance` | 20260504000001 | 14 FK covering indexes |
| `fix_omnibridge_view_security_invoker` | 20260504000002 | Fixed omnibridge_event_stats_hourly view |

### Function Execute Permission Model (Current State)

| Category | anon | authenticated | service_role |
|---|---|---|---|
| Trigger functions (8) | ✗ | ✗ | ✓ |
| Maintenance functions (4) | ✗ | ✗ | ✓ |
| Business-logic SECURITY DEFINER functions (20) | ✗ | ✓ | ✓ |

**Trigger functions (no RPC):** `audit_emergency_controls_changes`, `emergency_controls_singleton_id`, `handle_new_user`, `handle_new_user_subscription`, `handle_updated_at`, `subscription_active_status`, `update_man_notifications_updated_at`, `update_updated_at_column`

**Maintenance (service_role only):** `cleanup_expired_nonces`, `cleanup_old_audit_logs`, `cleanup_old_dlq_entries`, `sync_admin_metadata_to_user_roles`

### Security Baseline for New Code

Any new SECURITY DEFINER function **MUST**:
1. Set `search_path = public` (or `''` with fully-qualified names)
2. Have EXECUTE revoked from PUBLIC
3. Explicitly GRANT EXECUTE to the minimum required roles only

Any new public-schema table **MUST** have `ENABLE ROW LEVEL SECURITY` with at minimum a `service_role_all` policy.

### Manual Action Required (Operator)

> Enable "Leaked Password Protection" in Supabase Dashboard → Authentication → Settings.
> This cannot be set via SQL migration and was flagged by the Security Advisor.

### Rollback Reference

```sql
-- Re-grant execute to a role if needed:
GRANT EXECUTE ON FUNCTION public.<func_name>(<args>) TO <role>;

-- Disable RLS on a table (use with caution, test in staging first):
ALTER TABLE public.<table_name> DISABLE ROW LEVEL SECURITY;

-- Drop a FK index:
DROP INDEX IF EXISTS public.idx_<table>_<column>;
```
