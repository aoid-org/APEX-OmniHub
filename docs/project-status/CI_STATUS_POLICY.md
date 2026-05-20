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

## Workflow Registry (verified 2026-05-20)

The repository has 21 active GitHub Actions workflows. RSI-related workflows:
- `rsi-governance.yml` — **active RSI governance workflow (live mode)**
- `rsi-governance-gate.yml` — pass-through placeholder (not the live gate)

## Coverage Thresholds (updated 2026-05-20)

Current Vitest coverage thresholds (vitest.config.ts):

| Metric | Threshold | North-Star Target |
|---|---|---|
| Statements | 70 | — |
| Branches | 63 | 80% |
| Functions | 72 | — |
| Lines | 71 | — |

Previous thresholds (pre-2026-05-20): statements 69, branches 60, functions 71, lines 70.

## Enforcement

This policy is enforced by:
- Code review: Reviewers must reject PRs that add static CI/certification badges
- Docs drift reconciliation: run periodically as part of production certification hardening

## CI Security Requirements (updated 2026-05-20)

All GitHub Actions workflows MUST:
- Pin third-party actions to commit SHAs (never floating tags like `@v4`)
- Use `node-version: '24'` to match engines constraint `>=22 <25`
- Never embed secrets (GH_PAT, tokens) in git clone URLs — use `git config url.insteadOf`
- Auto-merge workflows must gate on `mergeable_state === 'clean'` before merging

## Last Updated

2026-05-20
