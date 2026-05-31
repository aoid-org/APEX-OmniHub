#!/usr/bin/env bash
# ============================================================
# APEX OmniHub — CF Pages Env Var Fix (One-Shot)
#
# Patches Cloudflare Pages production env vars with the correct
# Supabase credentials, then optionally triggers a redeploy.
#
# USAGE:
#   export CF_API_TOKEN=<cloudflare-api-token>
#   export CF_ACCOUNT_ID=<cloudflare-account-id>
#   export CF_PAGES_PROJECT=omnihub
#   export SUPABASE_ANON_KEY=<anon-jwt-from-supabase-dashboard>
#   bash scripts/fix-cf-pages-env.sh
#
# After running, trigger a redeploy:
#   git commit --allow-empty -m "fix: trigger cf pages rebuild" && git push
#
# Cloudflare credentials: Settings > API Tokens > Create Token
#   Required scope: Cloudflare Pages:Edit + Account:Read
# ============================================================
set -euo pipefail

: "${CF_API_TOKEN:?CF_API_TOKEN required (Cloudflare API token)}"
: "${CF_ACCOUNT_ID:?CF_ACCOUNT_ID required (Cloudflare Account ID)}"
: "${CF_PAGES_PROJECT:?CF_PAGES_PROJECT required (e.g. omnihub)}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY required (anon JWT from Supabase dashboard)}"

SUPABASE_URL="${SUPABASE_URL:-https://rtopreovkywofgwgmozi.supabase.co}"
BASE="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}"

echo "▶ Patching CF Pages env vars for project: ${CF_PAGES_PROJECT}"

RESPONSE=$(curl -s -X PATCH "${BASE}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"deployment_configs\": {
      \"production\": {
        \"env_vars\": {
          \"VITE_SUPABASE_URL\": { \"value\": \"${SUPABASE_URL}\" },
          \"VITE_SUPABASE_ANON_KEY\": { \"value\": \"${SUPABASE_ANON_KEY}\" },
          \"VITE_SUPABASE_PUBLISHABLE_KEY\": { \"value\": \"${SUPABASE_ANON_KEY}\" }
        }
      },
      \"preview\": {
        \"env_vars\": {
          \"VITE_SUPABASE_URL\": { \"value\": \"${SUPABASE_URL}\" },
          \"VITE_SUPABASE_ANON_KEY\": { \"value\": \"${SUPABASE_ANON_KEY}\" },
          \"VITE_SUPABASE_PUBLISHABLE_KEY\": { \"value\": \"${SUPABASE_ANON_KEY}\" }
        }
      }
    }
  }")

echo "${RESPONSE}" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    if d.get('success'):
        print('✅ CF Pages env vars patched.')
        print('   VITE_SUPABASE_URL              → set')
        print('   VITE_SUPABASE_ANON_KEY         → set')
        print('   VITE_SUPABASE_PUBLISHABLE_KEY  → set')
        print('')
        print('▶ Next: trigger redeploy')
        print('   git commit --allow-empty -m \"fix: trigger cf pages rebuild\" && git push')
    else:
        print('❌ FAILED:', json.dumps(d.get('errors', d), indent=2))
        sys.exit(1)
except Exception as e:
    print('Parse error:', e, '| Raw:', sys.stdin.read()[:200])
    sys.exit(1)
"
