#!/usr/bin/env bash
# scripts/install-githooks.sh
# Forcibly symlink .githooks/* into .git/hooks/ and make executable.
# Idempotent — safe to re-run.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_SRC="${REPO_ROOT}/.githooks"
HOOKS_DST="${REPO_ROOT}/.git/hooks"

if [[ ! -d "$HOOKS_SRC" ]]; then
  echo "ERROR: ${HOOKS_SRC} does not exist. Nothing to install." >&2
  exit 1
fi

echo "Installing githooks from ${HOOKS_SRC} → ${HOOKS_DST}"

for hook in "${HOOKS_SRC}"/*; do
  hook_name="$(basename "$hook")"
  target="${HOOKS_DST}/${hook_name}"

  # Remove existing hook (file or symlink)
  if [[ -e "$target" ]] || [[ -L "$target" ]]; then
    rm -f "$target"
  fi

  ln -sf "$hook" "$target"
  chmod +x "$target"
  chmod +x "$hook"
  echo "  ✓ ${hook_name}"
done

echo "Done. All githooks installed."
