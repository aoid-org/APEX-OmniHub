#!/usr/bin/env bash
set -euo pipefail

# APEX OmniHub — Monorepo Migration Script
# This script documents the moves performed for the Turborepo migration.
# It is idempotent — re-running on an already-migrated repo is a no-op.

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO_ROOT"

echo "=== APEX OmniHub Monorepo Migration ==="
echo "Repository root: $REPO_ROOT"
echo ""

# Helper: safe move (skip if source doesn't exist or dest already exists)
safe_move() {
  local src="$1"
  local dest="$2"
  if [[ -e "$src" ]] && [[ ! -e "$dest" ]]; then
    mkdir -p "$(dirname "$dest")"
    git mv "$src" "$dest" 2>/dev/null || mv "$src" "$dest"
    echo "  Moved: $src -> $dest"
  else
    echo "  Skip:  $src (already migrated or missing)"
  fi
  return 0
}

echo "Step 1: Create directory structure"
mkdir -p apps/dashboard apps/site
mkdir -p packages/ui/src/components/ui packages/ui/src/lib
mkdir -p packages/config/eslint packages/config/tailwind
mkdir -p packages/types/src
mkdir -p services/orchestrator services/contracts
mkdir -p tools/e2e tools/sim tools/sandbox tools/scripts
mkdir -p infra/terraform infra/supabase infra/github
echo "  Done."
echo ""

echo "Step 2: Move dashboard source"
safe_move "src" "apps/dashboard/src"
safe_move "public" "apps/dashboard/public"
safe_move "index.html" "apps/dashboard/index.html"
echo ""

echo "Step 3: Move site"
safe_move "apps/omnihub-site" "apps/site"
echo ""

echo "Step 4: Move services"
safe_move "orchestrator" "services/orchestrator"
safe_move "contracts" "services/contracts"
echo ""

echo "Step 5: Move infrastructure"
safe_move "terraform" "infra/terraform"
safe_move "supabase" "infra/supabase"
echo ""

echo "Step 6: Move tools"
safe_move "e2e" "tools/e2e"
safe_move "sim" "tools/sim"
safe_move "sandbox" "tools/sandbox"
safe_move "scripts" "tools/scripts"
echo ""

echo "Step 7: Copy shared UI components"
if [[ -d "apps/dashboard/src/components/ui" ]]; then
  cp -r apps/dashboard/src/components/ui/* packages/ui/src/components/ui/ 2>/dev/null || true
  cp apps/dashboard/src/lib/utils.ts packages/ui/src/lib/utils.ts 2>/dev/null || true
  echo "  Copied UI components to packages/ui"
else
  echo "  Skip: UI components already in packages/ui"
fi
echo ""

echo "Step 8: Backup GitHub workflows"
cp -r .github infra/github 2>/dev/null || true
echo "  Backed up .github to infra/github"
echo ""

echo "=== Migration complete ==="
echo ""
echo "Next steps:"
echo "  1. Run: npm install"
echo "  2. Run: npm run typecheck"
echo "  3. Run: npm run build"
echo "  4. Run: npm test"
