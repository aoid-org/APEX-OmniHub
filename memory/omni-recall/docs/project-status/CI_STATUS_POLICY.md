---
version: 1.2.0
last_audited: 2026-06-20
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

## Current CI State (verified 2026-06-20)

PR #1435 (HEAD `0eff5a6c`) — **43 success / 3 skipped / 0 failed**. `main` is GREEN.

Key checks passed: `build-and-test`, `Operations doc drift guard` (new), SonarCloud QG passed, ruff-gate, all orchestrator gates.

Verdict: `NOT_CERTIFIED_NO_RELEASE_CUT` (package is `1.7.1`, version bump only — no release cut yet).

### Prior CI State (2026-06-14, preserved)

Run #906 (ID `27500918710`) on SHA `873de83c` — **conclusion: success**. All 5 `verify:release` gates green:
- `verify:ci-integrity` ✅
- `verify:types` ✅ (0 TypeScript errors)
- `verify:test` ✅ (2,660 tests passed)
- `verify:build` ✅
- `verify:claim-hygiene` ✅ (new gate — 0 unproven claims)

## Workflow Registry (updated 2026-06-20)

The repository has **23** active GitHub Actions workflows. Notable additions since 2026-05-20:
- `rsi-governance.yml` — **active RSI governance workflow (live mode)**
- `rsi-governance-gate.yml` — pass-through placeholder (not the live gate)
- `ops-doc-guard.yml` — **Ops Doc Drift Guard** — added PR #1435 (2026-06-20); fails PRs that change runtime-contract paths without updating `docs/APEX_AGENT_OPERATIONS.md`

## Coverage Thresholds (verified 2026-05-20)

Current Vitest coverage thresholds (vitest.config.ts):

| Metric | Threshold | Notes |
|---|---|---|
| Lines | 80% | |
| Functions | 80% | |
| Branches | 80% | |
| Statements | 80% | |