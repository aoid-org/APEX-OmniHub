---
version: 1.1.0
last_audited: 2026-06-14
status: verified
---
> **Historical Note:** This document contains legacy certification terminology. It has been superseded by the manual owner-approval process. CI now produces factual validation summaries only. CI validates. Owner certifies.

# APEX-OmniHub — Comprehensive Repository Status Report

**Date:** 2026-06-09 (v1.1 — re-assessed; every load-bearing claim re-verified against code/logs)
**Scope:** Full remote-state + deep code trace audit (frontend, backend/data, CI/CD, security, governance)
**Method:** Direct trace of code, migrations, workflows, live GitHub state, and CI failure logs — not document review.
**Baseline commit:** `102ad20` (main tip at audit time) | **Latest release:** `v1.7.0` (2026-05-31)

> **v1.1 corrections after claim-by-claim re-verification:** (1) The two failing workflows
> share a SINGLE root cause — `bun.lock` drift from PR #1351 — now **fixed on this branch**
> (`c65a572`); the certification job's missing `shadow-preflight.json` was a downstream
> symptom, not the cause. (2) Migrations: **86**, not 91. (3) RLS statements verified:
> 224 `CREATE POLICY` + 103 `ENABLE ROW LEVEL SECURITY` (earlier "550+" was inflated).
> (4) Governance line cap is **500 (stricter than the 600 protocol), fail-closed, with a
> documented 31-path grandfather baseline** — oversized files are explicitly exempted, not
> passing silently. (5) AuthContext "race" downgraded: it is the canonical supabase-js v2
> init pattern; both writers derive from the same client state (low risk, no fix warranted).
> (6) Test skip/only markers: 50, not 46.

---

## 1. Executive Verdict

**Overall: PRODUCTION-GRADE PLATFORM. THE TWO ACTIVE P0 CI FAILURES SHARE ONE ROOT CAUSE —
A STALE `bun.lock` FROM PR #1351 — WHICH IS FIXED ON THIS BRANCH (`c65a572`).**

The platform is architecturally mature: 30 production Supabase edge functions, 86 versioned
migrations with hardened RLS (224 `CREATE POLICY` + 103 `ENABLE ROW LEVEL SECURITY`
statements), a pure Temporal worker with CI-enforced boundary purity, a real CDK/Terraform
infrastructure layer, and ~250 substantive test files behind enforced coverage thresholds.
This is not scaffolding — the code traced is real.

Until the lockfile fix merges, **main is not green**: `integration-harness` and
`Clean-Room Final Certification` fail on every push, the release pipeline cannot certify a
new release cut, and `deploy-production-cf-direct` carries the same latent failure. The
codebase also exceeds the 600-line modularity protocol in 8 files — all explicitly
grandfathered in the governance exemption baseline (§5).

| Dimension | Status |
|---|---|
| Remote main CI health | 🔴 2 persistent failures per push — single root cause, fix committed (§3) |
| Release pipeline | 🟡 Fails at dependency install; SBOM upload path works; verdict `NOT_CERTIFIED_NO_RELEASE_CUT` |
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

## 3. P0 — Active CI Failures on Main (Root-Caused from Logs, Reproduced Locally, Fixed)

### 3.1 Single root cause: stale `bun.lock` committed by PR #1351
PR #1351 (`4af90fb`) added `@upstash/ratelimit@^2.0.8` and `@upstash/redis@^1.35.3` to
`package.json` devDependencies but committed a `bun.lock` that does not contain them. Every
`bun install --frozen-lockfile` since then fails with
`error: lockfile had changes, but lockfile is frozen`. **Reproduced locally byte-for-byte,
then verified fixed** — after regeneration, `bun install --frozen-lockfile --ignore-scripts`
passes clean (2,471 installs across 2,136 packages, no changes).

Three workflows run this command and are all resolved by the one 6-line lockfile sync
(commit `c65a572` on this branch):

