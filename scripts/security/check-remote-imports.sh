#!/usr/bin/env bash
# CI guard: Ensure no runtime remote imports (esm.sh, cdn.skypack, unpkg, etc.)
# exist in application source code.
set -e

PATTERNS="https://esm\.sh\|https://cdn\.skypack\.dev\|https://unpkg\.com"

if grep -r "$PATTERNS" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null; then
  echo "FAIL: Runtime remote imports detected in src/"
  echo "All dependencies must be bundled via package.json."
  exit 1
fi

echo "No runtime remote imports found"
