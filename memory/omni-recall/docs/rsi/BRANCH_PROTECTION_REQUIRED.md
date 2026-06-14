---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# RSI Branch Protection Required

## Status Summary

For the current tree audited on 2026-05-16, RSI is live in the repository: `policy/rsi-policy.yaml` declares `mode: live`, `docs/rsi/README.md` documents the live pull-request gate, and `.github/workflows/rsi-governance.yml` runs the RSI governance job for pull requests to `main` and `master` plus manual dispatch.

Branch-protection enforcement is still a repository-admin configuration surface. The repo documents the required check name and the admin follow-up, but this file does not claim that the GitHub branch-protection setting is already enabled in the hosted repository.

## What Is Confirmed by the Current Tree

- `policy/rsi-policy.yaml` is the RSI policy file and is in `mode: live`.
- `.github/workflows/rsi-governance.yml` exists and defines the active **RSI Governance Gate** workflow/job.
- `.github/workflows/rsi-governance-gate.yml` also exists, but its single step says the component is not yet active and passes; do not treat that placeholder workflow as the primary RSI implementation.
- `docs/rsi/README.md` identifies the branch-protection check to add as **`RSI Governance Gate / rsi-governance`**.
- `docs/onboarding/BRANCH_PROTECTION.md` documents branch protection as a GitHub admin configuration task for `main`.

## What Remains Manual

- Repository admins must configure or verify branch protection in GitHub settings.
- Repository admins must ensure **`RSI Governance Gate / rsi-governance`** is included where RSI is required as a protected status check.
- Repository admins must keep `docs/onboarding/BRANCH_PROTECTION.md`, `docs/rsi/README.md`, and `policy/rsi-policy.yaml` aligned when required-check names change.

## Admin Follow-Up Steps

1. Review `docs/rsi/README.md` before changing RSI branch-protection settings.
2. Review `docs/onboarding/BRANCH_PROTECTION.md` before changing the `main` branch protection rule.
3. In GitHub branch protection, add or verify the documented RSI required check: **`RSI Governance Gate / rsi-governance`**.
4. Keep the non-RSI required checks aligned with the current branch-protection and CI-status docs.
5. After any RSI workflow rename, update this document and `docs/rsi/README.md` in the same PR.

## Evidence Sources

- `docs/rsi/README.md`
- `policy/rsi-policy.yaml`
- `.github/workflows/rsi-governance.yml`
- `.github/workflows/rsi-governance-gate.yml`
- `docs/onboarding/BRANCH_PROTECTION.md`
