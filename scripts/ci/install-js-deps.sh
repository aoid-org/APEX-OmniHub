#!/usr/bin/env bash
set -euo pipefail

BUN_VERSION="${BUN_VERSION:-1.2.14}"

if ! command -v bun >/dev/null 2>&1; then
  npm install --global "bun@${BUN_VERSION}"
fi

bun install --frozen-lockfile --ignore-scripts
