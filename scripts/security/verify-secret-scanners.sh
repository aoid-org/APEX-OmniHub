#!/usr/bin/env bash
# Verify that secret scanning tools detect known credential patterns.
# Generates a temporary canary file with fake AWS keys and checks that
# both gitleaks and trufflehog flag them.
set -e

TEMP=$(mktemp -d)
trap "rm -rf $TEMP" EXIT

# Generate canary credentials at runtime (NEVER stored in repo)
echo "AKIA$(head /dev/urandom | tr -dc A-Z0-9 | head -c 16)" > "$TEMP/canary.txt"
echo "aws_secret_access_key = $(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 40)" >> "$TEMP/canary.txt"

PASS=0
FAIL=0

# Test gitleaks
if command -v gitleaks &>/dev/null; then
  if ! gitleaks detect --source "$TEMP" --no-git --exit-code 1 2>/dev/null; then
    echo "  gitleaks detected canary"
    PASS=$((PASS + 1))
  else
    echo "  WARNING: gitleaks did NOT detect canary"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  SKIP: gitleaks not installed"
fi

# Test trufflehog
if command -v trufflehog &>/dev/null; then
  if ! trufflehog filesystem "$TEMP" --no-update --fail 2>/dev/null; then
    echo "  trufflehog detected canary"
    PASS=$((PASS + 1))
  else
    echo "  WARNING: trufflehog did NOT detect canary"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  SKIP: trufflehog not installed"
fi

if [ "$FAIL" -gt 0 ]; then
  echo "FAIL: $FAIL scanner(s) missed the canary"
  exit 1
fi

if [ "$PASS" -eq 0 ]; then
  echo "SKIP: No scanners installed to verify (install gitleaks or trufflehog)"
  exit 0
fi

echo "Scanner verification passed"
