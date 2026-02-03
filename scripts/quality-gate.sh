#!/usr/bin/env bash
# VALUATION_IMPACT: Automates CI gate enforcement for audit-grade quality
# Generated: 2026-02-03
set -euo pipefail

run_check() {
  cmd=("$@")
  if ! "${cmd[@]}"; then
    echo "FAIL: ${cmd[*]}" >&2
    exit 1
  fi
  return 0
}

echo "🔒 Running APEX Gate"
run_check npm run lint -- --max-warnings 0
run_check npm run typecheck
run_check npm run build
run_check npm run security:audit
run_check npm test -- --coverage --run

echo "✅ Quality gate clear"

# Verify:
bash scripts/quality-gate.sh
