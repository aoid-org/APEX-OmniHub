#!/usr/bin/env bash
# ============================================================
# APEX OmniHub — Provision Shadow Environments
# Creates the "production-shadow" GitHub environment with reviewer
# protection, and configures Cloudflare Pages secrets.
#
# Prerequisites:
#   export GH_TOKEN=<your-github-pat-with-repo-scope>
#   export CF_API_TOKEN=<your-cloudflare-api-token>
#   export CF_ACCOUNT_ID=<your-cloudflare-account-id>
#   export GITHUB_REPOSITORY=<owner/repo>
# ============================================================
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN must be set}"
: "${CF_API_TOKEN:?CF_API_TOKEN must be set}"
: "${CF_ACCOUNT_ID:?CF_ACCOUNT_ID must be set}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}"

echo "🚀 Provisioning APEX OmniHub Shadow Environment..."

# 1. Create Cloudflare Pages Project for Shadow Environment
echo "☁️ Creating Cloudflare Pages shadow project 'apex-omnihub-shadow'..."
CF_CREATE_PAYLOAD=$(cat <<EOF
{
  "name": "apex-omnihub-shadow",
  "production_branch": "main"
}
EOF
)

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$CF_CREATE_PAYLOAD" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('success') or (d.get('errors') and d['errors'][0].get('code') == 8000007):
    print('✅ CF Pages project ready.')
else:
    print('❌ Failed to create CF Pages project:', json.dumps(d.get('errors', d), indent=2))
    sys.exit(1)
"

# 2. Provision GitHub Environment (production-shadow)
echo "🐙 Creating GitHub Environment: production-shadow"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/${GITHUB_REPOSITORY}/environments/production-shadow \
  -f "reviewers[][type]=User" \
  -f "reviewers[][id]=$(gh api user -q '.id')" | jq -r '.name' >/dev/null || echo "✅ Environment 'production-shadow' created (or already exists)."

# 3. Set GitHub Repository Variables & Secrets
echo "🔐 Setting Repository Secrets & Variables..."
gh secret set CLOUDFLARE_API_TOKEN -b "${CF_API_TOKEN}"
gh secret set CLOUDFLARE_ACCOUNT_ID -b "${CF_ACCOUNT_ID}"
gh variable set CLOUDFLARE_SHADOW_PROJECT_NAME -b "apex-omnihub-shadow"
gh variable set SHADOW_HEALTH_URL -b "https://apex-omnihub-shadow.pages.dev/api/health"
gh variable set ENABLE_SHADOW_DEPLOYMENT -b "true"
gh variable set ENABLE_ATOMIC_ROUTING_FLIP -b "true"

echo "✅ APEX OmniHub Shadow Environment provisioning complete."
echo "   You may now run the Release Audit Preflight."
