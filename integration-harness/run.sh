#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

[[ -f .env ]] && { set -a; source .env; set +a; }
OMNIHUB_URL="${OMNIHUB_URL:-${OMNIHUB_BASE_URL:-http://localhost:5173}}"
SBBL_URL="${SBBL_URL:-${SBBL_BASE_URL:-http://localhost:8787}}"
OMNIHUB_REPO="${OMNIHUB_REPO:-../APEX-OmniHub}"
SBBL_REPO="${SBBL_REPO:-../sbbl-hq}"
HEADLESS="${HEADLESS:-true}"
SERVICE_BOOT_TIMEOUT="${SERVICE_BOOT_TIMEOUT:-60000}"
BOOT_TIMEOUT_SEC=$(( SERVICE_BOOT_TIMEOUT / 1000 ))
OMNIHUB_PID=""; SBBL_PID=""

EXTRA_ARGS=(); SPEC_FILTER=""
while [[ $# -gt 0 ]]; do case $1 in --headed) HEADLESS=false; shift ;; --spec) SPEC_FILTER="$2"; shift 2 ;; *) EXTRA_ARGS+=("$1"); shift ;; esac; done
for cmd in node npm curl; do command -v "$cmd" >/dev/null || { echo "missing $cmd"; exit 1; }; done
[[ ! -d node_modules ]] && { npm install --silent; npx playwright install chromium --with-deps --quiet; }

wait_for_url(){ local url="$1" elapsed=0; while ! curl -fs -o /dev/null "$url"; do sleep 2; elapsed=$((elapsed+2)); [[ $elapsed -ge $BOOT_TIMEOUT_SEC ]] && { echo "timeout: $url"; exit 1; }; done; }
cleanup(){ [[ -n "$OMNIHUB_PID" ]] && kill "$OMNIHUB_PID" 2>/dev/null || true; [[ -n "$SBBL_PID" ]] && kill "$SBBL_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

if ! curl -fs -o /dev/null "$OMNIHUB_URL"; then
  [[ -d "$OMNIHUB_REPO" ]] || { echo "OmniHub repo not found at $OMNIHUB_REPO"; exit 1; }
  (cd "$OMNIHUB_REPO" && npm run dev >/tmp/omnihub-dev.log 2>&1) &
  OMNIHUB_PID=$!
  wait_for_url "$OMNIHUB_URL"
fi

if ! curl -fs -o /dev/null "$SBBL_URL"; then
  [[ -d "$SBBL_REPO" ]] || { echo "SBBL repo not found at $SBBL_REPO"; exit 1; }
  (cd "$SBBL_REPO" && npx wrangler dev --port 8787 >/tmp/sbbl-dev.log 2>&1) &
  SBBL_PID=$!
  wait_for_url "$SBBL_URL"
fi

PLAYWRIGHT_ARGS=("--reporter=list,html" "--output=playwright-results")
[[ -n "$SPEC_FILTER" ]] && PLAYWRIGHT_ARGS+=("--grep=$SPEC_FILTER")
export HEADLESS
npx playwright test "${PLAYWRIGHT_ARGS[@]}" "${EXTRA_ARGS[@]}"
