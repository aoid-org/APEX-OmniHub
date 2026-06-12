---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# GitHub Admin Setup (Proposal)

| Field | Value |
|---|---|
| Document version | 1.2.0 |
| Last updated (UTC) | 2026-05-10 |
| Status | Proposal only (no fabricated admin state) |
| Target ruleset | `main-protection` |

## Target ruleset controls
- Require pull requests.
- Require CODEOWNERS review.
- Dismiss stale approvals after new commits.
- Require conversation resolution before merge.
- Require signed commits where available.
- Disallow force pushes.
- Disallow branch deletion.

## Required checks contract
Required checks must match `policy/rsi-policy.yaml` exactly to prevent branch protection drift.

## Environment protections
- `staging`: reviewer `@apexbusiness-systems`
- `production`: repo admin + `@apexbusiness-systems`; prevent self-review
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

## Change log
- **2026-05-10 (v1.2.0):** added explicit controls section and drift-prevention statement.
- **2026-05-10 (v1.1.0):** initial admin setup proposal published.
