# Iron Dome Handover

## Overview

This feature implements strict branch protection for the `main` branch, ensuring that all code changes pass through required status checks and reviews.

## Components

- **Script**: `scripts/ops/activate_iron_dome.mjs` - The core logic for branch protection.
- **Deployment**: `scripts/ops/deploy_iron_dome.sh` - Helper script for identifying deployment and running the activation.
- **Validation**: `scripts/ops/iron_dome_validation.md` - Checklist proving the implementation meets requirements.

## Usage

1.  **Prerequisites**: Ensure you have a GitHub Personal Access Token (PAT) with `repo` scope.
2.  **Run Activation**:
    ```bash
    export GITHUB_TOKEN="your_pat_here"
    node scripts/ops/activate_iron_dome.mjs
    ```
    Or use the deployment script:
    ```bash
    bash scripts/ops/deploy_iron_dome.sh
    ```

## Emergency Procedures

### 🚨 Emergency Branch Protection Removal

**When to Use:**
- Critical production incident requiring immediate hotfix
- Build system failure blocking all merges
- Repository migration or restructuring

**Authorization Required:**
- Repository Admin access
- Approval from CTO or Technical Lead
- Incident ticket reference

**Procedure:**

#### Method 1: GitHub UI (RECOMMENDED)

1. **Navigate to Repository Settings**
   https://github.com/apexbusiness-systems/APEX-OmniHub/settings/branches

2. **Locate `main` Branch Protection**
   - Find "Branch protection rules" section
   - Click "Edit" next to `main` branch rule

3. **Remove Protection**
   - Scroll to bottom of page
   - Click "Delete rule"
   - Confirm deletion in modal

4. **Document Action**
   - Create incident ticket: `[EMERGENCY] Iron Dome Disabled - [REASON]`
   - Add comment with:
     - Who removed protection
     - Timestamp
     - Reason for removal
     - Expected duration
     - Re-activation plan

5. **Re-activate After Emergency**
   ```bash
   export GITHUB_TOKEN="your_admin_pat"
   node scripts/ops/activate_iron_dome.mjs
   ```

#### Method 2: GitHub CLI (Advanced)

```bash
# Install GitHub CLI if not present
# https://cli.github.com/

# Authenticate
gh auth login

# Remove branch protection
gh api \
  --method DELETE \
  -H "Accept: application/vnd.github.v3+json" \
  /repos/apexbusiness-systems/APEX-OmniHub/branches/main/protection

# Verify removal
gh api /repos/apexbusiness-systems/APEX-OmniHub/branches/main/protection \
  && echo "❌ Protection still active" \
  || echo "✅ Protection removed"
```

#### Method 3: GitHub REST API (Programmatic)

```bash
# Using curl with Personal Access Token
export GITHUB_TOKEN="your_admin_pat"
export REPO="apexbusiness-systems/APEX-OmniHub"

curl -X DELETE \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$REPO/branches/main/protection
```

### 📋 Post-Emergency Checklist

After emergency is resolved:

- [ ] Re-activate Iron Dome: `node scripts/ops/activate_iron_dome.mjs`
- [ ] Verify protection rules: Visit Settings → Branches
- [ ] Document incident in post-mortem
- [ ] Update emergency procedures if needed
- [ ] Notify team of protection restoration

### 🔍 Audit Trail

GitHub automatically logs all branch protection changes:

- **Location:** Settings → Audit log
- **URL:** https://github.com/organizations/apexbusiness-systems/settings/audit-log
- **Filter:** `action:protected_branch.*`

**Audit Events:**
- `protected_branch.create` - Protection enabled
- `protected_branch.destroy` - Protection removed
- `protected_branch.update` - Settings modified
