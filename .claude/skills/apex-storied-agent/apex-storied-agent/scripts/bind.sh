#!/usr/bin/env bash
# Adaptive self-bind: re-points this skill's source/install metadata at the repo
# it is actually installed into. Idempotent — safe to re-run; writes only on change.
# Usage: bash scripts/bind.sh   (run from anywhere; resolves its own location)
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="$(basename "$SKILL_DIR")"

REMOTE="$(git -C "$SKILL_DIR" remote get-url origin 2>/dev/null || true)"
if [ -z "${REMOTE:-}" ]; then
  echo "bind: no git remote here (user-scope install) — metadata left as default."
  exit 0
fi
# Normalize SSH or HTTPS remote to a browsable https URL.
WEB="$(printf '%s' "$REMOTE" | sed -E 's#^git@github.com:#https://github.com/#; s#\.git$##')"
# Full repo-relative path to this skill dir (e.g. .claude/skills/<name>); strip trailing slash.
PREL="$(git -C "$SKILL_DIR" rev-parse --show-prefix 2>/dev/null || true)"; PREL="${PREL%/}"
[ -z "$PREL" ] && PREL="$NAME"
# Branch: fall back to 'main' on unborn/detached HEAD.
BRANCH="$(git -C "$SKILL_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
[ -z "$BRANCH" ] || [ "$BRANCH" = "HEAD" ] && BRANCH="main"
SRC="${WEB}/tree/${BRANCH}/${PREL}"

python3 - "$SKILL_DIR/MANIFEST.json" "$NAME" "$WEB" "$SRC" "$PREL" <<'PY'
import json,sys,os
p,name,web,src,prel=sys.argv[1:6]
m=json.load(open(p))
before=json.dumps(m.get("install"),sort_keys=True)+str(m.get("source"))
inst={
 "user_scope_all_repos": f"git clone {web} && cp -r {prel} ~/.claude/skills/",
 "project_scope": f"{prel} in {web}",
 "claude_ai": f"upload dist/{name}-{m.get('version','1.1.0')}.skill",
}
if os.path.exists(os.path.join(os.path.dirname(p),"references","portable-prompt.md")):
    inst={"portable_prompt":"Paste references/portable-prompt.md as the host model's system prompt", **inst}
m["source"], m["install"] = src, inst
after=json.dumps(m["install"],sort_keys=True)+src
if before==after:
    print("bind: already bound to", src, "— no change."); sys.exit(0)
json.dump(m,open(p,"w"),indent=2)
print("bind: bound ->", src)
PY
echo "bind: re-run 'python3 scripts/forge.py score . && python3 scripts/forge.py pack .' to refresh evidence and re-seal."
