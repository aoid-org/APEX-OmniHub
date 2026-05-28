#!/usr/bin/env bash
set -euo pipefail

echo "BASH_SCRIPT_STARTED"

export NVM_DIR="$HOME/.nvm"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  . "$NVM_DIR/nvm.sh"
  nvm use 20 >/dev/null
fi

echo "NODE=$(command -v node || true)"
echo "NPM=$(command -v npm || true)"
node -v
npm -v

export OMNIHUB_REPO="/mnt/c/Users/sinyo/OMNILINK-APEX HUB/APEX-OmniLink/APEX-OmniHub/APEX-OmniHub"
export SBBL_REPO="/mnt/c/Users/sinyo/sbbl-hq/sbbl-hq"

echo "PWD=$(pwd)"
echo "OMNIHUB_REPO=$OMNIHUB_REPO"
echo "SBBL_REPO=$SBBL_REPO"

[[ -d "$OMNIHUB_REPO" ]] || { echo "OMNIHUB_REPO missing"; exit 2; }
[[ -d "$SBBL_REPO" ]] || { echo "SBBL_REPO missing"; exit 2; }

cd "$OMNIHUB_REPO/integration-harness"

echo "Syntax check..."
bash -n run.sh

echo "Running harness..."
bash run.sh 2>&1 | tee e2e-run.log
status=${PIPESTATUS[0]}

echo "HARNESS_EXIT=$status"
echo "Artifacts:"
find . -maxdepth 5 -type f \( -path "*playwright-report*" -o -path "*test-results*" -o -name "*.png" -o -name "*.webm" -o -name "*.zip" -o -name "*.html" -o -name "e2e-run.log" \) 2>/dev/null | sort

exit $status
