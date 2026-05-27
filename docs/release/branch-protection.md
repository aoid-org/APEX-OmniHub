# APEX-OmniHub Branch Protection Configuration

This document specifies the exact required checks that must pass before any Pull Request can be merged into `main` or `master`. These checks are enforced via GitHub Branch Protection Rules.

## Required Status Checks

The following exact job names must be configured as required status checks in GitHub Repository Settings under **Settings > Branches > Branch Protection Rules**:

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
   - **Workflow Name**: `Release`

---

## Scanner Mapping

The CI integrity scanner (`verify:ci-integrity`) validates that:
- Every job listed above actually exists in the respective workflow files.
- The names and IDs match exactly without any drift.
