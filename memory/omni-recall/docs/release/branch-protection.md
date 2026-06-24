> CI validates release readiness. Production certification is manual and owner-approved only.

---
version: 1.0.0
last_audited: 2026-06-16
status: verified
---

> CI validates release readiness. Production certification is manual and owner-approved only.

# APEX-OmniHub Branch Protection Configuration

This document specifies the exact required checks that must pass before any Pull Request can be merged into `main` or `master`. These checks are enforced via GitHub Branch Protection Rules.

## Required Status Checks

The following exact job names must be configured as required status checks in GitHub Repository Settings under **Settings → Branches → Branch Protection Rules**:

1. **RSI Governance Gate**
   - **Job ID / Name**: `rsi-governance` (defined in `.github/workflows/rsi-governance.yml`)
   - **Workflow Name**: `RSI Governance Gate`

2. **Architectural Boundary Enforcement**
   - **Job ID / Name**: `architectural-boundary-enforcement` (defined in `.github/workflows/ci-runtime-gates.yml`)
   - **Workflow Name**: `CI Runtime Gates`

3. **Terraform Expression Drift Gate**
   - **Job ID / Name**: `terraform-expression-drift-gate` (defined in `.github/workflows/ci-runtime-gates.yml`)
   - **Workflow Name**: `CI Runtime Gates`

4. **build-and-test**
   - **Job ID / Name**: `build-and-test` (defined in `.github/workflows/ci-runtime-gates.yml`)
   - **Workflow Name**: `CI Runtime Gates`

5. **Release**
   - **Job ID / Name**: `release` (defined in `.github/workflows/release.yml`)
   - **Workflow Name**: `Release Validation`

6. **Governance gate (required for branch protection)**
   - **Job ID / Name**: `governance-gate` (defined in `.github/workflows/apex-governance.yml`)
   - **Workflow Name**: `APEX Governance`
   - **Note**: This gate is fail-closed; policy, secret-scan, dependency-audit, SAST, and RFC architecture marker failures block merge.

## Scanner Mapping

The CI integrity scanner (`verify:ci-integrity`) validates that:

- Every job listed above exists in the respective workflow file.
- The names and IDs match exactly without branch-protection drift.
- Required workflows do not hide gate failures with unaudited `|| true` or `continue-on-error: true`.
- Verify scripts are not fake-pass placeholders.
- Unresolved merge-conflict markers are absent from text files in the repository.
- Duplicate job display names are not present across workflows.

## Manual GitHub Setup Required

> [!IMPORTANT]
> The following settings must be applied manually in GitHub repository settings. They cannot be enforced via code alone.

1. Navigate to **Settings → Branches → Branch Protection Rules** for `main` / `master`.
2. Enable **Require status checks to pass before merging**.
3. Add each job from the list above as a required status check.
4. Enable **Require branches to be up to date before merging**.
5. Enable **Do not allow bypassing the above settings**.
