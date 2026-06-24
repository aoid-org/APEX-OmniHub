#!/usr/bin/env bash
# Pre-commit: proactive regression guard.
# Runs the same security/consistency checks CI enforces, locally, so a
# regression is caught before it is even committed. Mirrors:
#   - scripts/ci/check-python-dependency-security.py
#   - scripts/ci/check-supabase-migration-versions.mjs
# Skips gracefully (never blocks) when an interpreter is unavailable, matching
# the repo's existing hook conventions (see 00-ruff.sh).
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

echo "🛡️  Pre-commit: dependency security + lock/migration consistency..."

if command -v python3 >/dev/null 2>&1; then
  python3 "${REPO_ROOT}/scripts/ci/check-python-dependency-security.py"
else
  echo "  WARNING: python3 not found; skipping Python dependency security guard."
fi

if command -v node >/dev/null 2>&1; then
  node "${REPO_ROOT}/scripts/ci/check-supabase-migration-versions.mjs"
else
  echo "  WARNING: node not found; skipping Supabase migration version guard."
fi
