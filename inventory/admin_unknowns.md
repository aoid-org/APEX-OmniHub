# Admin-only unknowns to export

Set repo context first:

```bash
export GH_REPO="apexbusiness-systems/APEX-OmniHub"
```

Export commands (do not assume values without admin execution):

```bash
gh api repos/$GH_REPO/rulesets
gh api repos/$GH_REPO/branches/main/protection
gh api repos/$GH_REPO/environments
gh api repos/$GH_REPO/actions/permissions
```
