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
DIVIDER="===================================================="

EXTRA_ARGS=(); SPEC_FILTER=""
while [[ $# -gt 0 ]]; do case $1 in --headed) HEADLESS=false; shift ;; --spec) SPEC_FILTER="$2"; shift 2 ;; *) EXTRA_ARGS+=("$1"); shift ;; esac; done

NODE_CMD="node"
for cmd in node npm curl; do
  if ! command -v "$cmd" >/dev/null && ! command -v "$cmd.exe" >/dev/null && ! command -v "$cmd.cmd" >/dev/null; then
    echo "missing $cmd"
    exit 1
  fi
done

if ! command -v node >/dev/null && command -v node.exe >/dev/null; then
  NODE_CMD="node.exe"
fi

[[ ! -d node_modules ]] && { npm install --ignore-scripts --silent; npx --ignore-scripts playwright install chromium --with-deps; }

set_alias() {
  local target="$1"; shift
  [[ -n "${!target:-}" ]] && return 0
  for alias in "$@"; do
    [[ -n "${!alias:-}" ]] && { export "$target=${!alias}"; return 0; }
  done
  return 0
}

print_group() {
  local title="$1"
  if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    echo "::group::$title"
    cat
    echo "::endgroup::"
  else
    echo "===== $title ====="
    cat
  fi
}

dump_file_tail() {
  local title="$1"
  local file="$2"

  if [[ -f "$file" ]]; then
    tail -200 "$file" | print_group "$title"
  else
    echo "$title missing: $file"
  fi
}

wait_for_url() {
  local url="$1"
  local pid="${2:-}"
  local log_file="${3:-}"
  local elapsed=0

  while ! curl -fs -o /dev/null "$url"; do
    sleep 2
    elapsed=$((elapsed+2))

    if [[ $elapsed -ge $BOOT_TIMEOUT_SEC ]]; then
      echo "$DIVIDER"
      echo "TIMEOUT: Failed to connect to $url after $elapsed seconds (boot timeout: ${BOOT_TIMEOUT_SEC}s)"
      echo "$DIVIDER"

      if [[ -n "$pid" ]]; then
        if kill -0 "$pid" 2>/dev/null; then
          echo "Process with PID $pid is still alive."
        else
          echo "Process with PID $pid is DEAD (exited)."
        fi
      fi

      if [[ -n "$log_file" && -f "$log_file" ]]; then
        echo "Last 50 lines of server log ($log_file):"
        tail -50 "$log_file"
      else
        echo "No server log file available."
      fi

      exit 1
    fi
  done
}

cleanup() {
  local status=$?

  if [[ $status -ne 0 ]]; then
    echo "===================================================="
    echo "integration-harness failed with exit code $status"
    echo "===================================================="
    echo "Diagnostics:"
    echo "  OMNIHUB_URL: ${OMNIHUB_URL:-}"
    echo "  SBBL_URL: ${SBBL_URL:-}"
    echo "  OMNIHUB_REPO: ${OMNIHUB_REPO:-}"
    echo "  SBBL_REPO: ${SBBL_REPO:-}"

    if [[ -n "${OMNIHUB_PID:-}" ]]; then
      if kill -0 "$OMNIHUB_PID" 2>/dev/null; then
        echo "  OMNIHUB_PID ($OMNIHUB_PID) status: ALIVE"
      else
        echo "  OMNIHUB_PID ($OMNIHUB_PID) status: DEAD"
      fi
    else
      echo "  OMNIHUB_PID: NOT_STARTED"
    fi

    if [[ -n "${SBBL_PID:-}" ]]; then
      if kill -0 "$SBBL_PID" 2>/dev/null; then
        echo "  SBBL_PID ($SBBL_PID) status: ALIVE"
      else
        echo "  SBBL_PID ($SBBL_PID) status: DEAD"
      fi
    else
      echo "  SBBL_PID: NOT_STARTED"
    fi

    dump_file_tail "OmniHub Dev Server Log" "/tmp/omnihub-dev.log"
    dump_file_tail "SBBL Wrangler Server Log" "/tmp/sbbl-dev.log"

    if [[ -d "playwright-report" ]]; then
      find playwright-report -type f | print_group "Playwright Report File List"
    fi
    if [[ -d "playwright-results" ]]; then
      find playwright-results -type f | print_group "Playwright Result File List"
    fi
  fi

  [[ -n "${OMNIHUB_PID:-}" ]] && kill "$OMNIHUB_PID" 2>/dev/null || true
  [[ -n "${SBBL_PID:-}" ]] && kill "$SBBL_PID" 2>/dev/null || true

  exit "$status"
}
trap cleanup EXIT INT TERM

# Fail fast for integration prerequisites before waiting on HTTP timeouts.
echo "Checking repository paths..."
omnihub_path_ok=1
sbbl_path_ok=1
[[ -d "$OMNIHUB_REPO" ]] || omnihub_path_ok=0
[[ -d "$SBBL_REPO" ]] || sbbl_path_ok=0

# Map Supabase environment aliases
set_alias SBBL_SUPABASE_URL SUPABASE_URL
set_alias SBBL_SUPABASE_ANON_KEY SUPABASE_ANON_KEY
set_alias SBBL_SUPABASE_SERVICE_KEY SBBL_SUPABASE_SERVICE_ROLE_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_SERVICE_KEY
set_alias SBBL_SUPABASE_SERVICE_ROLE_KEY SBBL_SUPABASE_SERVICE_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_SERVICE_KEY
set_alias INTEGRATION_PPV_GAME_ID TEST_PPV_GAME_ID
set_alias INTEGRATION_PPV_ACCESS_CODE TEST_PPV_ACCESS_CODE

# Normalize OmniHub frontend env aliases (only if missing, do not overwrite)
set_alias VITE_SUPABASE_URL OMNIHUB_SUPABASE_URL SUPABASE_URL
set_alias VITE_SUPABASE_ANON_KEY OMNIHUB_SUPABASE_ANON_KEY SUPABASE_ANON_KEY
set_alias VITE_SUPABASE_PUBLISHABLE_KEY VITE_SUPABASE_ANON_KEY OMNIHUB_SUPABASE_ANON_KEY SUPABASE_ANON_KEY

# Collect all missing env vars; fall back to deterministic-only when any are absent.
missing=0
missing_reasons=()

if [[ $omnihub_path_ok -eq 0 ]]; then
  missing=1
  missing_reasons+=("missing repo path: OmniHub repo not found at $OMNIHUB_REPO")
fi

if [[ $sbbl_path_ok -eq 0 ]]; then
  missing=1
  missing_reasons+=("missing repo path: SBBL repo not found at $SBBL_REPO")
fi

if [[ -z "${SBBL_SUPABASE_URL:-}" ]]; then
  missing=1
  missing_reasons+=("missing SBBL_SUPABASE_URL or SUPABASE_URL")
fi

if [[ -z "${SBBL_SUPABASE_ANON_KEY:-}" ]]; then
  missing=1
  missing_reasons+=("missing SBBL_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY")
fi

if [[ -z "${SBBL_SUPABASE_SERVICE_KEY:-}" ]]; then
  missing=1
  missing_reasons+=("missing service-role alias (SBBL_SUPABASE_SERVICE_KEY, SBBL_SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_SERVICE_KEY)")
fi

if [[ -z "${INTEGRATION_ADMIN_EMAIL:-}" || -z "${INTEGRATION_ADMIN_PASSWORD:-}" ]]; then
  missing=1
  missing_reasons+=("missing admin credentials (INTEGRATION_ADMIN_EMAIL and/or INTEGRATION_ADMIN_PASSWORD)")
fi

if [[ -z "${INTEGRATION_FAN_EMAIL:-}" || -z "${INTEGRATION_FAN_PASSWORD:-}" ]]; then
  missing=1
  missing_reasons+=("missing fan credentials (INTEGRATION_FAN_EMAIL and/or INTEGRATION_FAN_PASSWORD)")
fi

if [[ -z "${INTEGRATION_PPV_GAME_ID:-}" || -z "${INTEGRATION_PPV_ACCESS_CODE:-}" ]]; then
  echo "Optional PPV inputs status: game ID and/or access code missing (not fatal for deterministic fallback)"
fi

if [[ $missing -ne 0 ]]; then
  echo ""
  echo "$DIVIDER"
  echo "Missing Live-Integration Prerequisites:"
  for reason in "${missing_reasons[@]}"; do
    echo "  - $reason"
  done
  echo "$DIVIDER"
  echo ""
  echo "Falling back to deterministic-only validation (no live infrastructure required)."
  "$NODE_CMD" lib/deterministic-validator.mjs
  val_status=$?
  trap - EXIT INT TERM
  exit "$val_status"
fi

if ! curl -fs -o /dev/null "$OMNIHUB_URL"; then
  (cd "$OMNIHUB_REPO" && npm --ignore-scripts run dev >/tmp/omnihub-dev.log 2>&1) &
  OMNIHUB_PID=$!
  wait_for_url "$OMNIHUB_URL" "$OMNIHUB_PID" "/tmp/omnihub-dev.log"
fi

if ! curl -fs -o /dev/null "$SBBL_URL"; then
  (cd "$SBBL_REPO" && npx --ignore-scripts wrangler dev --port 8787 >/tmp/sbbl-dev.log 2>&1) &
  SBBL_PID=$!
  wait_for_url "$SBBL_URL" "$SBBL_PID" "/tmp/sbbl-dev.log"
fi

PLAYWRIGHT_ARGS=("--reporter=list,html" "--output=playwright-results")
[[ -n "$SPEC_FILTER" ]] && PLAYWRIGHT_ARGS+=("--grep=$SPEC_FILTER")
export HEADLESS
npx playwright test "${PLAYWRIGHT_ARGS[@]}" "${EXTRA_ARGS[@]}"
