#!/usr/bin/env bash
# CORS / ingress probe for the self-hosted Supabase auth endpoint.
#
# Usage:
#   SUPABASE_HOST=https://supabase.sbbl-hq.icu \
#   SITE_ORIGIN=https://sbbl-hq.icu \
#   ANON_KEY=<anon-key> \
#   bash scripts/debug/probe-cors-login.sh
#
# Or probe the local Kong gateway directly:
#   SUPABASE_HOST=http://localhost:8000 \
#   SITE_ORIGIN=https://sbbl-hq.icu \
#   ANON_KEY=<anon-key> \
#   bash scripts/debug/probe-cors-login.sh
#
# Exit codes:
#   0  CORS headers present on both OPTIONS and POST error response.
#   1  Missing CORS headers — see output for which layer is at fault.

set -euo pipefail

HOST="${SUPABASE_HOST:-https://supabase.sbbl-hq.icu}"
ORIGIN="${SITE_ORIGIN:-https://sbbl-hq.icu}"
KEY="${ANON_KEY:-}"
TOKEN_URL="${HOST}/auth/v1/token?grant_type=password"

RED=$'\033[0;31m'
GRN=$'\033[0;32m'
YLW=$'\033[0;33m'
NC=$'\033[0m'

pass() { echo "${GRN}PASS${NC}  $*"; }
fail() { echo "${RED}FAIL${NC}  $*"; }
info() { echo "${YLW}INFO${NC}  $*"; }

check_header() {
  local label="$1" headers="$2" name="$3" expected="$4"
  if echo "$headers" | grep -qi "$name:.*$expected"; then
    pass "$label — $name: $(echo "$headers" | grep -i "$name:" | head -1 | tr -d '\r')"
  else
    fail "$label — $name not found or wrong value. Got: $(echo "$headers" | grep -i "$name:" | head -1 | tr -d '\r' || echo '(absent)')"
    return 1
  fi
}

echo "=== CORS probe ==="
echo "  Host:   $HOST"
echo "  Origin: $ORIGIN"
echo ""

# ── 1. Health check ────────────────────────────────────────────────────────
info "Step 1: Health check"
HEALTH_RESP=$(curl -si --max-time 10 "${HOST}/auth/v1/health" 2>&1 || true)
HEALTH_STATUS=$(echo "$HEALTH_RESP" | head -1)
echo "  Status: $HEALTH_STATUS"
if echo "$HEALTH_RESP" | grep -qi "x-kong-request-id"; then
  pass "x-kong-request-id present — Kong is processing requests"
else
  fail "x-kong-request-id absent — Kong is NOT processing requests (tunnel/stack may be down)"
fi
echo ""

# ── 2. OPTIONS preflight ───────────────────────────────────────────────────
info "Step 2: OPTIONS preflight"
OPTIONS_RESP=$(curl -si --max-time 10 -X OPTIONS "$TOKEN_URL" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: apikey, authorization, content-type, x-client-info" \
  2>&1 || true)
echo "  Status: $(echo "$OPTIONS_RESP" | head -1)"
OPTIONS_PASS=0
check_header "OPTIONS" "$OPTIONS_RESP" "access-control-allow-origin" "" || OPTIONS_PASS=1
check_header "OPTIONS" "$OPTIONS_RESP" "access-control-allow-methods" "" || OPTIONS_PASS=1
echo ""

# ── 3. POST with bad credentials ──────────────────────────────────────────
info "Step 3: POST (intentionally bad credentials)"
if [ -z "$KEY" ]; then
  info "ANON_KEY not set — skipping POST probe (set ANON_KEY env var to enable)"
  POST_PASS=1
else
  POST_RESP=$(curl -si --max-time 10 -X POST "$TOKEN_URL" \
    -H "Origin: $ORIGIN" \
    -H "apikey: $KEY" \
    -H "authorization: Bearer $KEY" \
    -H "content-type: application/json" \
    -H "x-client-info: supabase-js-web" \
    --data '{"email":"probe@example.invalid","password":"probe-bad-password-only"}' \
    2>&1 || true)
  echo "  Status: $(echo "$POST_RESP" | head -1)"
  POST_PASS=0
  check_header "POST" "$POST_RESP" "access-control-allow-origin" "" || POST_PASS=1
  # A properly configured endpoint returns JSON auth error, not HTML
  if echo "$POST_RESP" | grep -q "application/json\|text/json"; then
    pass "POST — response is JSON (not an HTML challenge page)"
  else
    fail "POST — response is not JSON. Possible Cloudflare challenge or proxy error page."
    POST_PASS=1
  fi
fi
echo ""

# ── Summary ────────────────────────────────────────────────────────────────
echo "=== Summary ==="
if [ "$OPTIONS_PASS" -eq 0 ] && [ "$POST_PASS" -eq 0 ]; then
  pass "CORS headers present on OPTIONS and POST. Login should work once credentials are valid."
  exit 0
else
  fail "CORS headers missing. Diagnosis:"
  if ! echo "$HEALTH_RESP" | grep -qi "x-kong-request-id"; then
    echo ""
    echo "  Likely cause: Cloudflare Tunnel cannot reach origin (localhost:8000)."
    echo "  On the host machine, verify:"
    echo "    1. cloudflared tunnel is running   (cloudflared tunnel list)"
    echo "    2. Docker stack is up               (docker compose ps)"
    echo "    3. Kong responds locally            (curl http://localhost:8000/auth/v1/health)"
    echo ""
    echo "  If stack is down:  docker compose up -d"
    echo "  If tunnel is down: cloudflared tunnel run <tunnel-name>"
  else
    echo ""
    echo "  Kong IS reachable. Root cause is Kong/GoTrue CORS config."
    echo "  Apply the CORS plugin to auth-v1 routes in volumes/api/kong.yml."
    echo "  Reload: docker compose up -d --force-recreate kong"
  fi
  exit 1
fi