| Workflow | Failure mode |
|---|---|
| `integration.yml` (integration-harness) | Fails at install, every main push (run 27224843139) |
| `release.yml` (Clean-Room Final Certification) | Fails at install step (log line: `bun install --frozen-lockfile` → exit 1, run 27224843242/job 80389119814) |
| `deploy-production-cf-direct.yml:120` | **Latent** — same command; would fail on next manual production deploy |

### 3.2 Certification failure mechanics (corrected from v1.0)
The v1.0 report attributed the certification failure to the evidence writer not running the
shadow preflight. **That was wrong.** `release.yml:67` does run
`scripts/ci/shadow-certification-preflight.mjs` unconditionally — but the job dies earlier at
the line-39 frozen install, so the preflight never executes; the evidence writer (`if:
always()`) then correctly reports `shadow-preflight.json` ENOENT and fail-closes with
`NOT_CERTIFIED_NO_RELEASE_CUT`. The fail-closed evidence design worked as intended; the
input failure was upstream. Separately (informational, not a failure cause): the
terraform-plan / atomic-routing-flip path is intentionally disabled via hardcoded
`'false' == 'true'` gates at `release.yml:131/149`.

**PR #1354** (removes `--frozen-lockfile` from integration.yml) is now **superseded** by the
lockfile sync and should be closed — dropping the flag would have masked the drift and
weakened install reproducibility rather than fixing it.

### 3.3 Residual risk: `GH_PAT` and lockfile triplication
- The integration-harness job log shows `env: GH_PAT:` **empty** on the `sbbl-hq` sibling
  clone (set secrets render as `***`). The clone succeeded regardless; verify the secret is
  populated for push-triggered runs before relying on authenticated harness paths.
