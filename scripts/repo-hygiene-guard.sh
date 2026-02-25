#!/usr/bin/env bash
# repo-hygiene-guard.sh — Fails CI if known artifact files are tracked.
set -euo pipefail

ARTIFACTS=(
  "raw_test_output.txt"
  "tsc_output.txt"
  "test_output_pr601.txt"
  "test_forge_full.py"
  "test_json.json"
)

EXIT_CODE=0

for f in "${ARTIFACTS[@]}"; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    echo "ERROR: '$f' is tracked in git. Please run: git rm --cached $f"
    EXIT_CODE=1
  fi
done

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Repo hygiene check passed — no artifact files tracked."
fi

exit "$EXIT_CODE"
