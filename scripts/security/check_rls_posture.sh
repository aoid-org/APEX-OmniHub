#!/usr/bin/env bash
set -euo pipefail

failed=0

for file in supabase/migrations/*.sql; do
  has_create_table=0
  has_rls_enable=0
  has_not_applicable=0

  if grep -Eqi "CREATE[[:space:]]+TABLE" "$file"; then
    has_create_table=1
  fi

  if grep -Eqi "ENABLE[[:space:]]+ROW[[:space:]]+LEVEL[[:space:]]+SECURITY" "$file"; then
    has_rls_enable=1
  fi

  if grep -Eq -- "--[[:space:]]RLS:[[:space:]]NOT_APPLICABLE[[:space:]]\(reason:[[:space:]].+\)" "$file"; then
    has_not_applicable=1
  fi

  if [[ "$has_create_table" -eq 1 && "$has_rls_enable" -eq 0 && "$has_not_applicable" -eq 0 ]]; then
    echo "[RLS_POSTURE] Missing RLS stance in $file"
    failed=1
  fi
done

if [[ "$failed" -eq 1 ]]; then
  exit 1
fi

echo "✓ rls-posture: PASS"
