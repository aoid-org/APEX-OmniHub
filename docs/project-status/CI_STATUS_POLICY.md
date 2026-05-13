# CI Status Policy — APEX OmniHub

**Date:** 2026-05-13  
**Authority:** Principal Release Engineer + Security QA  
**Supersedes:** Any static CI badges, claims, or outdated status files

---

## Purpose

This document defines the single source of truth for APEX OmniHub's production certification status and CI gate requirements. Static badges are **forbidden**. Live CI status is the only authoritative claim.

---

## Production Certification Requires

1. **Latest `main` branch CI green**
   - All workflows in `.github/workflows/` must pass on the current `main` commit
   - Required gates: `ci-runtime-gates.yml` (architectural, build, test, security)
   - Required gates: `production-readiness.yml` (quality, security, docs)
   - Advisory gates: `security-regression-guard.yml`, SonarCloud
   - See [CI_RUNTIME_GATES.md](../infrastructure/CI_RUNTIME_GATES.md) for gate definitions

2. **Release evidence artifact**
   - `release-evidence.json` must be uploaded to GitHub Actions artifacts
   - Contains:
     - Commit SHA
     - Build status
     - Terraform plan artifact reference
     - Health check results
     - Validator results
     - Final verdict (NOT_CERTIFIED_BLOCKED | PENDING_APPROVAL | CERTIFIED)

3. **No fake deployment targets**
   - Real shadow deployment URL must be configured in secrets
   - Real health check endpoint must respond
   - Terraform plan artifact must exist before any apply
   - No local mock backends (e.g., `python -m uvicorn main:app` in CI)

4. **Zero high/critical vulnerabilities**
   - `npm audit --omit=dev --audit-level=high` must exit 0
   - TruffleHog v3.82.7+ must report zero verified secrets

---

## Live CI Authority

The current certification status is always determined by:

```
https://github.com/apexbusiness-systems/apex-omnihub/actions/workflows/ci-runtime-gates.yml?branch=main
```

Check this URL for the live status. No PR, document, or badge can override it.

---

## Certification Verdicts

| Verdict | Meaning | Action |
|---|---|---|
| `NOT_CERTIFIED_BLOCKED` | Blocker(s) prevent certification (real shadow secrets missing, CI gate failing, etc.) | Fix blocker, retest main CI. |
| `CERTIFICATION_PENDING_FINAL_MAIN_CI` | Local gates pass; waiting for main CI to complete or PR to merge. | Merge PR, wait for CI. |
| `CERTIFIED` | Latest `main` CI green + release evidence artifact present + no blockers. | Safe to run release workflow. |

---

## Historical Status Documents

Older docs (e.g., `PRODUCTION_STATUS.md`, `APEX_RELEASE_READINESS_REPORT.md`) are **historical only** and must reference this policy for current status. They are not authoritative.

---

## Stale Static Badges Are Forbidden

❌ No more:

```markdown
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-3584%2B%20pass-brightgreen)]()
[![Certified](https://img.shields.io/badge/certified-YES-gold)]()
```

✅ Only:

```markdown
[![CI Status](https://github.com/apexbusiness-systems/apex-omnihub/actions/workflows/ci-runtime-gates.yml/badge.svg?branch=main)](...)
```

---

## When This Policy Updates

- Bumped on each production release (automatic via CHANGELOG.md versioning)
- Updated when CI gates change
- Updated when release workflow procedure changes

Last verified: **2026-05-13**
