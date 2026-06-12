---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v1.6.1-OMNIBRIDGE | LAST_UPDATED=2026-05-20 -->
# Incident Response Playbook

## Vercel Reference Classification

LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical. Any Vercel commands, rollback paths, modules, or Edge Runtime references in this document are not current deployment proof unless separately labeled VERIFIED with active configuration evidence. See `docs/architecture/CANONICAL_TRUTH_MATRIX.md`.


**Version:** 1.2.0
**Last Updated:** 2026-05-20

## 1. Severity Levels

| Level     | Severity | Criteria                                  | Response Time |
| --------- | -------- | ----------------------------------------- | ------------- |
| **SEV-1** | Critical | Service Down, Data Loss, Security Breach  | < 15 mins     |
| **SEV-2** | High     | Core Feature Broken, Performance Degraded | < 1 hour      |
| **SEV-3** | Medium   | Minor Bug, UI Issue, Non-Blocking         | < 4 hours     |
| **SEV-4** | Low      | Documentation, Typos, Suggestions         | < 24 hours    |

## 2. Response Workflow

### Phase 1: Detection & Triage

1.  **Alert Received**: OmniSentry, User Report, or Automated Monitoring.
2.  **Verify**: Confirm the issue is real (not a false positive).
3.  **Classify**: Assign Severity Level (SEV-1 to SEV-4).
4.  **Declare**: Open an Incident Ticket (Jira/Linear) and Slack Channel (`#inc-YYYYMMDD-name`).

### Phase 2: Containment & Mitigation

1.  **Rollback**: If caused by a recent deploy, immediate rollback (`vercel rollback`).
2.  **Isolate**: If security breach, revoke tokens, block IPs, or enable Maintenance Mode.
3.  **Communicate**: Update Status Page (`status.apexomnihub.icu`) with "Investigating".

### Phase 3: Resolution

1.  **Debug**: Use "One-Pass-Debug" protocol.
2.  **Fix**: Apply surgical fix.
3.  **verify**: Test in staging, then deploy to production.

### Phase 4: Post-Mortem

1.  **Review**: What happened? Why? How to prevent recurrence?
2.  **Action Items**: Create tasks to fix root cause and improve monitoring.
3.  **Report**: Publish internal (and external if public impact) report within 24 hours.

## 3. Contacts

- **Incident Commander**: CTO / Lead Engineer
- **Security Lead**: Security Officer
- **Support**: support@apexomnihub.icu

---

## 4. Incident Log

### INC-20260325-LOGIN — Login Permanently Unavailable (SEV-1)

