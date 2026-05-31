#!/usr/bin/env bash
# ============================================================
# APEX OmniHub — Cloudflare Pages Environment Variable Setter
# Run this script to set production Supabase env vars in CF Pages.
#
# Prerequisites:
#   export CF_API_TOKEN=<your-cloudflare-api-token>
#   export CF_ACCOUNT_ID=<your-cloudflare-account-id>
#   export CF_PAGES_PROJECT=<your-cf-pages-project-name>   # production: "apex-omnihub" (NOT "omnihub" — that project does not exist)
#   export SUPABASE_ANON_KEY=<your-supabase-anon-key>
#   export SUPABASE_URL=<your-supabase-url>
# ============================================================
set -euo pipefail

: "${CF_API_TOKEN:?CF_API_TOKEN must be set}"
: "${CF_ACCOUNT_ID:?CF_ACCOUNT_ID must be set}"
: "${CF_PAGES_PROJECT:?CF_PAGES_PROJECT must be set}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY must be set}"
: "${SUPABASE_URL:?SUPABASE_URL must be set}"

# Guard: "omnihub" is NOT a real Cloudflare Pages project. The production
# project serving apexomnihub.icu is "apex-omnihub". Refuse the known-bad value.
if [[ "${CF_PAGES_PROJECT}" == "omnihub" ]]; then
  echo "ERROR: CF_PAGES_PROJECT=\"omnihub\" does not exist as a CF Pages project." >&2
  echo "       Use \"apex-omnihub\" (production) or \"apex-omnihub-shadow\" (shadow)." >&2
  exit 1
fi

BASE="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}"

echo "Setting Cloudflare Pages env vars for project: ${CF_PAGES_PROJECT}"

# Patch the project with deployment_configs containing env vars
curl -s -X PATCH "$BASE" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"deployment_configs\": {
      \"production\": {
        \"env_vars\": {
          \"VITE_SUPABASE_URL\": { \"value\": \"${SUPABASE_URL}\" },
          \"VITE_SUPABASE_PUBLISHABLE_KEY\": { \"value\": \"${SUPABASE_ANON_KEY}\" },
          \"VITE_SUPABASE_ANON_KEY\": { \"value\": \"${SUPABASE_ANON_KEY}\" }
        }
      },
      \"preview\": {
        \"env_vars\": {
          \"VITE_SUPABASE_URL\": { \"value\": \"${SUPABASE_URL}\" },
          \"VITE_SUPABASE_PUBLISHABLE_KEY\": { \"value\": \"${SUPABASE_ANON_KEY}\" },
          \"VITE_SUPABASE_ANON_KEY\": { \"value\": \"${SUPABASE_ANON_KEY}\" }
        }
      }
    }
  }" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if d.get('success'):
    print('✅ CF Pages env vars updated successfully.')
    print('   NEXT: Trigger a redeploy — CF Pages does NOT rebuild on env var changes alone.')
    print('   → Dashboard: Cloudflare Pages -> Deployments -> Retry latest deployment')
    print('   → OR: git commit --allow-empty -m \"fix: trigger rebuild\" && git push origin main')
else:
    print('❌ Failed:', json.dumps(d.get('errors', d), indent=2))
    sys.exit(1)
"
