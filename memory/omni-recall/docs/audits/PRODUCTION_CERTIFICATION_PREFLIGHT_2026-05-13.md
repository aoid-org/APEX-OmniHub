---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Production Certification Preflight — 2026-05-13

## Preflight Metadata

| Field | Value |
|---|---|
| Branch | `claude/harden-production-certification-NVFOQ` |
| HEAD SHA | `9af2bf24f24994d53795813f6c252d2891413b5b` |
| origin/main SHA | `58e93e1fd83b557d4926a058e9ea4237a743df2e` |
| Date | 2026-05-13 |
| Auditor | Claude Code — Principal Platform Release Engineer |
| Package Manager | **bun** (per `CLAUDE.md` §2 and `package.json#packageManager: "bun@1.x"`) |
| npm use | `npm audit` only (CI `Security Gates` and `Dependency Security Audit`) |

---

## Commands Run

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
node -e "const p=require('./package.json'); console.log(JSON.stringify({name,version,packageManager,scripts},null,2))"
find .github/workflows -maxdepth 1 -type f | sort
cat .github/workflows/release.yml
cat .github/workflows/ci-runtime-gates.yml
cat scripts/ci/check-additive-migrations.ts
cat orchestrator/main.py
cat orchestrator/server.py
cat integration-harness/lib/deterministic-validator.mjs
head -100 README.md
ls supabase/migrations/
```

---

## Package Manager Decision

**Decision: bun**

- `CLAUDE.md` §2 is unambiguous: "Primary package manager: `bun`"
- `package.json#packageManager` is `"bun@1.x"`
- `npm ci --ignore-scripts` appears in CI workflows for install (legacy pattern — not changed here)
- `npm audit --omit=dev --audit-level=high` is used for security audits (requires `package-lock.json`)
- All repo scripts (`bun run ...`) remain authoritative for local and agent use

---

## Release Workflow Defects Verified

File: `.github/workflows/release.yml`

| # | Defect | Location | Severity |
|---|---|---|---|
| 1 | `id: changesets` — **PRESENT** ✓ | line 44 | N/A (no action needed) |
| 2 | `python -m uvicorn main:app --host 0.0.0.0 --port 8001 &` — background fake service | line 61 | **P0** |
| 3 | `pkill -f shadow \|\| true` — kills unrelated processes | line 61 | **P0** |
| 4 | Shadow deployment builds `dist/shadow` locally in CI runner with no real Cloudflare Pages target verified | lines 54–67 | **P0** |
| 5 | `terraform apply -auto-approve` — no environment approval gate, no plan-before-apply | line 86 | **P0** |
| 6 | `npm ci --ignore-scripts` for install — uses npm not bun | line 41 | **P1** |

**Shadow deployment target verification:**
No Cloudflare Pages shadow slot name, project name, or `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets are referenced in the release workflow. The deployment step only runs `npm run build -- --outDir dist/shadow` (local build) and then starts a background uvicorn process — this is not a real deployment. A `SHADOW_DEPLOYMENT_BLOCKERS.md` doc is created per the hard rules.

---

## Migration Gate Defects Verified

File: `scripts/ci/check-additive-migrations.ts`

| # | Defect | Severity |
|---|---|---|
| 1 | Hardcodes exactly 2 migration filenames: `20260508000000_apex_control_plane.sql`, `20260508010000_apex_sales_vault.sql` | **P0** |
| 2 | Only checks `DROP\|DELETE\|TRUNCATE` — misses `ALTER TABLE ... DROP COLUMN`, `DISABLE ROW LEVEL SECURITY`, `REVOKE`, `DROP POLICY`, `DROP TRIGGER`, `ALTER TYPE ... DROP VALUE`, `ON DELETE CASCADE`, `ALTER TABLE ... ALTER COLUMN ... TYPE` | **P0** |
| 3 | No allowlist mechanism for justified destructive changes | **P0** |
| 4 | No dynamic changed-file detection (PR vs push vs fallback) | **P0** |
| 5 | Exit on first file-not-found error rather than scanning all changed migrations | **P1** |

Current migration count: **75 files** (+ `rollback/` directory) in `supabase/migrations/`.

---

## Deploy / Terraform Evidence

- `terraform/` directory exists in repo (IaC present)
- `terraform/environments/production/` path is referenced in release.yml line 84
- No Terraform Cloud workspace, state backend, or environment secrets are verified as provisioned
- `terraform apply -auto-approve` in release workflow has **no GitHub Environment approval gate**
- **Verdict: Terraform apply path is unsafe — must require plan-before-apply + environment protection**

---

## GitHub PR Access Status

GitHub MCP tools are available. PRs can be read via `mcp__github__pull_request_read`.
`gh` CLI is not available in this environment.

---

## Certification Pre-Condition Summary

| Gate | Status |
|---|---|
| Branch checkout | ✅ On correct branch |
| HEAD vs origin/main | ⚠️ Branch is ahead of main (changes staged here) |
| Package manager | ✅ bun confirmed |
| `id: changesets` exists | ✅ No action needed |
| uvicorn shadow fake service | ❌ Must be removed (P0) |
| Terraform auto-approve | ❌ Must add plan + env gate (P0) |
| Migration gate dynamic | ❌ Must rewrite (P0) |
| Migration gate ruleset | ❌ Must expand to full ruleset (P0) |
| README static badges | ❌ Must replace with real CI badges (P1) |
| Docs drift | ❌ Must reconcile (P1) |
| Shadow deployment target | ❌ No verified target — blocker doc created |
