#!/usr/bin/env bash
# APEX-OMNI-TEST v1.0 — Claude-Native Installation Script
# APEX Business Systems Ltd. | Copyright © 2026 All Rights Reserved

set -euo pipefail

SKILL_NAME="apexomni-test"
INSTALL_PATH="/mnt/skills/user/${SKILL_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

readonly SEPARATOR_DOUBLE="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "$SEPARATOR_DOUBLE"
echo "  APEX-OMNI-TEST v1.0 — Installation"
echo "  APEX Business Systems Ltd."
echo "$SEPARATOR_DOUBLE"

# Pre-flight checks
echo "[ ] Checking install path..."
if [[ ! -d "/mnt/skills/user/" ]]; then
  echo "ERROR: /mnt/skills/user/ not found. Are you inside Claude's environment?" >&2
  exit 1
fi

# Backup existing installation if present
if [[ -d "${INSTALL_PATH}" ]]; then
  BACKUP="${INSTALL_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "[ ] Backing up existing installation to ${BACKUP}..."
  cp -r "${INSTALL_PATH}" "${BACKUP}"
fi

# Install
echo "[ ] Installing ${SKILL_NAME}..."
cp -r "${SCRIPT_DIR}" "${INSTALL_PATH}"

# Verify
echo "[ ] Verifying installation..."
if [[ -f "${INSTALL_PATH}/SKILL.md" ]] && [[ -f "${INSTALL_PATH}/MANIFEST.json" ]]; then
  echo "✅ SKILL.md: PRESENT"
  echo "✅ MANIFEST.json: PRESENT"
else
  echo "❌ Installation verification FAILED" >&2
  exit 1
fi

# Smoke test: check SKILL.md is non-empty and has frontmatter
LINES=$(wc -l < "${INSTALL_PATH}/SKILL.md")
if [[ "$LINES" -gt 100 ]]; then
  echo "✅ SKILL.md content: ${LINES} lines — VALID"
else
  echo "❌ SKILL.md too short (${LINES} lines) — may be corrupted" >&2
  exit 1
fi

echo ""
echo "$SEPARATOR_DOUBLE"
echo "  ✅ APEX-OMNI-TEST v1.0 INSTALLED SUCCESSFULLY"
echo "  Path: ${INSTALL_PATH}"
echo ""
echo "  Activation: Automatic on any test-related prompt"
echo "  Supersedes: omni-test, webapp-testing"
echo "$SEPARATOR_DOUBLE"
