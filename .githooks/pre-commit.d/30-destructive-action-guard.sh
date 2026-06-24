#!/usr/bin/env bash
# Pre-commit: defensive guard against agent-led destructive actions and known
# regressions. Inspects the STAGED change set and blocks high-risk operations
# that an automated agent might perform without intent.
#
# Hard blocks (never overridable):
#   - Adding a root-level wrangler.toml (forbidden by platform protocol).
#   - Reintroducing floating `bun-version: latest` in CI workflows.
#   - Reintroducing Bun-unsupported nested package overrides in package.json.
#
# Override-gated blocks (set APEX_ALLOW_DESTRUCTIVE=1 to proceed deliberately):
#   - Deleting Supabase migration files.
#   - Deleting security guards / security workflows.
#   - Mass deletion (more than MASS_DELETE_THRESHOLD files in one commit).
set -euo pipefail

MASS_DELETE_THRESHOLD=25
OVERRIDE="${APEX_ALLOW_DESTRUCTIVE:-0}"
VIOLATIONS=()
HARD_BLOCK=0

added=$(git diff --cached --name-only --diff-filter=A || true)
deleted=$(git diff --cached --name-only --diff-filter=D || true)

# --- Hard block: root wrangler.toml ------------------------------------
if printf '%s\n' "$added" | grep -qx "wrangler.toml"; then
  VIOLATIONS+=("HARD: root-level wrangler.toml is forbidden (use per-app wrangler configs).")
  HARD_BLOCK=1
fi

# --- Hard block: regressions reintroduced in staged content ------------
staged_wf=$(printf '%s\n' "$(git diff --cached --name-only --diff-filter=ACMR)" | grep '^\.github/workflows/.*\.ya\?ml$' || true)
for wf in $staged_wf; do
  # Match the actual YAML mapping line only (anchored), not detection patterns
  # that mention the string elsewhere.
  if git show ":$wf" 2>/dev/null | grep -qE '^[[:space:]]*bun-version:[[:space:]]+latest[[:space:]]*$'; then
    VIOLATIONS+=("HARD: '$wf' reintroduces floating 'bun-version: latest' (pin an exact version).")
    HARD_BLOCK=1
  fi
done
if printf '%s\n' "$(git diff --cached --name-only --diff-filter=ACMR)" | grep -qx "package.json"; then
  # Bun-unsupported nested override == any overrides/resolutions entry whose
  # VALUE is an object. Parse JSON for an exact, false-positive-free signal.
  if command -v node >/dev/null 2>&1; then
    nested=$(git show ":package.json" 2>/dev/null | node -e '
      let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
        let p;try{p=JSON.parse(s)}catch{process.exit(0)}
        const bad=[];
        for(const sec of ["overrides","resolutions"]){
          const o=p[sec]||{};
          for(const[k,v]of Object.entries(o)) if(v&&typeof v==="object") bad.push(sec+"."+k);
        }
        if(bad.length) console.log(bad.join(", "));
      });' 2>/dev/null || true)
    if [ -n "$nested" ]; then
      VIOLATIONS+=("HARD: package.json has Bun-unsupported nested override(s): ${nested} (use flat overrides).")
      HARD_BLOCK=1
    fi
  fi
fi

# --- Override-gated: migration deletions -------------------------------
mig_deleted=$(printf '%s\n' "$deleted" | grep '^supabase/migrations/.*\.sql$' || true)
if [ -n "$mig_deleted" ] && [ "$OVERRIDE" != "1" ]; then
  while IFS= read -r f; do [ -n "$f" ] && VIOLATIONS+=("GATED: deleting migration '$f' (history is append-only)."); done <<< "$mig_deleted"
fi

# --- Override-gated: security gate deletions ---------------------------
sec_deleted=$(printf '%s\n' "$deleted" | grep -E '^(\.github/workflows/security|scripts/ci/check-)' || true)
if [ -n "$sec_deleted" ] && [ "$OVERRIDE" != "1" ]; then
  while IFS= read -r f; do [ -n "$f" ] && VIOLATIONS+=("GATED: deleting security gate '$f'."); done <<< "$sec_deleted"
fi

# --- Override-gated: mass deletion -------------------------------------
del_count=$(printf '%s\n' "$deleted" | grep -c . || true)
if [ "$del_count" -gt "$MASS_DELETE_THRESHOLD" ] && [ "$OVERRIDE" != "1" ]; then
  VIOLATIONS+=("GATED: mass deletion of ${del_count} files exceeds threshold ${MASS_DELETE_THRESHOLD}.")
fi

if [ "${#VIOLATIONS[@]}" -gt 0 ]; then
  echo "❌ Destructive-action guard blocked this commit:" >&2
  for v in "${VIOLATIONS[@]}"; do echo "   - $v" >&2; done
  if [ "$HARD_BLOCK" -eq 0 ]; then
    echo "" >&2
    echo "   If this is intentional, re-run with: APEX_ALLOW_DESTRUCTIVE=1 git commit ..." >&2
  fi
  exit 1
fi

echo "🛡️  Pre-commit: no destructive actions detected."
