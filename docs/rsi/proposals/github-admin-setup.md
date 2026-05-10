# GitHub Admin Setup (Proposal)

- **Document version:** 1.1.0
- **Last updated (UTC):** 2026-05-10
- **Status:** Proposal only (no fabricated admin state)

## Target ruleset
- Name: `main-protection`
- Require pull requests
- Require CODEOWNERS review
- Dismiss stale approvals on new commits
- Require conversation resolution before merge
- Require signed commits if available
- Disallow force pushes
- Disallow branch deletion

## Required checks
Must align exactly with `policy/rsi-policy.yaml` required checks.

## Environment protections
- `staging`: reviewer `@apexbusiness-systems`
- `production`: repo admin + `@apexbusiness-systems`, prevent self-review
- `web3-production`: repo admin + security/platform reviewer
- `release-provenance`: release owner/admin

## Admin-state export commands
```bash
export GH_REPO="apexbusiness-systems/APEX-OmniHub"
gh api repos/$GH_REPO/rulesets
gh api repos/$GH_REPO/branches/main/protection
gh api repos/$GH_REPO/environments
gh api repos/$GH_REPO/actions/permissions
```
