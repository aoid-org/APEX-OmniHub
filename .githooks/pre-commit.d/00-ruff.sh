#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Pre-commit: running ruff checks..."

if ! command -v ruff &> /dev/null; then
  echo "WARNING: ruff not found in PATH. Skipping pre-commit lint."
  echo "Install with: pip install ruff"
  exit 0
fi

echo "  → ruff check orchestrator"
ruff check orchestrator

echo "  → ruff format --check orchestrator"
ruff format --check orchestrator