| Field | Value |
|-------|-------|
| **Severity** | SEV-1 (Critical — Service Down) |
| **Status** | RESOLVED |
| **Detected** | 2026-03-25 |
| **Resolved** | 2026-03-25 (PR #920) |
| **Impact** | All user authentication blocked — email sign-in, Google OAuth, Apple OAuth |
| **Affected URL** | `apexomnihub.icu/login` |
| **Error Displayed** | "Login is unavailable. Trace: cfg-u2tyaegy" |

#### Root Cause Analysis

Three independent failures converged:

1. **`wrangler.toml` env var scoping (PRIMARY):** Empty `[env.production]` and `[env.preview]` sections in `wrangler.toml` caused Cloudflare Pages to not inject dashboard environment variables into the Vite build process. `import.meta.env.VITE_SUPABASE_URL` compiled to empty string `""`, causing `hasSupabaseConfig` to evaluate as `false` permanently. **Evidence:** Production JS bundle (`index-C6yqaWwt.js`) contained `placeholder.supabase.co` instead of `rtopreovkywofgwgmozi.supabase.co`. CF Pages build logs showed `Build environment variables: (none found)`.

2. **Missing `icon.png` in root `public/` (SECONDARY):** Cloudflare Pages builds from the monorepo root (`root_dir: ""`), so Vite serves static assets from `/public/` at root. The `icon.png` only existed in `apps/omnihub-site/public/`, resulting in a 404 and broken image on the login page.

3. **Cryptic error message (UX):** The error "Login is unavailable. Trace: cfg-xxx" gave users and administrators zero actionable guidance.

#### Fix Applied

- Removed empty `[env.*]` sections from `wrangler.toml` to restore CF Pages env var injection
- Copied `icon.png` to root `public/` directory
- Added inline SVG fallback with `onError` handler
- Added proactive `role="alert"` banner showing exact env var names and Cloudflare Pages setup instructions
- Added 43 regression tests (`tests/login-page-fixes.test.ts`)

#### Prevention Measures

- `tests/login-page-fixes.test.ts` now asserts `wrangler.toml` has no `[env.production]` or `[env.preview]` sections
- `tests/login-page-fixes.test.ts` asserts no real Supabase credentials in `wrangler.toml`
- Login page proactively shows missing config banner (doesn't wait for user to click Sign In)
- Developer Onboarding doc updated with `wrangler.toml` warning

---

### INC-OMNIBRIDGE-CMDINJECT — OmniBridge Command Injection Attempt (SEV-1)

| Field | Value |
|-------|-------|
| **Severity** | SEV-1 (Critical — Security Breach) |
| **Incident Type** | OmniBridge command injection attempt |

#### Detection

Two signals indicate a command injection attempt:

1. **`log_admin_action` audit spike** — an unexpected surge in `log_admin_action` rows from a single `source_id` within a short window (e.g., > 50 commands/minute) suggests forged or replayed commands.
2. **`ingress_failures` table spike** — a sudden increase in rows with `risk_score = 999` (BLOCKED lane) indicates the risk classifier is detecting and rejecting malicious payloads.

```sql
-- Check recent ingress failures
SELECT source_id, COUNT(*) AS failure_count, MAX(created_at) AS latest
FROM ingress_failures
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND risk_score >= 999
GROUP BY source_id
ORDER BY failure_count DESC;

-- Cross-reference with admin action log
SELECT action_type, source_id, COUNT(*) AS count, MAX(created_at) AS latest
FROM admin_action_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY action_type, source_id
ORDER BY count DESC;
```

#### Containment

Immediately rotate `OMNIHUB_SIGNING_SECRET` on **both** sides simultaneously:

```bash
# 1. Generate a new secret
openssl rand -base64 48

# 2. Update on OmniHub side (Supabase Vault)
supabase secrets set OMNIHUB_SIGNING_SECRET=<new-value> --project-ref rtopreovkywofgwgmozi

# 3. Update on SBBL-HQ side (Cloudflare Worker)
wrangler secret put OMNIHUB_SIGNING_SECRET --env production
# (paste the same new-value when prompted)
```

All in-flight packets signed with the old secret will be rejected once both sides have rotated. If you suspect only the inbound verify key is compromised, rotate `OMNIHUB_VERIFY_KEY` independently.

#### Eradication

Audit all received commands in the last 24 hours for anomalous patterns:

```sql
-- Audit all inbound commands in the last 24h
SELECT id, source_id, action_type, risk_lane, command_id, created_at
FROM admin_action_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Identify any BLOCKED commands that slipped past
SELECT id, source_id, risk_score, payload_hash, created_at
FROM ingress_failures
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

Review each RED-lane command that reached `pending_approval` status to determine if any MAN-quorum approval was obtained under false pretenses.

#### Recovery

Verify zero BLOCKED events in `ingress_failures` since the secret rotation:

```sql
-- Should return 0 rows after rotation
SELECT COUNT(*) AS blocked_since_rotation
FROM ingress_failures
WHERE created_at > '<rotation-timestamp>'::timestamptz
  AND risk_score >= 999;
```

Confirm normal delivery resumes by triggering a PING command and verifying `status = 'delivered'` in `omnibridge_events` within 10 seconds.

---

### INC-OMNIBRIDGE-DRAINFAIL — OmniBridge Sync Drain Failure (SEV-2)

| Field | Value |
|-------|-------|
| **Severity** | SEV-2 (High — Core Feature Degraded) |
| **Incident Type** | OmniBridge sync drain failure |

#### Detection

The `/sync/drain` worker on SBBL-HQ attempts delivery with up to 4 retries (exponential backoff: 0ms / 250ms / 1s / 4s). A drain failure is indicated when:

- `deliverSyncEnvelope` logs show `attempt 4/4 failed` on any packet — visible in Cloudflare Worker tail logs:
  ```bash
  wrangler tail --env production --filter /sync/drain
  # Look for: ERROR [drain] packet <id> failed after 4 attempts — marked stuck
  ```
- `omnibridge_outbox` records accumulate in `status = 'stuck'` state:
  ```sql
  SELECT id, tenant_id, packet_id, attempts, status, last_error, created_at
  FROM omnibridge_outbox
  WHERE status = 'stuck'
  ORDER BY created_at DESC;
  ```

#### Containment

1. **Check `OMNIHUB_SYNC_URL` env var on SBBL-HQ** — incorrect URL is the most common cause:
   ```bash
   wrangler secret list --env production
   # Verify OMNIHUB_SYNC_URL is set and points to the correct OmniHub endpoint
   ```

2. **Verify OmniHub endpoint reachability** from outside the SBBL-HQ worker:
   ```bash
   curl -i -X POST https://<omnihub-sync-url>/api/omnibridge/sync \
     -H "X-Omni-Source: sbbl-hq" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   # Expect 400 (bad envelope) — not 404 or timeout
   ```

3. **Check OmniHub edge function health** — confirm the Supabase Edge Function is deployed and running:
   ```bash
   supabase functions list --project-ref rtopreovkywofgwgmozi
   ```

#### Resolution

Inspect `omnibridge_outbox` for stuck records and attempt manual re-queue or cancellation:

```sql
-- View stuck outbox records with error details
SELECT id, tenant_id, packet_id, attempts, last_error, created_at, updated_at
FROM omnibridge_outbox
WHERE status = 'stuck'
ORDER BY created_at ASC;

-- Re-queue stuck records for retry (after fixing the underlying cause)
UPDATE omnibridge_outbox
SET status = 'pending', attempts = 0, last_error = NULL, updated_at = NOW()
WHERE status = 'stuck'
  AND tenant_id = 'sbbl-hq';

-- Cancel stuck records that are no longer relevant (e.g., stale telemetry)
UPDATE omnibridge_outbox
SET status = 'cancelled', updated_at = NOW()
WHERE status = 'stuck'
  AND created_at < NOW() - INTERVAL '1 hour'
  AND tenant_id = 'sbbl-hq';
```

Once the underlying connectivity issue is resolved, trigger the `/sync/drain` endpoint manually to flush the queue:

```bash
curl -X POST https://<sbbl-hq-worker-url>/sync/drain \
  -H "Authorization: Bearer <service-token>"
```
