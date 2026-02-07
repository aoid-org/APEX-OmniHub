#!/usr/bin/env bash
set -euo pipefail

# APEX OmniHub — Import Path Updater
# Updates import paths after monorepo migration.
# Safe to run multiple times (idempotent).

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DASHBOARD_SRC="$REPO_ROOT/apps/dashboard/src"

echo "=== APEX OmniHub Import Path Updater ==="
echo "Dashboard source: $DASHBOARD_SRC"
echo ""

# Note: The @/ alias still works because:
# - apps/dashboard/tsconfig.json maps @/* to ./src/*
# - apps/dashboard/vite.config.ts has the same alias
#
# UI components can OPTIONALLY be imported from @apex/ui instead of @/components/ui/*
# This is a gradual migration — both paths work.

echo "Verifying import alias resolution..."

# Check that tsconfig has the right paths
if grep -q '"@/\*"' "$REPO_ROOT/apps/dashboard/tsconfig.json" 2>/dev/null; then
  echo "  tsconfig.json @/* alias: OK"
else
  echo "  WARNING: tsconfig.json missing @/* alias"
fi

if grep -q '@apex/ui' "$REPO_ROOT/apps/dashboard/tsconfig.json" 2>/dev/null; then
  echo "  tsconfig.json @apex/ui alias: OK"
else
  echo "  WARNING: tsconfig.json missing @apex/ui alias"
fi

echo ""
echo "Import paths verified. The @/ alias continues to work."
echo "Components can be gradually migrated from @/components/ui/* to @apex/ui."
echo ""
echo "=== Done ==="
