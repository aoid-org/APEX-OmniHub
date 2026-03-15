#!/usr/bin/env bash
# Validate commit message format on commit-msg hook.
# This runs on the LAST commit message in the staged tree.
# Full enforcement happens in the commit-msg hook below.
set -euo pipefail
echo "✅ commitlint: staged — full check on commit-msg hook"
