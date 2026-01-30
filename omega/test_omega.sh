#!/bin/bash
# Protocol Omega - Integration Test Suite
# Zero-dependency verification system test

set -e

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║         Protocol Omega - Integration Test Suite                  ║"
echo "║              Zero-Dependency Verification System                 ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

test_case() {
    local name="$1"
    local command="$2"
    local expected_exit="$3"

    echo -n "Testing: $name ... "

    if eval "$command" > /dev/null 2>&1; then
        actual_exit=0
    else
        actual_exit=$?
    fi

    if [ "$actual_exit" -eq "$expected_exit" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS_COUNT++))
    else
        echo -e "${RED}✗ FAIL${NC} (exit: $actual_exit, expected: $expected_exit)"
        ((FAIL_COUNT++))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 1: Engine Core Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_case "Engine stats command" \
    "python3 omega/engine.py stats" \
    0

test_case "Engine request command" \
    "python3 omega/engine.py request 'Test operation' LOW" \
    0

test_case "Engine list command" \
    "python3 omega/engine.py list" \
    0

test_case "Engine invalid command" \
    "python3 omega/engine.py invalid" \
    1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 2: TypeScript CLI Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_case "TS CLI stats" \
    "npx tsx scripts/omega/cli.ts stats" \
    0

test_case "TS CLI list" \
    "npx tsx scripts/omega/cli.ts list" \
    0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 3: Workflow Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create test request and get hash
TEST_INTENT="Integration test workflow $(date +%s)"
RESULT=$(python3 omega/engine.py request "$TEST_INTENT" MEDIUM)
SHORT_HASH=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['short_hash'])")

echo "Created test request with hash: $SHORT_HASH"

test_case "Check unapproved status" \
    "python3 omega/engine.py check '$TEST_INTENT' | grep -q 'false'" \
    0

test_case "Approve task" \
    "python3 omega/engine.py approve $SHORT_HASH" \
    0

test_case "Check approved status" \
    "python3 omega/engine.py check '$TEST_INTENT' | grep -q 'true'" \
    0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 4: Database Integrity Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DB_PATH="$HOME/.apex/omega/verification.db"

test_case "Database exists" \
    "test -f $DB_PATH" \
    0

test_case "Database has verifications table" \
    "python3 -c \"import sqlite3; conn = sqlite3.connect('$DB_PATH'); assert 'verifications' in [r[0] for r in conn.execute('SELECT name FROM sqlite_master WHERE type=\\\"table\\\"').fetchall()]; conn.close()\"" \
    0

test_case "Database has audit_log table" \
    "python3 -c \"import sqlite3; conn = sqlite3.connect('$DB_PATH'); assert 'audit_log' in [r[0] for r in conn.execute('SELECT name FROM sqlite_master WHERE type=\\\"table\\\"').fetchall()]; conn.close()\"" \
    0

test_case "WAL mode enabled" \
    "python3 -c \"import sqlite3; conn = sqlite3.connect('$DB_PATH'); assert conn.execute('PRAGMA journal_mode').fetchone()[0] == 'wal'; conn.close()\"" \
    0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 5: NPM Script Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_case "NPM omega:stats script" \
    "npm run omega:stats" \
    0

test_case "NPM omega:list script" \
    "npm run omega:list" \
    0

test_case "NPM omega:test script" \
    "npm run omega:test" \
    0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 6: File Structure Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_case "Engine file exists" \
    "test -f omega/engine.py" \
    0

test_case "Dashboard file exists" \
    "test -f omega/dashboard.py" \
    0

test_case "CLI file exists" \
    "test -f scripts/omega/cli.ts" \
    0

test_case "README exists" \
    "test -f omega/README.md" \
    0

test_case "QUICKSTART exists" \
    "test -f omega/QUICKSTART.md" \
    0

test_case "Demo file exists" \
    "test -f omega/examples/demo.py" \
    0

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                        TEST SUMMARY                               ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "  Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "  Failed: ${RED}$FAIL_COUNT${NC}"
echo -e "  Total:  $((PASS_COUNT + FAIL_COUNT))"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo ""
    echo "🎉 Protocol Omega is fully operational!"
    echo ""
    echo "Next steps:"
    echo "  - View stats: npm run omega:stats"
    echo "  - Start dashboard: npm run omega:dashboard"
    echo "  - Run demo: python3 omega/examples/demo.py"
    echo ""
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please review the failures above."
    echo ""
    exit 1
fi
