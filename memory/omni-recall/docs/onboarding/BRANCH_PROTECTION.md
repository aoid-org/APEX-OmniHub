---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v1.4.2 | LAST_UPDATED=2026-05-20 -->
# Branch Protection Configuration

## Required GitHub Settings

**Configure at:** GitHub → Settings → Branches → Add rule → `main`

### Protection Rules for `main`

| Setting | Value | Rationale |
|---------|-------|-----------|
| Require a pull request before merging | Enabled | No direct pushes to main |
| Required approving reviews | 1 | CTO approval on all changes |
| Dismiss stale reviews on new push | Enabled | Re-approval required after updates |
| Require review from CODEOWNERS | Enabled | Enforces CODEOWNERS routing |
| Require status checks to pass | Enabled | CI must be green |
| Required status checks | See list below | All CI gates must pass |
| Require branches to be up to date | Enabled | No stale merges |
| Require conversation resolution | Enabled | All review comments resolved |
| Restrict pushes that create matching refs | Enabled | |
| Allow force pushes | Disabled | Never — preserves audit trail |
| Allow deletions | Disabled | |

### Required Status Checks (must all pass before merge)

```
architectural-boundary-enforcement
build-and-test
security-gates
quality-gates
rls-posture-gate
ruff-gate
compliance/legal-drift-gate
compliance/claims-proof-gate
```

### Signed Commits

**Enable signed commit requirement:** GitHub → Settings → Branches → `main` → Require signed commits

**For contributors — enable commit signing:**
```bash
# Generate GPG key (if not already done)
gpg --full-generate-key

# Get key ID
gpg --list-secret-keys --keyid-format=long

# Add to Git config
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true

# Add public key to GitHub: Settings → SSH and GPG keys → New GPG key
gpg --armor --export YOUR_KEY_ID
```

Or use SSH signing (simpler):
```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

### Automated Setup Script

```bash
# Requires GitHub CLI (gh) and admin access
gh api repos/apexbusiness-systems/APEX-OmniHub/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["build-and-test","security-gates","quality-gates"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"require_code_owner_reviews":true,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```
