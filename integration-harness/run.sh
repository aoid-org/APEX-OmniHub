#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

[[ -f .env ]] && { set -a; source .env; set +a; }
[[ -f .env.local ]] && { set -a; source .env.local; set +a; }
[[ -f .env.integration ]] && { set -a; source .env.integration; set +a; }
OMNIHUB_URL="${OMNIHUB_URL:-${OMNIHUB_BASE_URL:-http://localhost:5173}}"
SBBL_URL="${SBBL_URL:-${SBBL_BASE_URL:-http://localhost:8787}}"
OMNIHUB_REPO="${OMNIHUB_REPO:-..}"
SBBL_REPO="${SBBL_REPO:-../sbbl-hq}"
HEADLESS="${HEADLESS:-true}"
SERVICE_BOOT_TIMEOUT="${SERVICE_BOOT_TIMEOUT:-60000}"
BOOT_TIMEOUT_SEC=$(( SERVICE_BOOT_TIMEOUT / 1000 ))
OMNIHUB_PID=""; SBBL_PID=""

EXTRA_ARGS=(); SPEC_FILTER=""
while [[ $# -gt 0 ]]; do case $1 in --headed) HEADLESS=false; shift ;; --spec) SPEC_FILTER="$2"; shift 2 ;; *) EXTRA_ARGS+=("$1"); shift ;; esac; done
for cmd in node npm curl; do command -v "$cmd" >/dev/null || { echo "missing $cmd"; exit 1; }; done
[[ ! -d node_modules ]] && { npm install --ignore-scripts --silent; npx --ignore-scripts playwright install chromium --with-deps; }

set_alias() {
  local target="$1"; shift
  [[ -n "${!target:-}" ]] && return 0
  for alias in "$@"; do
    [[ -n "${!alias:-}" ]] && { export "$target=${!alias}"; return 0; }
  done
}
require_env(){ local k="$1"; [[ -n "${!k:-}" ]] || { echo "Missing required env: $k"; return 1; }; }
wait_for_url(){ local url="$1" elapsed=0; while ! curl -fs -o /dev/null "$url"; do sleep 2; elapsed=$((elapsed+2)); [[ $elapsed -ge $BOOT_TIMEOUT_SEC ]] && { echo "timeout: $url"; exit 1; }; done; }
cleanup(){ [[ -n "$OMNIHUB_PID" ]] && kill "$OMNIHUB_PID" 2>/dev/null || true; [[ -n "$SBBL_PID" ]] && kill "$SBBL_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

# Fail fast for integration prerequisites before waiting on HTTP timeouts.
[[ -d "$OMNIHUB_REPO" ]] || { echo "OmniHub repo not found at $OMNIHUB_REPO"; exit 1; }
[[ -d "$SBBL_REPO" ]] || { echo "SBBL repo not found at $SBBL_REPO"; exit 1; }
set_alias SBBL_SUPABASE_URL SUPABASE_URL
set_alias SBBL_SUPABASE_ANON_KEY SUPABASE_ANON_KEY
require_env SBBL_SUPABASE_URL
require_env SBBL_SUPABASE_ANON_KEY
set_alias INTEGRATION_PPV_GAME_ID TEST_PPV_GAME_ID
set_alias INTEGRATION_PPV_ACCESS_CODE TEST_PPV_ACCESS_CODE
require_env INTEGRATION_ADMIN_EMAIL
require_env INTEGRATION_ADMIN_PASSWORD
require_env INTEGRATION_FAN_EMAIL
require_env INTEGRATION_FAN_PASSWORD

run_public_env() {
  # Child dev servers do not need CI credentials; pass only public runtime configuration.
  env -i \
    HOME="${HOME:-}" \
    PATH="$PATH" \
    CI="${CI:-}" \
    NODE_ENV="${NODE_ENV:-development}" \
    OMNIHUB_URL="$OMNIHUB_URL" \
    OMNIHUB_BASE_URL="$OMNIHUB_URL" \
    SBBL_URL="$SBBL_URL" \
    SBBL_BASE_URL="$SBBL_URL" \
    SBBL_SUPABASE_URL="$SBBL_SUPABASE_URL" \
    SBBL_SUPABASE_ANON_KEY="$SBBL_SUPABASE_ANON_KEY" \
    OMNIHUB_SUPABASE_URL="${OMNIHUB_SUPABASE_URL:-}" \
    OMNIHUB_SUPABASE_ANON_KEY="${OMNIHUB_SUPABASE_ANON_KEY:-}" \
    "$@"
}

if ! curl -fs -o /dev/null "$OMNIHUB_URL"; then
  (cd "$OMNIHUB_REPO" && run_public_env npm --ignore-scripts run dev >/tmp/omnihub-dev.log 2>&1) &
  OMNIHUB_PID=$!
  wait_for_url "$OMNIHUB_URL"
fi

if ! curl -fs -o /dev/null "$SBBL_URL"; then
  (cd "$SBBL_REPO" && run_public_env npx --ignore-scripts wrangler dev --port 8787 >/tmp/sbbl-dev.log 2>&1) &
  SBBL_PID=$!
  wait_for_url "$SBBL_URL"
fi

PLAYWRIGHT_ARGS=("--reporter=list,html" "--output=playwright-results")
[[ -n "$SPEC_FILTER" ]] && PLAYWRIGHT_ARGS+=("--grep=$SPEC_FILTER")
export HEADLESS
npx playwright test "${PLAYWRIGHT_ARGS[@]}" "${EXTRA_ARGS[@]}"
