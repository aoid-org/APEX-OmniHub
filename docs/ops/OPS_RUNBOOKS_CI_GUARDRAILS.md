# OPS_RUNBOOKS.md — APEX-OmniHub Operations Runbooks

> **Status:** Current operations index (canonical). Last updated: 2026-05-20.
>
> Related canonical docs:
> - `CLAUDE.md` — agent briefing and verified commands (read first)
> - `docs/architecture/CANONICAL_TRUTH.md` — conflict-resolution authority
> - `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`
> - `docs/infrastructure/CI_RUNTIME_GATES.md`
> - `docs/infrastructure/PRODUCTION_DEPLOYMENT_GUIDE.md`
> - `docs/ops/INCIDENT_RESPONSE.md`

## Table of Contents

1. [Idempotency Monitoring](#idempotency-monitoring)
2. [Receipt Cleanup (pg_cron)](#receipt-cleanup-pg_cron)
3. [CI Guardrail Alerts](#ci-guardrail-alerts)
4. [npm Lockfile Gate (ENOLOCK)](#npm-lockfile-gate-enolock)
5. [TypeScript Config Invariants](#typescript-config-invariants)
6. [OmniBridge Outbound Dispatch Ops](#omnibridge-outbound-dispatch-ops)
7. [OmniDash Sidebar Widget Rail Drift](#omnidash-sidebar-widget-rail-drift)

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

### Architectural Boundary Disambiguation (updated 2026-05-20)

The repository contains three Python runtime areas that must not be confused:

| Path | Runtime | Role |
|---|---|---|
| `orchestrator/` | Python / Temporal | Temporal Worker lifecycle (`main.py`) + HTTP workflow dispatch (`server.py`) |
| `services/orchestrator/` | Python / FastAPI | HTTP API layer (`api/routes.py`) + deterministic FSM (`fsm.py`). Must NOT initialize Temporal Workers. |
| `omega/` | Python / stdlib | APEX Resilience Protocol — Human-in-the-loop verification engine (`engine.py`) and HTTP approval dashboard (`dashboard.py`). Runs independently; not a Temporal service. XSS-defended via markupsafe. Covered by pytest `--cov=../omega`. |

The architectural boundary enforcement gate (Phase A in `ci-runtime-gates.yml`) monitors all three of the following files for cross-boundary import violations:

- `orchestrator/main.py` — Temporal Worker entrypoint
- `services/orchestrator/api/routes.py` — HTTP API routes (must not import Temporal Worker code)
- `orchestrator/metrics.py` — Metrics module (must not be imported in business logic paths)

If a guardrail violation fires for any of these files, fix the import boundary before any other work. Do not move code between `orchestrator/`, `services/orchestrator/`, and `omega/` without updating the canonical architecture map.

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


## CI Pitfalls Quick Reference

| Symptom | Root Cause | Fix |
|---|---|---|
| `ENOLOCK` in `npm audit` | `package-lock.json` not committed | Restore: `git add package-lock.json` |
| `TS5103: Invalid value for --ignoreDeprecations` | Value set to `"6.0"` | Change to `"5.0"` in both tsconfig files |
| `SyntaxError: Expected double-quoted property name` in Gate 6 | `//` comment in `tsconfig.json` | Remove all comments from `tsconfig.json` |
| React context undefined / `createContext` error | Multiple React instances | Run `bun run check:react`; check `dedupe` in vite/vitest config |
| `security-gates` failing in < 30s | TruffleHog or npm audit failing early | Check TruffleHog output; verify `package-lock.json` exists |
| Coverage race condition (ENOENT) | Coverage enabled by default | Enable only via `VITEST_COVERAGE=true` or `bun run test:coverage` |
| Secret scan flags test HMAC fixture values | Test HMAC key assignments without `test-` prefix | Prefix fixture keys with `test-` or `mock-` (e.g., `test-hmac-key-abc`) |

---

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

---

## npm Lockfile Gate (ENOLOCK)

### Overview

Both `Security Gates` (`production-readiness.yml`) and `Dependency Security Audit`
(`security-regression-guard.yml`) call `npm audit --omit=dev --audit-level=high`.
This command requires `package-lock.json` to be present in the repository checkout.

### Symptom

CI fails with:
```
npm error code ENOLOCK
npm error audit This command requires an existing lockfile.
npm error audit Try creating one first with: npm i --package-lock-only
```

### Root Cause

`package-lock.json` was deleted from git or added to `.gitignore`.

### Resolution

```bash
# 1. Check if file is tracked
git ls-files package-lock.json

# 2. If missing from tracking, restore from main
git show origin/main:package-lock.json > package-lock.json

# 3. If gitignored, remove the gitignore entry and re-add
#    (search .gitignore for 'package-lock.json' and remove that line)

# 4. Re-add to git
git add package-lock.json
git commit -m "fix(ci): restore package-lock.json — npm audit requires lockfile"
```

### Prevention

Both lockfiles must remain committed:

| File | Purpose |
|---|---|
| `bun.lock` | Authoritative install lockfile (bun) |
| `package-lock.json` | Required for `npm audit` in CI |

Never gitignore `package-lock.json`. Never delete it in "hardening" passes.

### Current Audit Status

`npm audit --omit=dev --audit-level=high` exits **0** (clean for production deps).
Known moderate-only vulnerabilities: `postcss <8.5.10`, `uuid 11.0.0–11.1.0`.
These do not affect the production bundle severity threshold.

---

## TypeScript Config Invariants

---

## OmniBridge Outbound Dispatch Ops

**Added:** 2026-05-11 | **Scope:** APEX-OmniHub v1.6.1+ | **Related:** `docs/integration/sbbl-omnihub-validation-2026-05-11.md`

OmniBridge is the bidirectional HMAC-signed sync layer between APEX-OmniHub (control plane) and
SBBL-HQ (managed tenant). This section covers day-to-day operations for the outbound dispatch path.

---

### Verify Outbound Commands Are Reaching SBBL-HQ

Two independent signals confirm delivery:

**1. `omnibridge_events` table (OmniHub side)**

```sql
-- Check recent outbound events for a tenant
SELECT id, tenant_id, event_type, status, created_at, attempts
FROM omnibridge_events
WHERE tenant_id = 'sbbl-hq'
  AND direction = 'outbound'
ORDER BY created_at DESC
LIMIT 20;
```

Healthy: `status = 'delivered'`. Stuck: `status = 'pending'` with `attempts >= 3`.

**2. `/sync/drain` worker logs (SBBL-HQ side)**

```bash
# Stream live logs from the SBBL-HQ Cloudflare Worker
wrangler tail --env production --filter /sync/drain

# Look for:
#   INFO  [drain] delivered packet <packet_id> → 200 OK (<latency>ms)
#   WARN  [drain] attempt 2/4 failed (503) — retrying in 1000ms
#   ERROR [drain] packet <packet_id> failed after 4 attempts — marked stuck
```

If SBBL-HQ logs show no activity but `omnibridge_events` shows pending records,
check `OMNIHUB_SYNC_URL` env var in the SBBL-HQ Worker (see "Sync Drain Failure" in
`docs/ops/INCIDENT_RESPONSE.md`).

---

### Revoke a Tenant

To immediately stop all outbound dispatch to a tenant without deleting its records:

```sql
-- Set tenant status to inactive in the source registry
UPDATE omnibridge_source_registry
SET status = 'inactive', updated_at = NOW()
WHERE source_id = 'sbbl-hq';
```

The `omnibridge-control` edge function checks `status` on every dispatch attempt.
Inactive tenants receive an immediate `403 Tenant Revoked` response; no HMAC signing
or network call is made. Re-activate by setting `status = 'active'`.

**Note:** Revoking does not flush in-flight packets already in `omnibridge_outbox`.
Run the following to drain the stuck queue cleanly after revoking:

```sql
UPDATE omnibridge_outbox
SET status = 'cancelled', updated_at = NOW()
WHERE tenant_id = 'sbbl-hq' AND status = 'pending';
```

---

### Rotate `OMNIHUB_SIGNING_SECRET`

> Both sides must rotate simultaneously. A rolling window is NOT supported — any
> packet signed with the old secret and received after the new secret is live will
> fail HMAC verification.

**Rotation procedure (zero-downtime window = ~5 minutes):**

1. **Generate new secret** (min 256-bit entropy):
   ```bash
   openssl rand -base64 48
   ```

2. **Provision on OmniHub side** — update the Supabase Vault secret:
   ```bash
   supabase secrets set OMNIHUB_SIGNING_SECRET=<new-value> --project-ref rtopreovkywofgwgmozi
   ```
   Wait for the edge function to pick up the new secret (< 30s).

3. **Provision on SBBL-HQ side** — update the Cloudflare Worker secret:
   ```bash
   wrangler secret put OMNIHUB_SIGNING_SECRET --env production
   # (paste the same new-value when prompted)
   ```
   Wait for the Worker deployment to propagate (< 60s).

4. **Verify** — trigger a test PING command from the OmniHub control plane and confirm
   it appears as `delivered` in `omnibridge_events` within 10 seconds.

5. **Rotate `OMNIHUB_VERIFY_KEY` separately** if SBBL-HQ uses an independent inbound
   verify key (production recommended). Follow the same steps, updating only the
   verify-key secret rather than the signing secret.

---

### RED-Lane Command Approval Workflow (MAN-Quorum)

Any command classified as RED lane (high-risk intents: `revoke_access`, `grant_access`,
`emergency_halt`, `force_man_review`, `hotfix_dispatch`) requires explicit MAN-quorum
approval before the `outboundCaller.ts` will dispatch it.

**Approval flow:**

1. Operator submits command via OmniDash → `omnibridge-control` edge function classifies
   it as RED and sets `requires_man_approval = true`.
2. Record is written to `omnibridge_events` with `status = 'pending_approval'`.
3. All online MANs receive a Slack notification in `#man-approvals` (via `alert-man-approval.yml`).
4. A quorum of ≥ 2 MANs must approve via the OmniDash approval UI within 15 minutes, or
   the command expires (`status = 'expired'`).
5. On quorum achieved, `outboundCaller.ts` is invoked automatically; delivery status is
   updated to `delivered` or `failed` in `omnibridge_events`.

**Manual override (emergency, requires CTO sign-off):**

```sql
-- Directly approve a stuck RED-lane command (log your name in the reason field)
UPDATE omnibridge_events
SET status = 'approved', man_override_reason = 'CTO emergency override — <name> <timestamp>'
WHERE id = '<event-uuid>' AND status = 'pending_approval';
```

This action is hash-chained into `omnibridge_control_audit` automatically via trigger.

---

### Emergency: Halt All Outbound Dispatch

To immediately stop ALL outbound dispatch to ALL tenants (e.g., suspected key compromise):

**Option A — Disable `outboundCaller` in the edge function (fastest, < 30s)**

In `supabase/functions/omnibridge-control/index.ts`, set the kill-switch env var:

```bash
supabase secrets set OMNIBRIDGE_OUTBOUND_ENABLED=false --project-ref rtopreovkywofgwgmozi
```

The `outboundCaller.ts` reads this flag at invocation time. All new dispatch attempts
will return `{ status: 'halted' }` without making network calls. Existing in-flight
HTTP requests are not cancelled.

**Option B — Revoke all tenant statuses (durable, survives env var reset)**

```sql
UPDATE omnibridge_source_registry
SET status = 'inactive', updated_at = NOW()
WHERE status = 'active';
```

**Restore normal operation:**

```bash
supabase secrets set OMNIBRIDGE_OUTBOUND_ENABLED=true --project-ref rtopreovkywofgwgmozi
```

Then re-activate individual tenants as confirmed-clean:

```sql
UPDATE omnibridge_source_registry
SET status = 'active', updated_at = NOW()
WHERE source_id = 'sbbl-hq';
```

---

### `ignoreDeprecations` Must Be `"5.0"`

**Symptom:** CI fails with `error TS5103: Invalid value for '--ignoreDeprecations'`

**Root cause:** The value was changed to `"6.0"`. TypeScript 5.x (current: 5.9.3) only
accepts `"5.0"` as a valid `ignoreDeprecations` value. TypeScript 6.0 does not exist.

**Fix:**
```bash
# In both tsconfig.json and tsconfig.app.json, set:
"ignoreDeprecations": "5.0"
```

Affects files: `tsconfig.json` and `tsconfig.app.json`.

### `tsconfig.json` Must Be Pure JSON

**Symptom:** Gate 6 in `tests/quality/platform-quality-gates.test.ts` fails with
`SyntaxError: Expected double-quoted property name in JSON at position ...`

**Root cause:** `//` or `/* */` comments were added to `tsconfig.json`.
`JSON.parse()` does not accept comments (tsconfig uses JSONC format, but the test
uses the standard library `JSON.parse`).

**Fix:** Remove all comment lines from `tsconfig.json`. If documentation is needed,
add it to `CLAUDE.md` or `docs/architecture/CANONICAL_TRUTH.md` instead.

```json
// ❌ BREAKS CI — JSON.parse rejects comments
{
  "compilerOptions": {
    // This is a JSONC comment — not valid JSON
    "strict": true
  }
}

// ✅ CORRECT — pure JSON
{
  "compilerOptions": {
    "strict": true
  }
}
```


---

## OmniDash Sidebar Widget Rail Drift

**Version:** 1.0 | **Date:** 2026-05-12 | **Scope:** OmniDash left sidebar only

### Canonical Contract

- Source of truth: `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`
- Renderer: `apps/omnihub-site/dashboard/OmniDashShell.tsx`
- Contract tests: `tests/omnidash/omnidash-sidebar-widgets.contract.spec.ts`
- Layout/product separation tests: `tests/omnidash/omnidash-layout-contract.spec.tsx`
- ESLint drift guard: `eslint.config.js`

### Expected Left Sidebar Order

`OmniBoard`, `PhysiOmni`, `Audits`, `Links`, `Automations`, `Workflows`, `Files`, `Billing`, `Settings`

### Runbook: Sidebar Drift Detected

1. Inspect `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`; confirm the widget array still contains exactly 9 entries in the expected order.
2. Inspect `apps/omnihub-site/dashboard/OmniDashShell.tsx`; confirm it imports and maps `OMNIDASH_SIDEBAR_WIDGETS` and contains no local `NAV` or `NAV_MODULE_KEY` definitions.
3. Confirm `packages/core/src/registry.ts` and `src/contracts/omnidash.contract.ts` still contain the broader product/platform registry state and were not edited to satisfy sidebar-only requirements.
4. Run focused gates:
   ```bash
   pnpm vitest run tests/omnidash/omnidash-sidebar-widgets.contract.spec.ts tests/omnidash/omnidash-layout-contract.spec.tsx tests/core/app-registry.spec.ts
   pnpm lint
   pnpm typecheck
   npx tsx scripts/omnidash-blast-radius.ts
   ```
5. If the blast-radius script reports more than five affected files for a sidebar-only change, stop and escalate as an architecture change.

### Non-Negotiable Exclusions

`OmniSkills`, `Orchestrator`, `Fortress`, `OmniPort`, `Maestro`, and `BYOM` are not left-sidebar widgets. `OmniSkills` may remain in the header utility/module access path.

---

## GitHub Actions SHA Pinning

### Policy
All GitHub Actions must use pinned commit SHAs. Floating tags (`@v3`, `@v4`) are forbidden because action maintainers can push breaking or malicious changes under these tags.

### How to Pin
1. Look up the latest release SHA on the action's GitHub releases page
2. Replace `actions/checkout@v4` with `actions/checkout@<SHA> # v4.x.x`
3. Repeat for all third-party actions in the workflow

### Workflows Currently Pinned (2026-05-20)
- `.github/workflows/integration.yml` — checkout, setup-node, all pinned
- `.github/workflows/deploy-omnihub-proof.yml` — checkout, setup-node, wrangler-action, all pinned

### Runbook: New Workflow Added
1. Run `grep -r "uses:.*@v" .github/workflows/` to find any floating tags
2. Pin each action: look up SHA at github.com/<org>/<action>/releases
3. Verify: `npm run docs:check` (does not catch action versions, but use it anyway)
4. PR must include the SHA pin — do not merge with floating tags

---

## Dependency Auto-Merge Gate

### Policy
`dependency-consolidation.yml` runs on a schedule. It only merges PRs where `mergeable_state === 'clean'` — all required status checks must pass.

### How It Works
1. Finds open PRs labelled for dependency consolidation
2. Calls `github.rest.pulls.updateBranch` to rebase with base
3. Calls `github.rest.pulls.get` to check `mergeable_state`
4. If `mergeable_state !== 'clean'`: logs warning, skips merge
5. If `mergeable_state === 'clean'`: merges with squash

### Runbook: PR Not Auto-Merging
1. Check the PR's required status checks — are they all green?
2. Check for merge conflicts — rebase the PR branch
3. If `mergeable_state` is `"blocked"` — there is a branch protection rule preventing merge even with green CI. Investigate the protection rules.

---

## Edge Function Secret Validation

### Policy
Supabase Edge Functions must never fall back to empty strings for required secrets. Missing secrets must cause an early exit with HTTP 503.

### Pattern (required for all edge functions)
```typescript
// At the top of the serve() handler:
const requiredSecret = Deno.env.get('MY_SECRET');
if (!requiredSecret) {
  return new Response('Function misconfigured', { status: 503 });
}
```

### Functions Updated (2026-05-20)
- `supabase/functions/stripe-webhook/index.ts` — STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
- `supabase/functions/_shared/requestSigning.ts` — ORCHESTRATOR_SHARED_SECRET (throws Error)

### Runbook: Function Returns 503
1. Check Supabase function secrets: `supabase secrets list` or Supabase Dashboard → Edge Functions → Secrets
2. Add the required secret: `supabase secrets set MY_SECRET=<value>`
3. Redeploy the function
