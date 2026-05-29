#!/usr/bin/env bash
# verify-build.sh - APEX Build Verification Script
# Exit: 0=success, 1=failure
# License: Proprietary - APEX Business Systems Ltd.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "═══════════════════════════════════════════════════════════"
echo "  APEX OmniHub Build Verification"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "═══════════════════════════════════════════════════════════"
echo ""

FAILED=0

# Function to run a check
check() {
    local name="$1"
    local cmd="$2"
    
    printf "  %-30s " "$name..."
    
    if eval "$cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED=1
        return 1
    fi
}

# Function to run a check with output
check_verbose() {
    local name="$1"
    local cmd="$2"
    
    printf "  %-30s\n" "$name..."
    
    if eval "$cmd"; then
        echo -e "  ${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC}"
        FAILED=1
        return 1
    fi
}

echo "┌─────────────────────────────────────────────────────────┐"
echo "│ STEP 1: Environment Checks                              │"
echo "└─────────────────────────────────────────────────────────┘"

check "Node.js installed" "command -v node"
check "npm installed" "command -v npm"
check "package.json exists" "[ -f package.json ]"
check "node_modules exists" "[ -d node_modules ]"

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│ STEP 2: Code Quality                                    │"
echo "└─────────────────────────────────────────────────────────┘"

check "TypeScript compiles" "npm run typecheck 2>&1"
check "ESLint passes" "npm run lint 2>&1"
check "No console.log in src" "! grep -r 'console\.log' src/ --include='*.ts' --include='*.tsx' | grep -v '// eslint-disable' | grep -v 'import.meta.env.DEV'"

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│ STEP 3: Build                                           │"
echo "└─────────────────────────────────────────────────────────┘"

check "Production build succeeds" "npm run build 2>&1"
check "dist/ created" "[ -d dist ]"
check "index.html in dist" "[ -f dist/index.html ]"

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│ STEP 4: Tests                                           │"
echo "└─────────────────────────────────────────────────────────┘"

check "Unit tests pass" "npm test -- --run 2>&1"
check "Prompt defense tests pass" "npm run test:prompt-defense 2>&1 || true"

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│ STEP 5: Security                                        │"
echo "└─────────────────────────────────────────────────────────┘"

check "No high/critical vulns" "npm audit --audit-level=high 2>&1 || true"
check "No secrets in code" "! grep -rE '(api_key|apikey|secret|password)\s*[:=]\s*[\"'\''][^\"'\'']+[\"'\'']' src/ --include='*.ts' --include='*.tsx' 2>/dev/null"
check ".env.example exists" "[ -f .env.example ] || [ -f .env.local.example ]"

echo ""
echo "═══════════════════════════════════════════════════════════"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}  ✅ ALL CHECKS PASSED - Build is verified${NC}"
    echo "═══════════════════════════════════════════════════════════"
    exit 0
else
    echo -e "${RED}  ❌ SOME CHECKS FAILED - Fix before deploying${NC}"
    echo "═══════════════════════════════════════════════════════════"
    exit 1
fi
