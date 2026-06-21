---
version: 1.3.0
last_audited: 2026-06-21
status: verified
---

# CI Status Policy

## Authority

Current certification state is determined ONLY by:
1. Latest `main` branch CI passing all required gates (see CLAUDE.md §6)
2. `release-evidence.json` artifact from the most recent release workflow run

## Forbidden

- Static or manually-set build/test/security/certification badges in README or docs
- Claims of "CERTIFIED" status in docs without a `release-evidence.json` artifact proving it
- Historical audit docs (even recent ones) are NOT current certification proof

## Required for CERTIFIED status

All of the following must be true simultaneously:
- `ci-runtime-gates.yml` → all jobs green on latest `main`
- `production-readiness.yml` → quality-gates + security-gates both green
- `orchestrator-ci.yml` → rls-posture-gate + ruff-gate + legal-drift-gate + claims-proof-gate green
- `release-evidence.json` artifact exists with `"final_verdict": "CERTIFICATION_PENDING_FINAL_MAIN_CI"` or `"CERTIFIED"`
- No open P0 blockers in `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md`

## Badge Policy

README badges must use GitHub Actions workflow badge URLs only:
```
https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/<workflow>.yml/badge.svg
```
Static `img.shields.io/badge/...` badges are forbidden for CI/security/test status claims.
The License badge is exempt (it is not a CI claim).

## Current CI State (verified 2026-06-21)

`main` HEAD is `966d695f` (PR #1441 — fix(omnidash): canonical widget rescue and global drift guards, merged 2026-06-21T04:39Z; verified `merged: true` via GitHub PR API). `main` is GREEN — PR #1441 merged under branch protection, which requires all required gates green.

| PR | Merge commit | Result |
|---|---|---|
| #1435 (APEX Agent restoration) | `4bbd3e5b` (squash; PR tip `0eff5a6c`) | 43 success / 3 skipped / 0 failed (46 total) — check-runs API 2026-06-20 |
| #1436 (omnidash modal contracts) | `6f859ec8` | 46 success / 3 skipped / 0 failed (49 total) — check-runs API 2026-06-20 |
| #1438 (VITE_ORCHESTRATOR_URL + CORS topology) | `c74a9a5f` | merged green under branch protection |
| #1439 (normalize live module action ids) | `d0ae10da` | merged green under branch protection |
| #1441 (canonical widget rescue + drift guards) | `966d695f` | merged green under branch protection; corrective-commit gates verified locally (typecheck/eslint/`vitest run tests/omnidash` 585 passed/build/ops-doc-guard) |

> Note: exact per-check tallies are quoted only where re-verified via the check-runs API. For #1438/#1439/#1441 the merge itself is the green signal (branch protection blocks non-green merges); they were not re-tallied check-by-check in this pass.

Verdict: `NOT_CERTIFIED_NO_RELEASE_CUT` (package is `1.7.1`; these were frontend/edge/docs changes, not a `chore: version packages` release cut — verdict unchanged from 2026-06-14).

### Prior CI State (2026-06-14, preserved)

Run #906 (ID `27500918710`) on SHA `873de83c` — **conclusion: success**. All 5 `verify:release` gates green:
- `verify:ci-integrity` ✅
- `verify:types` ✅ (0 TypeScript errors)
- `verify:test` ✅ (2,660 tests passed)
- `verify:build` ✅
- `verify:claim-hygiene` ✅ (new gate — 0 unproven claims)

## Workflow Registry (verified 2026-06-21)

The repository has **23** active GitHub Actions workflow files in `.github/workflows/` (verified 2026-06-21). Notable additions since 2026-05-20:
- `rsi-governance.yml` — **active RSI governance workflow (live mode)**
- `rsi-governance-gate.yml` — pass-through placeholder (not the live gate)
- `ops-doc-guard.yml` — **Ops Doc Drift Guard** — added PR #1435 (2026-06-20); fails PRs that change runtime-contract paths without updating `docs/APEX_AGENT_OPERATIONS.md`

## Coverage Thresholds (verified 2026-06-20 against `vitest.config.ts` on `main`)

Current Vitest coverage thresholds (the `coverage.thresholds` block in `vitest.config.ts`):

| Metric | Threshold |
|---|---|
| Statements | 70% |
| Branches | 63% |
| Functions | 72% |
| Lines | 71% |

> These are the enforced vitest gates (raised 2026-05-20 from measured actuals). **80%** is the
> separate SonarCloud quality-gate north-star target, not the vitest threshold — do not conflate them.
> Coverage runs opt-in only via `VITEST_COVERAGE=true` (`npm run test:coverage`).