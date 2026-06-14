---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# APEX OmniHub Repository Assessment Report

**Assessment date:** 2026-04-07 (UTC)  
**Auditor:** Codex (automated + manual static review)  
**Scope requested:** Repo state audit, with focused inspection of Supabase and Cloudflare surfaces.

## 1) Executive summary

- The repository is operationally mature (broad test surface, rich docs, staged infra definitions), but the claim of a “complete line-by-line audit” is not realistically satisfiable in one pass for this code volume.
- Supabase integration is extensive and mostly follows secure patterns (service vs anon client separation, JWT gating on sensitive functions, RLS-heavy migration footprint).
- Cloudflare Terraform includes an implementation risk: one `cloudflare_rate_limit` uses a list for `url_pattern`, which likely conflicts with provider schema expecting a single string.
- Environment token validation outcome:
  - **Cloudflare API token verification failed (`401`)**.
  - **Supabase URL responds, but API access without key returns expected `401`**.

## 2) Repository baseline state

- Primary app stack: Vite + React + TypeScript with Supabase and orchestration components.
- Snapshot counts gathered during this run:
  - ~734 TS/TSX/Python/SQL tracked code files in key folders.
  - 26 Supabase Edge Function directories.
  - 70 SQL migrations under `supabase/migrations`.
  - 12 Terraform files.
- Branch inspected: `work`.
- Working tree at start: clean.

## 3) Supabase inspection

### 3.1 Configuration and client patterns

- `supabase/config.toml` is present and includes OAuth external providers plus per-function JWT behavior controls.
- Server-side helper in `supabase/functions/_shared/supabaseClient.ts` cleanly splits:
  - `createServiceClient()` requiring `SUPABASE_SERVICE_ROLE_KEY`.
  - `createAnonClient()` requiring `SUPABASE_ANON_KEY` and optional bearer forwarding.
- Frontend integration exports from a centralized adapter (`src/integrations/supabase/client.ts`), reducing config drift risk.

### 3.2 Security posture observations (Supabase)

- Positive:
  - Multiple function endpoints use `verify_jwt = true` in config.
  - Public endpoints are explicitly documented when `verify_jwt = false`.
  - Migration footprint strongly indicates RLS-hardening and incident controls over time.
- Risks:
  - Several functions remain intentionally public (`verify_jwt = false`) and depend on secondary controls (signature/rate limits/input validation). These should be periodically threat-modeled and load-tested.
  - Docs mention real project references and operational runbooks; ensure secrets inventory docs never include live keys.

### 3.3 Runtime validation (Supabase)

- `SUPABASE_URL` env var exists.
- Unauthenticated probe to `${SUPABASE_URL}/rest/v1/` returned `401` with “No API key found,” which is expected behavior.
- No service-role verification executed (service key not available in process env at runtime).

## 4) Cloudflare inspection

### 4.1 Terraform module findings

- `terraform/modules/cloudflare/main.tf` defines DNS, WAF, page rules, and rate limits.
- **High-confidence schema risk:** `cloudflare_rate_limit.apex_sensitive_endpoints.match.request.url_pattern` is set to a list of URLs, but provider docs generally require a single `url_pattern` string per rule. This may fail plan/apply or behave unexpectedly.

### 4.2 Provider and environment validation

- `terraform/environments/staging/main.tf` configures cloud backend, Cloudflare/Upstash/Vercel providers, and staging domain overlays.
- Cloudflare token check against `user/tokens/verify` returned `401`; token may be invalid, expired, or not a token value (e.g., wrong secret type).
- Terraform binary is not installed in this runtime, so `terraform validate` could not be executed.

## 5) Testing and checks executed

1. Supabase config and guardrail test suite:
   - `bun test tests/login-supabase-config.test.ts` → **PASS** (14/14).
2. Environment variable presence check (names only):
   - Found `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `SUPABASE_URL`.
3. External API probes:
   - Cloudflare token verify endpoint → **401**.
   - Supabase REST root without API key → **401** (expected).
4. Terraform static validation attempt:
   - Failed due to missing local `terraform` binary.

## 6) Priority issues and recommendations

### P0 / Immediate

1. **Cloudflare credential integrity check**
   - Rotate/re-issue `CLOUDFLARE_API_TOKEN`, verify scopes, and rerun token verification.

2. **Cloudflare rate-limit schema correction**
   - Replace list-valued `url_pattern` with separate `cloudflare_rate_limit` resources per endpoint (or supported rule expression approach).

### P1 / Near-term

3. **Public Supabase Edge endpoint review**
   - For each `verify_jwt = false` function, document compensating controls and test abuse cases (replay, flood, malformed payloads).

4. **Infra CI guardrails**
   - Add CI stage with `terraform fmt -check`, `terraform validate`, and `tflint` (when Terraform is available in CI image).

### P2 / Ongoing

5. **Evidence-grade auditing cadence**
   - Produce weekly machine-generated report for: function auth matrix, migration diff risk class, and cloud policy drift.

## 7) Constraints and audit honesty statement

- A literal full “line-by-line” manual audit of the entire repository is outside feasible single-turn execution due to repository size.
- This report is a comprehensive **high-signal static + targeted runtime** assessment with explicit focus on Supabase and Cloudflare as requested.
- If needed, a phase-2 deep audit can be split into module batches (`src/`, `supabase/functions/`, `supabase/migrations/`, `orchestrator/`, `terraform/`) with explicit defect ledger output per file.

---

## 8) 2026-04-07 validation update (post-fix)

- Terraform CLI was installed in the execution environment (`terraform v1.8.5`).
- `terraform validate` now passes for:
  - `terraform/modules/cloudflare`
  - `terraform/modules/upstash`
  - `terraform/modules/vercel`
  - `terraform/environments/staging`
- Rate limiting has now been migrated from deprecated `cloudflare_rate_limit` resources to `cloudflare_ruleset` (`http_ratelimit` phase), and validation is warning-free in staging.
- Upstash/Vercel provider-schema drift that previously blocked staging validation has been remediated in-module.
