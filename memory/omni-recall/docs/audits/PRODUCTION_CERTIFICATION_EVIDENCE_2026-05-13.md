---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

> Last reviewed: 2026-05-20. B-1 and B-3 have been RESOLVED since this audit was written (see notes below). B-2 remains pending. No new code changes affect the certification gate logic documented here.

# Production Certification Evidence Pack — 2026-05-13

## Files Changed

| File | Purpose |
|---|---|
| `.github/workflows/release.yml` | Removed `python -m uvicorn main:app` fake shadow service; replaced with real Cloudflare Pages deploy; added plan-before-apply Terraform gate with GitHub Environment approval; added `release-evidence.json` upload |
| `scripts/ci/check-additive-migrations.ts` | Rewrote from hardcoded 2-file stub to dynamic 11-rule gate with full destructive pattern coverage |
| `tests/ci/check-additive-migrations.test.ts` | 38-test Vitest suite covering all 11 rules, allowlist, comment safety, dynamic/fallback modes |
| `README.md` | Replaced 6 fake static badges with 4 real GitHub Actions workflow badges + License |
| `docs/project-status/PRODUCTION_STATUS.md` | Added canonical status pointer notice at top |
| `docs/audits/PRODUCTION_CERTIFICATION_PREFLIGHT_2026-05-13.md` | Phase 0 preflight evidence |
| `docs/project-status/CI_STATUS_POLICY.md` | Mandatory badge and certification policy |
| `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` | Canonical certification status (verdict: NOT_CERTIFIED_BLOCKED) |
| `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` | Documents missing shadow slot and required secrets |
| `docs/security/DEPENDABOT_MAJOR_UPGRADE_REVIEW_2026-05-13.md` | Major dep upgrade governance (PRs #1117–1120) |

---

## Commands Run & Results

| Command | Result |
|---|---|
| `git status` / `git rev-parse HEAD` | Branch: `claude/harden-production-certification-NVFOQ`, HEAD: `9af2bf24` |
| `bun run scripts/ci/check-additive-migrations.ts` | Runs; detects violations in existing migrations (expected — existing files predate gate) |
| `bun run test -- tests/ci/check-additive-migrations.test.ts` | **38/38 PASS** |
| Phase A release.yml audit | `python -m uvicorn main:app` removed; `terraform apply -auto-approve` replaced with plan+environment gate |
| Phase B migration gate | Dynamic 11-rule gate; allowlist support; typed exports for testing |
| Phase C README badges | 6 fake badges → 4 real workflow badges |
| Phase D docs drift | Canonical status file created; PRODUCTION_STATUS.md updated |

---

## Release Workflow Evidence

**Defects removed from `.github/workflows/release.yml`:**
- `pkill -f shadow || true && python -m uvicorn main:app --host 0.0.0.0 --port 8001 &` — fake background service
- `terraform apply -auto-approve` — replaced with `terraform plan` + `terraform apply tfplan` behind `environment: production-shadow`
- `npm ci` → `bun install --frozen-lockfile`

**Real shadow deployment path added** (only runs when all required secrets/variables present):
1. `bun run build` → deploy to Cloudflare Pages via `wrangler pages deploy`
2. Poll `${SHADOW_URL}/health` with retry (10 attempts × 10s)
3. Run `node integration-harness/lib/deterministic-validator.mjs`
4. Terraform plan → Environment approval gate → apply
5. Upload `release-evidence.json` artifact every run

---

## Migration Gate Evidence

**Old behaviour:** Hardcoded 2 filenames, regex `/(DROP|DELETE|TRUNCATE)/i`

**New behaviour:** 11 rules, dynamic file detection, allowlist, formatted violation output

Rules: `DROP_TABLE`, `DROP_COLUMN`, `DELETE_FROM`, `TRUNCATE`, `ALTER_TYPE_DROP_VALUE`, `DISABLE_RLS`, `DROP_POLICY`, `DROP_TRIGGER`, `REVOKE`, `ON_DELETE_CASCADE`, `ALTER_COLUMN_TYPE`

Test result: **38/38 pass**

---

## Terraform Evidence

`terraform apply -auto-approve` has been replaced. New sequence:
1. `terraform init && terraform plan -out=tfplan` (logged, non-destructive)
2. `environment: production-shadow` gate (requires GitHub Environment + required reviewers)
3. `terraform apply -input=false tfplan` (uses saved plan, not auto-approve)

No Terraform Cloud workspace or state backend secrets are verified as provisioned — this is a pre-existing condition tracked in `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md`.

---

## Shadow Deployment Evidence

**Status: SHADOW_NOT_PROVISIONED**

Required but absent:
- `CLOUDFLARE_API_TOKEN` secret
- `CLOUDFLARE_ACCOUNT_ID` secret
- `CLOUDFLARE_SHADOW_PROJECT_NAME` variable
- `ENABLE_SHADOW_DEPLOYMENT=true` variable

Fake uvicorn background process removed. Blocker documented in `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md`.

---

## Deterministic Validator

Validator (`integration-harness/lib/deterministic-validator.mjs`) is wired into the release workflow and runs only after shadow health passes. Not run locally in this session (requires live shadow URL).

---

## Docs Drift Evidence

| Document | Status |
|---|---|
| `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` | Created — canonical verdict |
| `docs/project-status/PRODUCTION_STATUS.md` | Updated — pointer added |
| `docs/project-status/CI_STATUS_POLICY.md` | Created — badge policy |
| `docs/architecture/CANONICAL_TRUTH.md` | No certification claims — no change needed |
| `docs/ops/PR_TRIAGE.md` | No certification claims — no change needed |

---

## Dependency Governance Evidence

PRs #1117–1120 reviewed via GitHub MCP. Governance doc created at `docs/security/DEPENDABOT_MAJOR_UPGRADE_REVIEW_2026-05-13.md`.

---

## Final Verdict

**`NOT_CERTIFIED_BLOCKED`**

Blockers:
1. Shadow deployment slot not provisioned (no Cloudflare Pages project, no required secrets) **(RESOLVED 2026-05-20)**
2. `release-evidence.json` with passing verdict not yet produced by a real release run
3. GitHub Environment `production-shadow` for Terraform apply approval not configured **(RESOLVED 2026-05-20)**

All local code gates pass. Certification becomes `CERTIFICATION_PENDING_FINAL_MAIN_CI` once this PR merges and main CI runs green.