- Three lockfiles coexist at root: `bun.lock` (440 KB), `package-lock.json` (932 KB),
  `deno.lock` (628 KB). Bun- and npm-based workflows resolve against different trees — the
  systemic source of this failure class (#1353/`ea99829`, #1354, and this incident).
  **One package manager should be declared canonical per runtime, and lockfile freshness
  should be gated in CI** (a cheap `bun install --frozen-lockfile` check on PRs touching
  `package.json` would have caught #1351 at review time).

### 3.4 Platform deprecation deadline
GitHub Actions warns on every run: Node 20 actions forced to Node 24 starting
**2026-06-16 (7 days away)**. Pinned actions (`actions/checkout`, `setup-node`,
`upload-artifact` SHAs) should be bumped this week.

---

## 4. Backend & Data Layer (Traced)

- **Supabase:** 30 edge functions; flagship `omnilink-port` (1,364 lines, 64 auth checks,
  105 error handlers), `trigger-workflow` (582), `byom-cockpit` (572), `web3-verify` (501).
  Real production code, not stubs.
- **Migrations:** 86 spanning Mar 2024 → Jun 2026. Migration `20260608` resolved all
  Supabase Security Advisor warnings (lints 0011/0014/0024): extensions moved out of
  `public`, `search_path` locked on triggers, permissive policies re-scoped.
- **RLS:** `auth.uid() = user_id` pattern across user-data tables; 224 `CREATE POLICY` and
  103 `ENABLE ROW LEVEL SECURITY` statements in migration history (verified counts);
  service-role usage documented and confined to admin paths
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
- **Auth init (`src/contexts/AuthContext.tsx:76-115`) — downgraded from v1.0's "critical
  race":** the listener-then-`getSession()` sequence is the canonical supabase-js v2
  initialization pattern. Both writers read the same client state, so a late `getSession()`
  resolution returns the *current* session, not a stale one; worst case is a redundant
  identical state write. Verified low-risk — **no code change warranted** (changing working
  canonical auth code would be churn, not hardening).
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

Note (corrected from v1.0): the apex-governance CI gate enforces a **500-line** cap —
*stricter* than the documented 600-line protocol — fail-closed via
`governance/ci/apex-policy.config.json` (`max_module_lines: 500`). All eight files above
appear in the config's 31-path `size_exempt_paths` grandfather baseline, i.e. the debt is
explicitly tracked, not passing silently. New files cannot exceed 500 lines; the remediation
path is to shrink baselined files and delete their exemption entries as they're refactored.

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
- **Gaps:** 50 `skip`/`only`/todo markers in tests (verified count); integration tests
  excluded from CI vitest run; Playwright suite is smoke-only; no migration-rollback
  scenario tests; pre-commit hook is a single grep (no lint/test).

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

| P | Action | Status / Evidence |
|---|---|---|
| **P0** | Sync `bun.lock` with #1351's upstash deps → unblocks `integration-harness`, `Clean-Room Final Certification`, and latent `deploy-production-cf-direct` | ✅ **FIXED** — commit `c65a572` on this branch; merge to main | 
| **P0** | Close **PR #1354** as superseded (dropping `--frozen-lockfile` would mask drift, not fix it) | §3.2 |
| **P0** | Verify `GH_PAT` secret availability for push-triggered integration runs | §3.3 |
| **P1** | Bump Node-20-pinned actions before the 2026-06-16 forced migration | §3.4 |
| **P1** | Add a PR-time `bun install --frozen-lockfile` freshness gate; declare one canonical package manager per runtime | §3.3 |
| **P1** | Review major-version dependabot PRs #1359 (hardhat 3), #1363 (wagmi 3), #1362 (capacitor 8) — do not auto-merge | §2 |
| **P2** | Decompose `OmniDashShell.tsx` (1,697), `Home.tsx` (1,032), `OmniPort.ts` (1,130); remove each from the governance `size_exempt_paths` baseline as it lands under 500 | §5 |
| **P2** | Raise orchestrator pytest gate from 55% toward the 70% JS parity | §6 |
| **P2** | Add SSE retry/backoff + migration-rollback scenario tests | §5, §6 |
| **P3** | Root hygiene sweep (delete `scratch_fix.cjs`, archive binaries/screenshots, refresh `next-action.md`) | §7 |
| **P3** | Audit 50 skipped/todo tests; resolve PR #1352/#1355 by merging or superseding | §6 |

*(Removed from v1.0 plan after re-verification: "fix AuthContext race" — canonical pattern,
no defect (§5); "run preflight in certification job" — preflight already runs at
`release.yml:67`; failure was the upstream install (§3.2).)*

---

*Audit conducted via live GitHub API (PRs, issues, releases, workflow runs, failure logs) and
direct code trace of `src/`, `apps/`, `supabase/`, `orchestrator/`, `packages/`, `terraform/`,
`contracts/`, `.github/workflows/`, and `tests/`.*

---

## 2026-06-14 Addendum — CI Green Campaign

**This report was accurate as of 2026-06-09. The following supersedes the CI failure section.**

The two P0 failures described in §3 (bun.lock drift) were resolved prior to this session. As of 2026-06-14, a new set of CI blockers existed:

### New blockers (2026-06-14, now resolved)

| ID | Root cause | Fix | PR |
|---|---|---|---|
| pyOpenSSL crash | `pyOpenSSL <24.0.0` + `cryptography >=42.0.0` — `lib.GEN_EMAIL` removed; 10 pytest collection errors, runs #878–#897 all red | `pyopenssl>=24.0.0` → `orchestrator/requirements.txt` | #1392 |
| SSRF IPv4-mapped | `_check_ip()` hit `is_reserved` before `ipv4_mapped`; Python classifies `::ffff:0:0/96` as reserved — blocked public addresses, wrong error category for private | Move `ipv4_mapped` guard first in `_check_ip()` | #1393 |
| Routing-flip hardcoded | `ENABLE_ATOMIC_ROUTING_FLIP` hardcoded to `'false'` in 4 places in `release.yml` | Read from `vars.ENABLE_ATOMIC_ROUTING_FLIP` | #1391 |

All three merged 2026-06-14. CI run #900 (SHA `16f06b6f`) in_progress at time of this update.

**For current status see:** `docs/CURRENT_PLATFORM_STATE_2026_06_14.md`

