#!/usr/bin/env bash
set -euo pipefail

STAGED=$(git diff --cached --name-only --diff-filter=ACMR)
HAS_CORE=$(printf '%s\n' "$STAGED" | grep -q '^src/core/' && echo 1 || echo 0)
HAS_UI=$(printf '%s\n' "$STAGED" | grep -q '^apps/omnihub-site/src/pages/' && echo 1 || echo 0)

if [[ "$HAS_CORE" == "1" ]] && [[ "$HAS_UI" == "1" ]]; then
  echo "❌ CROSS-DOMAIN COMMIT REJECTED
Reason: Commit modifies both src/core/ (Logic) and apps/omnihub-site/src/pages/ (UI).
Fix: Split into two commits — (1) backend data change, (2) frontend render change.
See ARCHITECTURE_CANONICAL_MAP.md for domain isolation rules."
  exit 1
fi
