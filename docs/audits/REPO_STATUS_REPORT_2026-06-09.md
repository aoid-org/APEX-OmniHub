# APEX-OmniHub — Comprehensive Repository Status Report

**Date:** 2026-06-09
**Scope:** Full remote-state + deep code trace audit (frontend, backend/data, CI/CD, security, governance)
**Method:** Direct trace of code, migrations, workflows, live GitHub state, and CI failure logs — not document review.
**Baseline commit:** `102ad20` (main tip at audit time) | **Latest release:** `v1.7.0` (2026-05-31)

---

## 1. Executive Verdict

**Overall: PRODUCTION-GRADE PLATFORM WITH TWO ACTIVE P0 CI BLOCKERS AND THREE STRUCTURAL DEBT ITEMS.**

The platform is architecturally mature: 30 production Supabase edge functions, 91 versioned
migrations with hardened RLS (550+ policy checks), a pure Temporal worker with CI-enforced
boundary purity, a real CDK/Terraform infrastructure layer, and ~250+ substantive test files
behind enforced coverage thresholds. This is not scaffolding — the code traced is real.

However, **main is not green**: two workflows fail on every push (`integration-harness`,
`Clean-Room Final Certification`), the release pipeline cannot certify a new release cut,
and the codebase violates its own 600-line modularity protocol in 7+ critical files,
including the main dashboard shell at nearly 3× the limit.

| Dimension | Status |
|---|---|
| Remote main CI health | 🔴 2 persistent failures per push (root causes identified, §3) |
| Release pipeline | 🟡 Runs, uploads SBOMs, but verdict = `NOT_CERTIFIED_NO_RELEASE_CUT` |
| Backend / data layer | 🟢 Hardened (RLS, secrets clean, boundary-enforced) |
| Frontend | 🟡 Feature-complete; auth-init race condition + file-size violations |
| Test infrastructure | 🟢 Substantive (behavioral tests, no snapshot theater) |
| Security posture | 🟢 Defense-in-depth (TruffleHog + Gitleaks + audit gates) |
| Repo hygiene | 🟡 Tracked junk at root; 3 competing lockfiles |
| Open issues | 🟢 0 open issues |
| Open PRs | 🟡 12 open (9 dependabot, 3 stale CI-fix PRs — one fixes a P0) |

---

## 2. Remote Repository State (Live)

- **Default branch:** `main` at `102ad20` ("Bolt: memoize TraceEntryRow in OmniTracePanel").
- **Latest release:** `v1.7.0`, published 2026-05-31. SBOM assets (npm + Python CycloneDX)
  were re-uploaded by the release workflow on 2026-06-09 — the workflow itself now runs.
