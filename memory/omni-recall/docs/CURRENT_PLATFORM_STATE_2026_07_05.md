---
version: 2.1.0
created: 2026-07-05
last_audited: 2026-07-05
status: verified-with-open-items
supersedes: CURRENT_PLATFORM_STATE_2026_07_04.md
---

# Current Platform State — 2026-07-05

> **CURRENT AUTHORITY (2026-07-05):** `antigravity/cp-16-doc-sync-remediation` branch (PR #1602) after the E2E chat connection matrix merge, OmniDash widget/links-persistence remediation, **and a follow-up CI-gate remediation pass** that fixed the build, dependency-scan, secret-scan, and ops-doc-drift gates and corrected a false "verified" claim below (see §CI Pipeline).

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-07-05 |
| Verified HEAD | `1d666bf2` — fix(ci): resolve PR #1602 red gates (vite `@omnihub` alias, osv-scanner bun.lockb crash, secret-scan false positives, ops-doc drift) |
| Active branch | `antigravity/cp-16-doc-sync-remediation` (PR [#1602](https://github.com/apexbusiness-systems/APEX-OmniHub/pull/1602)) |
| Remote check | `git fetch --all --prune` completed |
| Live/production state | **CONDITIONAL GO** — CI-gate fixes below are verified; two items remain outstanding for a human operator before merge (see "Outstanding operator actions") |
| Root package version | `1.8.3` |
| App package version | `1.3.10` (`apps/omnihub-site/package.json`) |
| Platform stack | Vite 7 + React 18 + TypeScript 5.9; Cloudflare Pages-aligned frontend; Supabase DB/Edge Functions; Render/Temporal orchestrator |
| CI/CD workflow count | **20** |
| Edge function dirs | **41** total (40 function dirs + `_shared`) — +6 new directories in this PR (`lovable-audit`, `lovable-device`, `lovable-healthcheck`, `omnilink-agent`, `supabase_healthcheck`, `test-integration`); `omnilink-agent/guardian.ts` and `_shared/rate-limiting.ts` are files added to a new/existing dir, not additional new directories |
| SQL migrations | **102** (98 forward + 4 rollback under `migrations/rollback/`) — unchanged by this PR |
| Source files (`src/`) | **329** (235 `.ts` + 94 `.tsx`) |
| Test/spec source files | **384** in the current repository scan |
| Custom hooks (`src/`) | **23** (`use*.ts*`) |
| Orchestrator tracked files | **~130** excluding `__pycache__` |

## Latest Verified Git History

```text
1d666bf2 fix(ci): resolve PR #1602 red gates — vite @omnihub alias, osv-scanner bun.lockb crash, secret-scan false positives, ops-doc drift
32626597 fix(omnihub): remediate authenticated dashboard widget flows, links persistence, and CI rfc gates
5f43844a fix: correct context item source type to fix TS2322 in LinksModule
7047c5ce docs: sync canonical platform state and E2E documentation for CP-16 remediations
ca6a32ca fix(omnihub): fix component warnings and fast refresh errors in workflow forms
20b0889d refactor(omnihub): split out CreateWorkflowForm to pass 500-line limit policy
1edfeeab feat(omnihub): remediate authenticated dashboard widget flows and links persistence
2e17021b docs: CP-16 uncertified gaps & platform state documentation sync
```

## Current Truth & Production Gaps Summary

The platform has resolved the E2E verification boundaries, performance testing gaps, authenticated dashboard widget flows, **and (as of the 2026-07-05 CI remediation pass) the seven red CI gates blocking PR #1602**. Two items require a human operator with live-environment access before this PR should be merged — see "Outstanding operator actions."

### 1. Performance/Load (PERFORMANCE_LOAD_K6) — VERIFIED
- **Status:** **VERIFIED**
- **Details:** The performance load test wrappers were successfully configured. Performance/load metrics (latency target <1000ms, error <0.01) have been verified against the production-safe targets and logged to `performance-summary.json`.

### 2. Authenticated OmniDash (AUTH_EMAIL_PASSWORD) — VERIFIED
- **Status:** **VERIFIED**
- **Details:** Verified browser login, logout, protected route access, and session validation using the Playwright E2E test suite running with authentic test user credentials.

### 3. OmniDash Persistence (OMNIDASH_LIVE_PERSISTENCE) — VERIFIED
- **Status:** **VERIFIED**
- **Details:** Verified layout loading, updates, and persistence across page reloads using the real Supabase database layer and Playwright assertions.

### 4. Supabase RLS (SUPABASE_RLS_MULTI_TENANT) — VERIFIED
- **Status:** **VERIFIED**
- **Details:** Programmatically verified least-privilege RLS constraints showing that Tenant A cannot query or mutate Tenant B's data rows.

### 5. CI Pipeline / Governance Gates — VERIFIED (corrected 2026-07-05)
- **Status:** **VERIFIED**, superseding an inaccurate claim in the prior revision of this document.
- **Correction:** The prior revision stated the `@omnihub/stores/omniSlateStore` module alias was "corrected... avoiding Vite/Vitest conflicts." That was only half true: `tsc` (via `tsconfig.app.json`'s `@omnihub/*` path) and Vitest resolved the alias, so typecheck and unit tests passed — but **`vite.config.ts` had no matching `resolve.alias` entry**, so the actual production build (`npm run build` / `vite build`) failed at bundle time with `Rollup failed to resolve import "@omnihub/stores/omniSlateStore"`. This was invisible to `npm run typecheck`/`npm test` and was only caught by the **Lighthouse Audit** and **Cloudflare Pages: apex-omnihub** CI checks, both of which build the production bundle. Fixed in `1d666bf2` by adding the missing alias to `vite.config.ts`, mirroring the existing `@`/`@omniconnect` entries.
- **Other gates fixed in the same pass:**
  - **Dependency vulnerability scan:** osv-scanner v1.9.2 cannot parse either Bun lockfile format (binary `bun.lockb` or plaintext `bun.lock`) and crashed (exit 127, "could not determine extractor") whenever `bun.lockb` changed — which blocked this PR and would have blocked *any* future PR touching it. Workflow now scans only `package-lock.json` (the designated `release_lockfile` per `policy/rsi-policy.yaml`). Fixing this unmasked 11 real (dev-only, non-production) vulnerabilities in the newly-added `omnihub-landing/apps/omnihub-site/package-lock.json`, remediated via `npm audit fix` with zero `package.json` changes.
  - **`build-and-test` (secret scan):** three documentation files with mock/example credentials (already using the repo's own `mock-...-replace-with-real` / illustrative pytest-fixture convention) were false-positived by `bun run secret:scan` and added to its existing `SYNTHETIC_FIXTURE_FILES` allowlist, consistent with sibling docs already on that list.
  - **Operations doc drift guard:** 8 new Supabase edge functions (Lovable-API replacement + `omnilink-agent` proxy/guardian) were undocumented; added §9.31 to `docs/APEX_AGENT_OPERATIONS.md`.
  - **RSI Governance Gate / Governance gate:** `terraform/modules/vercel/**` (new, unwired Terraform module) is a `protected_paths` hit under `policy/rsi-policy.yaml`, which hard-blocks by design until the PR body carries the required evidence checklist. Evidence added to the PR description; see "Outstanding operator actions" below for the two items that evidence honestly reports as not-yet-performed.
- **Architecture Review:** Committed `RFC-999-OMNIDASH-REMEDIATION` providing durable architecture-review evidence. *(unchanged from prior revision)*
- **Module Limits:** Refactored `WorkflowsModule` to 243 lines, complying with APEX 500-line module policy. *(unchanged from prior revision)*

### 6. Automated/Simulated Run Alignment — WIRED
- **Status:** **VERIFIED**
- **Details:**
  - **Links Widget:** Stages URLs to `localStorage` (`omnilink_staged_urls`) to ensure state is persisted across offline reloads.
  - **OmniSlate Handoff:** Connected directly to `useOmniSlateStore` state (updates dynamically with connection state) — see the Vite alias correction in §5 above; the store connection is only reachable in a production build as of `1d666bf2`.
  - **Automation Logs:** Connected the "View Logs" action in `AutomationsModule` to query live records from the `audit_logs` table via Supabase.
  - **Demo Execution:** Executing demo/non-UUID item rows in both automations and workflows runs a simulated visual execution trail, showing `[SIMULATED]` status updates.
  - **Request Access:** Set `VITE_ENABLE_REQUEST_ACCESS=true` in `.env` to enable direct database writes to the Supabase backend instead of fallback mailto.

## Outstanding operator actions (block merge until resolved)

Per the RSI Governance Gate evidence filed on PR #1602, this CI-remediation pass had no access to live infrastructure credentials or a deployed preview. A human operator must close these two items before merging:

1. **Terraform/HCP plan:** run `terraform plan` for `terraform/environments/staging` and confirm a zero/no-op diff. Static review shows `terraform/modules/vercel/**` (new in this PR) is not yet referenced by any environment root module, so no live resources should be affected — but this has not been confirmed against real HCP state.
2. **User-shoes validation:** manually click through the Links persistence, OmniSlate widget, Automations audit-log, and Request Access flows on a real preview/staging deploy. This document's §1–§6 verification claims above rely on the Playwright/Vitest suite plus static code review, not a live manual pass.

## Verification Commands Used

```bash
npx vitest run tests/omnidash/automation-billing-production-actions.spec.tsx
node scripts/ci/verify-release-validation-matrix.mjs
node scripts/secret-scan.mjs
node scripts/ci/check-ops-doc-drift.mjs
osv-scanner --config .osv-scanner.toml --lockfile=omnihub-landing/apps/omnihub-site/package-lock.json
```
