---
version: 1.8.1
created: 2026-06-21
last_audited: 2026-06-21
status: release-cut — PENDING CERTIFICATION
supersedes: RELEASE_NOTES_v1.8.0.md
---

# Release Notes — v1.8.1

> **Status: RELEASE CUT — PENDING CERTIFICATION (2026-06-21).**
> This version has been **cut** (`package.json` 1.8.0 → 1.8.1 via `changeset version`)
> but is **not yet CERTIFIED**. Per `docs/project-status/CI_STATUS_POLICY.md`, a
> version is only "released/certified" once `release-evidence.json` emits `CERTIFIED`.
> v1.8.1 exists specifically to re-arm the certification pipeline that failed under
> v1.8.0 for infrastructure (not application) reasons.

## Summary

v1.8.1 is a **patch** release whose sole content is the release-promotion
infrastructure fix that unblocks the atomic routing-flip certification path. It
carries no application/runtime behavior change over v1.8.0.

## Highlights

### Patch (release infrastructure)
- **HCP Terraform org corrected** — `terraform/environments/production/main.tf`
  now targets organization **`APEX-OmniHub`** (was the non-existent `omnihub`).
  The `omnihub-production` workspace auto-creates on first `terraform init`.
- **`TF_PROD_TOKEN` wired end-to-end** — `release.yml` and
  `scripts/ci/shadow-certification-preflight.mjs` now use the `TF_PROD_TOKEN`
  secret (set at repo + `production-shadow` scopes) instead of the non-existent
  `TF_TOKEN`. CI exposes it as `TF_TOKEN_app_terraform_io`.

See `docs/APEX_AGENT_OPERATIONS.md` §9.3–§9.4 for the operational detail.

## Why a patch instead of re-running v1.8.0

The v1.8.0 cert run failed at **Terraform Plan** (`org "omnihub" … unauthorized`)
— a pipeline/infra defect, not a code defect. The fix landed on `main` after the
v1.8.0 release-cut commit, so the certification path (which only runs on a
`chore: version packages` HEAD) needed a fresh, honest release cut to execute
against a tree containing the fix. v1.8.1 is that cut.

## Path to certification

1. Merge this release-cut commit to `main` (rebase, preserving the
   `chore: version packages` subject) → `release.yml` fires with
   `release_cut=true`.
2. Shadow deploy → health check → deterministic validator → **Terraform Plan**
   (now authenticates) → pause at the `production-shadow` approval gate.
3. Gate approved → `terraform apply` atomic routing flip →
   `release-evidence.json` emits **`CERTIFIED`**.
