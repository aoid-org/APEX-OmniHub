# Iron Dome Validation Checklist

## Q1: Does enforce() function include enforce_admins: true?

- [x] YES
- **Evidence**: `scripts/ops/activate_iron_dome.mjs` line 120: `enforce_admins: true` inside the payload object.

## Q2: Does fetchStatusChecks() call GitHub API (not hardcode contexts)?

- [x] YES
- **Evidence**: `scripts/ops/activate_iron_dome.mjs` line 16: `const response = await fetch(\`https://api.github.com/repos/${owner}/${repo}/commits/main/check-runs\`, ...)`

## Q3: Are git commands idempotent (safe to rerun)?

- [x] YES
- **Evidence**: `scripts/ops/deploy_iron_dome.sh` uses `git show-ref --verify --quiet` to check for branch existence before creating, and `|| true` after `git commit` to avoid failure if there are no changes.
