#!/bin/bash
export GITHUB_TOKEN="ghp_YOUR_TOKEN_HERE"

# Ensure we are on main
if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
  echo "BRANCH_MISMATCH: Must be on main branch to initiate deployment. Current: $(git rev-parse --abbrev-ref HEAD). Run: git checkout main"
  exit 1
fi

# Idempotent branch creation/checkout
if git show-ref --verify --quiet refs/heads/release/skill-forge-v1; then
  git checkout release/skill-forge-v1 && git merge main --no-edit
else
  git checkout -b release/skill-forge-v1
fi

git add .
git commit -m "feat(skill-forge): v1.0 release - integrated token-gated skill engine" || true
git push -u origin release/skill-forge-v1

# Run the activation script
# node scripts/ops/activate_iron_dome.mjs $GITHUB_TOKEN
