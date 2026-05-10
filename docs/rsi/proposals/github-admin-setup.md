# GitHub Admin Setup (Proposal)

## Target repository ruleset
- Ruleset name: `main-protection`
- Require pull requests.
- Require CODEOWNERS reviews.
- Dismiss stale approvals on new commits.
- Require conversation resolution before merge.
- Require signed commits if available.
- Disallow force pushes.
- Disallow branch deletion.
- Require these checks:
  - Architectural Boundary Enforcement
  - Terraform Expression Drift Gate
  - build-and-test
  - GitHub-native dependency review
  - Quality Gates
  - Security Gates
  - Smoke Tests
  - Production Readiness Summary
  - Scan for Exposed Secrets
  - Verify No .env Files
  - Scan Dependencies for Vulnerabilities
  - Security Invariant Checks
  - Dependency Security Audit
  - Code Quality Gates
  - Test & Lint
  - Security Scan
  - Build Docker Image
  - Lighthouse Audit

## Environments
- `staging` reviewers: `@apexbusiness-systems`
- `production` reviewers: repo admin + `@apexbusiness-systems`; prevent self-review
- `web3-production` reviewers: repo admin + security/platform reviewer
- `release-provenance` reviewers: release owner/admin

## Export current admin configuration (no fabricated values)
```bash
export GH_REPO="apexbusiness-systems/APEX-OmniHub"
gh api repos/$GH_REPO/rulesets
gh api repos/$GH_REPO/branches/main/protection
gh api repos/$GH_REPO/environments
gh api repos/$GH_REPO/actions/permissions
```
