#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-origin/main}"
RANGE="${BASE_REF}...HEAD"

changed_files="$(git diff --name-only "$RANGE")"
if [[ -z "$changed_files" ]]; then
  echo "✅ No changed files in ${RANGE}."
  exit 0
fi

forbidden_pattern='(^|/)(\.claude/|\.cursor/)|(^|/)(raw_test_output.*\.txt|tsc_output.*\.txt|test_output.*\.txt|test_forge_full.*\.py|test_json.*\.json)$|(^|/)APEX Bible\.zip$|\.zip$'

violations="$(printf '%s\n' "$changed_files" | rg -n "$forbidden_pattern" || true)"
if [[ -n "$violations" ]]; then
  echo "❌ Repository hygiene guard failed. Forbidden file(s) detected:"
  echo "$violations"
  exit 1
fi

echo "✅ Repository hygiene guard passed."
