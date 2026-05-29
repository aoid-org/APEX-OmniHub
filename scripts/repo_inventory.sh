#!/usr/bin/env bash
set -euo pipefail

mkdir -p inventory

STRIP_DOT_PREFIX='s|^./||'

echo "repo=$(basename "$(pwd)")" > inventory/repo_meta.txt
echo "generated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> inventory/repo_meta.txt
git rev-parse HEAD >> inventory/repo_meta.txt

git ls-files | awk -F. 'NF>1{print $NF}' | sort | uniq -c | awk '{print $2"\t"$1}' > inventory/file_extensions.tsv
find . -mindepth 1 -maxdepth 1 -type d | sed "$STRIP_DOT_PREFIX" | sort > inventory/top_level_dirs.txt
find . -type f \( -name 'package.json' -o -name 'package-lock.json' -o -name 'bun.lock' -o -name 'deno.lock' -o -name 'pyproject.toml' -o -name 'requirements*.txt' -o -name 'requirements.lock' \) | sed "$STRIP_DOT_PREFIX" | sort > inventory/manifests.txt
find .github/workflows -type f | sed "$STRIP_DOT_PREFIX" | sort > inventory/workflows.txt
find supabase/functions -mindepth 1 -maxdepth 1 -type d | sed "$STRIP_DOT_PREFIX" | sort > inventory/supabase_functions.txt
find supabase/migrations -type f | sed "$STRIP_DOT_PREFIX" | sort > inventory/supabase_migrations.txt

node -e 'const fs=require("fs");const p="package.json";const out={};if(fs.existsSync(p)){const j=JSON.parse(fs.readFileSync(p,"utf8"));out.name=j.name;out.version=j.version;out.engines=j.engines||{};out.packageManager=j.packageManager||null;}fs.writeFileSync("inventory/package_summary.json",JSON.stringify(out,null,2));'
python - <<'PY'
import json, pathlib
p=pathlib.Path("orchestrator/pyproject.toml")
out={"has_orchestrator_pyproject":p.exists()}
pathlib.Path("inventory/python_summary.json").write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8")
PY

{
  echo "CODEOWNERS entries:";
  awk 'NF && $1 !~ /^#/{print NR ":" $0}' CODEOWNERS;
} > inventory/codeowners_audit.txt

cat > inventory/admin_unknowns.md <<'MD'
# Admin-only unknowns to export

Set repo context first:

```bash
export GH_REPO="apexbusiness-systems/APEX-OmniHub"
```

Export commands (do not assume values without admin execution):

```bash
gh api repos/$GH_REPO/rulesets
gh api repos/$GH_REPO/branches/main/protection
gh api repos/$GH_REPO/environments
gh api repos/$GH_REPO/actions/permissions
```
MD
