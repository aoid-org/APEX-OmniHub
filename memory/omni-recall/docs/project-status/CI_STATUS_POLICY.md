---
version: 1.4.0
last_audited: 2026-06-30
status: verified
---

> CI validates release readiness. Production certification is manual and owner-approved only.

# CI Status Policy

## Authority

Current certification state is determined ONLY by:
1. Latest protected branch CI passing the required gates configured by branch protection/rulesets.
2. Current release evidence in `docs/release/release-validation-matrix.json`.
3. Owner/live validation evidence for any item still labeled `BLOCKED` or `REQUIRES_MANUAL_VALIDATION`.

## Forbidden

- Static or manually-set build/test/security/certification badges in README or docs.
- Claims of `VALIDATED`, `GO`, or full production certification based only on historical audits, local tests, or repo-visible files.
- Treating CI success as live-production proof.

## Required for Production VALIDATED / GO Status

All of the following must be true simultaneously:
- `ci-runtime-gates.yml` required jobs green on the protected branch.
- `orchestrator-ci.yml` required jobs green on the protected branch.
- `security-regression-guard.yml` required jobs green on the protected branch.
- `apex-governance.yml` required governance jobs green where branch protection requires them.
- `docs/release/release-validation-matrix.json` contains no unresolved `BLOCKED` or `REQUIRES_MANUAL_VALIDATION` production-certification items.
- Owner/live evidence exists for Cloudflare deployment/env, authenticated routes, OAuth/passkey where applicable, Supabase RLS/multi-tenant, payment/billing, PWA/mobile, performance/load, and branch-protection settings.

## Badge Policy

README badges must use GitHub Actions workflow badge URLs only:
```
https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/<workflow>.yml/badge.svg
```
Static `img.shields.io/badge/...` badges are forbidden for CI/security/test status claims.
The License badge is exempt (it is not a CI claim).

## Current CI / Certification State (repo-verified 2026-06-30)

Local audit branch: `work` at `7f498b6` after `git fetch --all --prune`. The repo contains **20** GitHub Actions workflow files. This documentation pass did **not** verify GitHub branch-protection settings or live Actions conclusions via admin/API evidence.

Current verdict: `NO_GO_FOR_FULL_PRODUCTION_CERTIFICATION__HARNESS_READY_LIVE_GAPS_HONEST`, matching `docs/release/release-validation-matrix.json`. CI can validate release readiness and attach evidence, but CI does not certify production and cannot create release tags.

## Workflow Registry (verified 2026-06-30)

The repository has **20** active GitHub Actions workflow files in `.github/workflows/`. `production-readiness.yml`, `dependency-review.yml`, and `security-guards.yml` are not present in the current tree; do not cite them as required active gates unless they are reintroduced and branch-protection evidence is attached.

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