#!/usr/bin/env bash
# .githooks/pre-commit.d/10-agent-guard.sh
# Runs the proactive guardrail to absolutely avoid repeated regression and agent-led destructive actions.

set -euo pipefail

echo "Running agent destructive actions guardrail..."
node scripts/ci/guard-agent-destructive-actions.mjs
