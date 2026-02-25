# OPS_RUNBOOKS.md — APEX-OmniHub Operations Runbooks

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
2. The `guardrail-alert.yml` workflow fires
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
