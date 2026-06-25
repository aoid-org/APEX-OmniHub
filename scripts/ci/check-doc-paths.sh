#!/bin/bash
set -e

echo "=== APEX-OmniHub Doc-Path Guard ==="

# 1. Check for duplicate sidebar widgets contract
DUPLICATES=$(find . -path "*/node_modules" -prune -o -name "omnidash-sidebar-widgets.ts" -print | grep -v "apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts" || true)
if [ ! -z "$DUPLICATES" ]; then
  echo "❌ ERROR: Duplicate omnidash-sidebar-widgets.ts found outside of canonical path!"
  echo "$DUPLICATES"
  exit 1
fi

# 2. Check canonical paths cited in architecture maps
PATHS_TO_CHECK=(
  "apps/omnihub-site/dashboard/OmniDashShell.tsx"
  "apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts"
  "src/contracts/omnidash.contract.ts"
  "apps/omnihub-site/src/App.tsx"
  "apps/omnihub-site/src/main.tsx"
  "apps/omnihub-site/src/pages/Home.tsx"
  "apps/omnihub-site/src/pages/Login.tsx"
  "apps/omnihub-site/src/content/site.ts"
)

MISSING=0
for FILE_PATH in "${PATHS_TO_CHECK[@]}"; do
  if [ ! -f "$FILE_PATH" ]; then
    echo "❌ ERROR: Cited doc-path does not exist: $FILE_PATH"
    MISSING=1
  fi
done

if [ $MISSING -eq 1 ]; then
  echo "❌ Doc-Path Guard FAILED."
  exit 1
fi

echo "✅ All doc-paths exist and no duplicate contracts found."
exit 0