- **Open issues:** 0.
- **Open PRs (12):**
  - **#1354** — `fix(ci): remove --frozen-lockfile from bun install in integration.yml` —
    **this is the fix for the P0 integration-harness failure and is sitting unmerged.**
  - #1352 — remove invalid `[functions.env]` block from `supabase/config.toml` (CI Fix #2).
  - #1355 — SonarCloud exclusion for `scratch_fix.cjs` (ReDoS suppression).
  - #1365 — feat: PWA install banner with integrity guard.
  - #1331, #1332, #1359–#1363, #1367 — dependabot. Two are **major-version bumps that need
    human review, not auto-merge**: hardhat 2→3 (#1359) and wagmi 2→3 (#1363); also
    @capacitor/cli 6→8 (#1362).
- **CI tally (last 25 main runs):** 19 success / 4 failure / 7 skipped. The 4 failures are
  the same two workflows failing twice (every main push).

---

## 3. P0 — Active CI Failures on Main (Root-Caused from Logs)

### 3.1 `integration-harness` — fails every push
**Root cause (from run 27224843139 logs):**
`bun install --frozen-lockfile` fails with `error: lockfile had changes, but lockfile is frozen`.
`bun.lock` (last touched in #1351) has drifted from `package.json`.

**Compounding factor:** the harness clones the sibling repo `sbbl-hq` and the job log shows
`env: GH_PAT:` **empty** — the clone happened to succeed, but the secret appears unset or
unavailable on push events, which will bite when the lockfile issue is fixed.

**Fix path:** Merge **PR #1354** (already open, mirrors the same fix applied to cd-staging in
#1353 / `ea99829`) **or** regenerate and commit `bun.lock`. Then verify `GH_PAT` is populated
for push-triggered runs.

### 3.2 `Clean-Room Final Certification` — fails every push, blocks release cuts
**Root cause (from run 27224843242 release-evidence output):**
```
B-1 (P0): Shadow preflight evidence unavailable: ENOENT: no such file or directory,
open 'shadow-preflight.json'
final_verdict: NOT_CERTIFIED_NO_RELEASE_CUT
```
The certification job writes release evidence **without first running**
`scripts/ci/shadow-certification-preflight.mjs`, so `shadow-preflight.json` never exists and
the verdict is fail-closed. Related: in `release.yml` the terraform-plan / atomic-routing-flip
jobs are gated on a hardcoded `'false' == 'true'` (lines ~131/149) — intentional dead code,
meaning the shadow deployment path that would produce this evidence is disabled by constant
while the certifier still demands its output.

**Fix path:** Either run the preflight script in the certification job before evidence
assembly, or make the certifier treat a disabled shadow slot as `skipped` instead of `blocked`.

### 3.3 Lockfile triplication (root cause amplifier)
Three lockfiles coexist at root: `bun.lock` (440 KB), `package-lock.json` (932 KB),
`deno.lock` (628 KB). npm- and bun-based workflows resolve against different trees, which is
the systemic source of the recurring `--frozen-lockfile` class of failures (#1353, #1354,
`ea99829`). **One package manager should be declared canonical for CI.**

### 3.4 Platform deprecation deadline
GitHub Actions warns on every run: Node 20 actions forced to Node 24 starting
**2026-06-16 (7 days away)**. Pinned actions (`actions/checkout`, `setup-node`,
`upload-artifact` SHAs) should be bumped this week.

---

## 4. Backend & Data Layer (Traced)

- **Supabase:** 30 edge functions; flagship `omnilink-port` (1,364 lines, 64 auth checks,
  105 error handlers), `trigger-workflow` (582), `byom-cockpit` (572), `web3-verify` (501).
  Real production code, not stubs.
- **Migrations:** 91 spanning Mar 2024 → Jun 2026. Migration `20260608` resolved all
  Supabase Security Advisor warnings (lints 0011/0014/0024): extensions moved out of
  `public`, `search_path` locked on triggers, permissive policies re-scoped.
- **RLS:** `auth.uid() = user_id` pattern across user-data tables; 550+ policy checks in
  migration history; service-role usage documented and confined to admin paths
  (byom-cockpit, byom-login, omnilink-eval, omnilink-port, alchemy-webhook).
- **Orchestrator (Python/Temporal):** pure worker (`orchestrator/main.py`) — purity is
  CI-enforced (no fastapi/uvicorn imports allowed); 3 workflows, 40+ activities,
  47 test files incl. chaos/DLQ/man-mode. **Coverage gate is only 55%** — lowest in repo.
- **AWS Lambda:** OmniHubWorkerStack (CDK, ARM64 Node 20.x) for async Temporal activity
  completion; uses user JWT + anon key so RLS still applies. Terraform Cloud backend with
  Cloudflare (DNS/WAF, 200 rps rate limit) and Upstash Redis modules.
- **Web3:** `APEXMembershipNFT.sol` (262 lines) — real ERC721 with reentrancy guards,
  pausable, supply cap; `guard-mainnet-deploy.mjs` blocks deploys with dummy keys.
- **Gateway (`src/omnihub-gateway/`, 16 files):** JSON-RPC 2.0 dispatch, SemanticRouter,
  IdempotencyManager, TokenEconomicsRouter, TriforceGuardian, ManMode, SSEManager,
  TemporalBridge. Plus the new **MCP gateway edge function exposing 26 tools** (merged Jun 7).
- **Secrets hygiene:** clean — `.env.example` documents 248 lines of names-only config; no
  hardcoded service-role/Stripe/private keys found in the tree.

---

## 5. Frontend (Traced)

- **Composition:** root `src/main.tsx` → `apps/omnihub-site/src/App.tsx`; 41 public routes;
  single post-auth surface at `/omnidash(/*)`; 463 TS files under `src/`.
- **State:** Zustand stores are production-grade — `omniGatewayStore` (332 lines) implements
  zero-polling SSE with a mutable token buffer to avoid per-token re-renders;
  `omniDashStore` (258 lines) handles spatial widgets with `structuredClone` sanitization.
- **⚠️ Auth-init race (`src/contexts/AuthContext.tsx`):** `onAuthStateChange()` and
  `getSession().then()` both set session/user/loading independently with no ordering
  guarantee → loading-state flicker and potential stale device-trust sync. Fix: hydrate once
  from `getSession()`, then let the listener own all subsequent updates.
- **Mobile:** Capacitor is real — configured `capacitor.config.ts`
  (`com.apexbusiness.omnilink`), full Android Gradle + iOS Xcode projects, PWA manifest/SW.
- **Dead code:** minimal — only ~17 mock/stub markers, nearly all intentional demo-mode or
  test fixtures.
- **SSE resilience gap:** no retry/backoff or polling fallback when EventSource fails.

### 600-Line Protocol Violations (CLAUDE.md rule)
| File | Lines | × Limit |
|---|---|---|
| `apps/omnihub-site/dashboard/OmniDashShell.tsx` | 1,697 | 2.8× |
| `supabase/functions/omnilink-port/index.ts` | 1,364 | 2.3× |
| `src/omniconnect/ingress/OmniPort.ts` | 1,130 | 1.9× |
| `apps/omnihub-site/src/pages/Home.tsx` | 1,032 | 1.7× |
| `apps/omnihub-site/src/pages/RequestAccess.tsx` | 787 | 1.3× |
| `src/lib/database/providers/supabase.ts` | 671 | 1.1× |
| `src/components/ui/sidebar.tsx` | 640 | 1.1× |
| `src/omnihub-gateway/middleware/TriforceGuardian.ts` | 615 | 1.0× |

Note: the apex-governance CI gate enforces a 1,000-line module cap — looser than the
documented 600-line protocol, so several violations pass CI silently.

---

## 6. CI/CD & Quality Infrastructure (Traced)

- **22 workflows (~3,700 YAML lines).** 19 substantive, 3 trivial (`security-guards.yml` is
  a single DEV-BYPASS grep).
- **`release.yml` is now syntactically sound** after the 5-commit fix chain (ruff install via
  literal block scalar). Shadow-deploy/atomic-flip jobs remain disabled by hardcoded `'false'`.
- **Tests:** 250 files / 35 categories; 2,354 mock-fn usages; zero snapshot assertions
  (behavioral, not theater). Vitest thresholds enforced: 70% stmts / 63% branch / 72% fn /
  71% lines. Infra tests gate at 85/85/70/85 on `lambdaDispatchActivity`.
- **Boundary guardrails (fail-closed):** worker purity, API purity, metrics decoupling,
  OmniBoard drift, monitored-file existence.
- **Security scanning:** TruffleHog (verified-only, incremental + full fallback) + Gitleaks
  backup + hardcoded-pattern regex + npm audit (blocks CRITICAL on prod deps) + SonarCloud
  (A-grade gates, ≥80% new-code coverage) + OSV (one documented dev-only ignore until
  2026-08-31).
- **Governance:** `apex_policy_check.py` is a real, config-driven, fail-closed executable
  (god-object names, cross-domain coupling, RFC completeness). The rest of `governance/`
  and `.agents/` is documentation/LLM playbooks (only 3 executable scripts).
- **Gaps:** 46 `skip`/`only`/TODO markers in tests; integration tests excluded from CI
  vitest run; Playwright suite is smoke-only; no migration-rollback scenario tests;
  pre-commit hook is a single grep (no lint/test).

---

## 7. Repo Hygiene Findings

Tracked at repo root (should be moved to docs/, archived, or gitignored):
`APEX Bible.zip` (66 KB binary), `prompt_dump.txt`, `scratch_fix.cjs` (subject of two CI
suppression PRs — delete it instead), `auth_dashboard_overview.png`, `dashboard_overview.png`,
`integrations_page.png`, `Updated Grant Plan 03-11-2026.txt`, `apex-manifesto.html`,
`patch_docs.py`. Also `next-action.md` references PR #1313 (long merged) — stale.

Platform connector note: `.mcp.json` registers the Supabase MCP server **read-only**
(project `rtopreovkywofgwgmozi`) — correct least-privilege posture; requires per-session OAuth.

---

## 8. Prioritized Action Plan

| P | Action | Evidence |
|---|---|---|
| **P0** | Merge **PR #1354** (or regenerate `bun.lock`) → unblocks `integration-harness` | §3.1 |
| **P0** | Run `shadow-certification-preflight.mjs` in the certification job (or treat disabled shadow as `skipped`) → unblocks release certification | §3.2 |
| **P0** | Verify `GH_PAT` secret availability for push-triggered integration runs | §3.1 |
| **P1** | Bump Node-20-pinned actions before the 2026-06-16 forced migration | §3.4 |
| **P1** | Declare one canonical package manager for CI; remove the other lockfile(s) from gate paths | §3.3 |
| **P1** | Fix `AuthContext` session-hydration race | §5 |
| **P1** | Review major-version dependabot PRs #1359 (hardhat 3), #1363 (wagmi 3), #1362 (capacitor 8) — do not auto-merge | §2 |
| **P2** | Decompose `OmniDashShell.tsx` (1,697), `Home.tsx` (1,032), `OmniPort.ts` (1,130) per 600-line protocol; align governance cap (1,000) with the documented 600 | §5 |
| **P2** | Raise orchestrator pytest gate from 55% toward the 70% JS parity | §6 |
| **P2** | Add SSE retry/backoff + migration-rollback scenario tests | §5, §6 |
| **P3** | Root hygiene sweep (delete `scratch_fix.cjs`, archive binaries/screenshots, refresh `next-action.md`) | §7 |
| **P3** | Audit 46 skipped/TODO tests; close PR #1352/#1355 by merging or superseding | §6 |

---

*Audit conducted via live GitHub API (PRs, issues, releases, workflow runs, failure logs) and
direct code trace of `src/`, `apps/`, `supabase/`, `orchestrator/`, `packages/`, `terraform/`,
`contracts/`, `.github/workflows/`, and `tests/`.*
