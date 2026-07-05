---
version: 2.2.0
created: 2026-07-05
last_audited: 2026-07-05
status: verified-with-open-items
supersedes: CURRENT_PLATFORM_STATE_2026_07_04.md
---

# Current Platform State — 2026-07-05

> **CURRENT AUTHORITY (2026-07-05):** `antigravity/cp-16-doc-sync-remediation` branch (PR #1602) after the E2E chat connection matrix merge, OmniDash widget/links-persistence remediation, and a follow-up CI-gate remediation + scope-cleanup pass (fixed the build/dependency-scan/secret-scan/ops-doc-drift gates, removed an out-of-scope `omnihub-landing` subproject and committed lint-scratch files, and **corrected an overstated production-readiness claim** — see "Production Gaps" below).

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-07-05 |
| Verified HEAD | see PR #1602 latest commit (CI remediation + scope cleanup) |
| Active branch | `antigravity/cp-16-doc-sync-remediation` (PR [#1602](https://github.com/apexbusiness-systems/APEX-OmniHub/pull/1602)) |
| Remote check | `git fetch --all --prune` completed |
| Live/production state | **NO-GO for full production certification** — this matches, and does not supersede, `docs/release/release-validation-matrix.json` (`decision: NO_GO_FOR_FULL_PRODUCTION_CERTIFICATION__HARNESS_READY_LIVE_GAPS_HONEST`, generated 2026-06-26). CI-gate fixes in this PR are verified and narrow; they do not change the platform's overall certification status. |
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

## Production Gaps (owner-confirmed, 2026-07-05 — authoritative over the VERIFIED claims below)

The prior revision of this document marked items 1–4 below as blanket **VERIFIED**. That overstated what the repo's own canonical release authority (`docs/release/release-validation-matrix.json`) actually supports. Corrected per owner review:

1. **Performance/load — ACCEPTED-DEFERRED, not a silent gap.** `release-validation-matrix.json` classifies `performance/load` as `RUNNABLE_IN_CI` (k6 harness exists, no current run proves `p99 < 800ms`). This is **formally governed**: [`accepted-findings.md`](../../../accepted-findings.md) (Phase 6 G6) records it as `ACCEPTED-DEFERRED`, ticket **APEX-1202**, `SOFT / main-only` — the soft gate collects data on `main` without blocking feature delivery until a dedicated performance-tuning pass lands. It is open, but it is not unaddressed or ignored.
2. **Authenticated OmniDash is not production-certified (P0/P1) — genuinely open, no deferral on file.** The matrix requires `REQUIRES_OWNER_CREDENTIALS` for live login, protected-route access, session validation, and persistence read-back. Repo-level Playwright coverage exercises the code paths; it is not a substitute for a live authenticated pass and does not carry a GO verdict on its own. Unlike item 1, there is no `accepted-findings.md` entry for this — it remains an unaccepted gap.
3. **Mock/demo/local behavior is present and, where it exists, is honestly labeled** — not silently masked as production behavior:
   - Links can stage URLs to `localStorage` when sync is unavailable; that is graceful degradation, **not** persistence. The underlying Links-module fallback (generic module view instead of a full add-link form pending `omnilink-port` wiring) is likewise **ACCEPTED-DEFERRED** per `accepted-findings.md`, ticket **APEX-2011**, `SOFT / non-blocking` — `tests/e2e/.../cp-11-modal-matrix` skips the corresponding assertion with a tracker referencing that ticket.
   - OmniSlate handoff surfaces its real connection state, including "not connected," rather than faking a connection.
   - Automation logs likewise surface "not connected" rather than fabricating log entries.
   - Demo/non-UUID automation and workflow rows are blocked from real execution unless they are saved, live UUID records — simulated runs are labeled `[SIMULATED]`.
   - Request Access falls back to `mailto` unless `VITE_ENABLE_REQUEST_ACCESS=true` and the Supabase env are present.
4. **Manual validation is still required for production-critical flows — genuinely open, no deferral on file:** auth email/password, OAuth, passkeys, OmniDash persistence, Supabase RLS multi-tenant proof, BYOM provider keys, billing/payment sandbox, branch protection, and some OmniBoard chat-native intents all remain unverified against live infrastructure in the validation matrix — none of this PR's changes close those items, and none are covered by `accepted-findings.md`.

## Latest Verified Git History (this PR)

```text
chore: remove out-of-scope omnihub-landing subproject and committed scratch artifacts
docs: sync README, .understand-anything, and memory/omni-recall to PR #1602 remediation
fix(ci): resolve PR #1602 red gates — vite @omnihub alias, osv-scanner bun.lockb crash, secret-scan false positives, ops-doc drift
32626597 fix(omnihub): remediate authenticated dashboard widget flows, links persistence, and CI rfc gates
5f43844a fix: correct context item source type to fix TS2322 in LinksModule
7047c5ce docs: sync canonical platform state and E2E documentation for CP-16 remediations
ca6a32ca fix(omnihub): fix component warnings and fast refresh errors in workflow forms
20b0889d refactor(omnihub): split out CreateWorkflowForm to pass 500-line limit policy
```

## What this PR's CI-remediation pass actually verified (narrow, code/CI-level only)

These are true and re-verified, but are **CI-gate** facts, not production-certification facts — they do not resolve the Production Gaps above.

### A. CI Pipeline / Governance Gates — VERIFIED (corrected 2026-07-05)
- **Correction:** an earlier revision of this document stated the `@omnihub/stores/omniSlateStore` module alias was "corrected... avoiding Vite/Vitest conflicts." That was only half true: `tsc` (via `tsconfig.app.json`'s `@omnihub/*` path) and Vitest resolved the alias, so typecheck and unit tests passed — but **`vite.config.ts` had no matching `resolve.alias` entry**, so the actual production build (`npm run build` / `vite build`) failed at bundle time with `Rollup failed to resolve import "@omnihub/stores/omniSlateStore"`. This was invisible to `npm run typecheck`/`npm test` and was only caught by the **Lighthouse Audit** and **Cloudflare Pages: apex-omnihub** CI checks, both of which build the production bundle. Fixed by adding the missing alias to `vite.config.ts`, mirroring the existing `@`/`@omniconnect` entries.
- **Other gates fixed in the same pass:**
  - **Dependency vulnerability scan:** osv-scanner v1.9.2 cannot parse either Bun lockfile format (binary `bun.lockb` or plaintext `bun.lock`) and crashed (exit 127, "could not determine extractor") whenever `bun.lockb` changed. Workflow now scans only `package-lock.json` (the designated `release_lockfile` per `policy/rsi-policy.yaml`).
  - **`build-and-test` (secret scan):** three documentation files with mock/example credentials (already using the repo's own `mock-...-replace-with-real` / illustrative pytest-fixture convention) were false-positived by `bun run secret:scan` and added to its existing `SYNTHETIC_FIXTURE_FILES` allowlist, consistent with sibling docs already on that list.
  - **Operations doc drift guard:** 8 new Supabase edge functions (Lovable-API replacement + `omnilink-agent` proxy/guardian) were undocumented; added §9.31 to `docs/APEX_AGENT_OPERATIONS.md`.
  - **RSI Governance Gate / Governance gate:** `terraform/modules/vercel/**` (new, unwired Terraform module) is a `protected_paths` hit under `policy/rsi-policy.yaml`, which hard-blocks by design until the PR body carries the required evidence checklist. Evidence added to the PR description; see "Outstanding operator actions" below.
- **Architecture Review:** Committed `RFC-999-OMNIDASH-REMEDIATION` providing durable architecture-review evidence. *(unchanged from prior revision)*
- **Module Limits:** Refactored `WorkflowsModule` to 243 lines, complying with APEX 500-line module policy. *(unchanged from prior revision)*

### B. Scope cleanup (2026-07-05)
- Removed `omnihub-landing/apps/omnihub-site/**` — a brand-new, unrelated landing-page subproject (13 files, its own `package.json`/`vite.config.ts`/`vercel.json`) bundled into this PR outside its stated scope. This also removed the only reason the osv-scanner fix above had 11 dev-dependency CVEs to remediate on this PR — that workflow fix stands on its own merits regardless.
- Removed `lint-report.json`, `lint_final.json`, `lint_final_clean.json`, `lint_last.json`, `lint_results.json`, `typecheck_output.txt` — local tool-run scratch output committed by mistake; not referenced by any script or workflow.

### C. Automated/Simulated Run Alignment — code-level, matches §"Mock/demo" gap above
- **Links Widget:** Stages URLs to `localStorage` (`omnilink_staged_urls`) so state survives offline reloads — this is degraded-mode UX, not a substitute for real sync persistence.
- **OmniSlate Handoff:** Connected directly to `useOmniSlateStore` state (only reachable in a production build as of the Vite alias fix in §A).
- **Automation Logs:** Connected the "View Logs" action in `AutomationsModule` to query live records from the `audit_logs` table via Supabase.
- **Demo Execution:** Executing demo/non-UUID item rows in both automations and workflows runs a simulated visual execution trail, showing `[SIMULATED]` status updates.
- **Request Access:** Set `VITE_ENABLE_REQUEST_ACCESS=true` in `.env` to enable direct database writes to the Supabase backend instead of fallback mailto.

## Outstanding operator actions (block merge until resolved)

Per the RSI Governance Gate evidence filed on PR #1602, this CI-remediation pass had no access to live infrastructure credentials or a deployed preview. A human operator must close these before merging:

1. **Terraform/HCP plan:** run `terraform plan` for `terraform/environments/staging` and confirm a zero/no-op diff. Static review shows `terraform/modules/vercel/**` (new in this PR) is not yet referenced by any environment root module, so no live resources should be affected — but this has not been confirmed against real HCP state.
2. **User-shoes validation:** manually click through the Links persistence, OmniSlate widget, Automations audit-log, and Request Access flows on a real preview/staging deploy.
3. **All four Production Gaps above** remain open regardless of this PR merging — they are pre-existing platform-certification gaps, not introduced or closed by PR #1602.

## Verification Commands Used

```bash
npx vitest run tests/omnidash/automation-billing-production-actions.spec.tsx
node scripts/ci/verify-release-validation-matrix.mjs
node scripts/secret-scan.mjs
node scripts/ci/check-ops-doc-drift.mjs
```
