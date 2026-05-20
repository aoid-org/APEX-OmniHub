# Production Certification Status

> **This is the canonical source for current certification state.**
> All other docs (PRODUCTION_STATUS.md, audit reports, README) defer here.
> Last updated: 2026-05-20


## 2026-05-20 Shadow Slot + Environment Provisioning Addendum

B-1 and B-3 are now RESOLVED as of 2026-05-20. The apex-omnihub-shadow Cloudflare Pages project has been created and all required secrets and variables have been set in the GitHub repository. The production-shadow GitHub Environment has been created with required-reviewer protection. B-2 remains PENDING: `release-evidence.json` with a `CERTIFIED` verdict cannot be produced until PR #1184 merges to main and the release workflow runs and publishes changeset v1.6.1.

Resolved in this pass:
- `apex-omnihub-shadow` Cloudflare Pages shadow slot provisioned.
- GitHub repository secrets set: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- GitHub repository variables set: `CLOUDFLARE_SHADOW_PROJECT_NAME=apex-omnihub-shadow`, `ENABLE_SHADOW_DEPLOYMENT=true`, `SHADOW_HEALTH_URL=https://apex-omnihub-shadow.pages.dev/health`, `ENABLE_ATOMIC_ROUTING_FLIP=true`.
- GitHub Environment `production-shadow` created with required-reviewer protection and `ENABLE_SHADOW_DEPLOYMENT=true` variable.

Still pending:
- B-2: Merge PR #1184 → release workflow publishes v1.6.1 → shadow deploy passes health check → Terraform plan → production-shadow reviewer approves → `release-evidence.json` written with `CERTIFIED` verdict.

## 2026-05-16 Documentation Audit Addendum

This documentation audit updates indexes, maps, README links, RSI branch-protection guidance, and drift records to current repo truth. It does **not** change the certification verdict. `NOT_CERTIFIED_BLOCKED` remains in force until the release workflow produces the required certification evidence and the active blockers below are resolved.

Verified in this documentation pass:

- `bun run docs:check` passes for docs links and explicit code pointers.
- The current documentation index is `docs/DOCUMENTATION_RELEASE_INDEX.md`.
- Current RSI repository evidence is live mode in `policy/rsi-policy.yaml` with `.github/workflows/rsi-governance.yml` present.

## 2026-05-20 Tech Debt Audit Addendum

A comprehensive tech debt audit was performed on 2026-05-20 (branch: claude/audit-tech-debt-Pmwkx).
All changes are verified by actual code execution. Certification verdict unchanged (B-2 still pending).

**CI Hardening:**
- `integration.yml`: action SHAs pinned, node upgraded 20→24, GH_PAT URL masking applied
- `deploy-omnihub-proof.yml`: action SHAs + wrangler-action@v3 SHA pinned
- `dependency-consolidation.yml`: auto-merge now gated on `mergeable_state === 'clean'`
- `.lighthouserc.json`: `categories:accessibility` and `color-contrast` enforced as CI errors

**Security Hardening:**
- `supabase/functions/stripe-webhook/index.ts`: STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET explicitly required; returns 503 if absent
- `supabase/functions/_shared/requestSigning.ts`: ORCHESTRATOR_SHARED_SECRET throws on missing (prevents empty-key HMAC bypass)

**Quality Hardening:**
- `sonar-project.properties`: `src/**`, `apps/**`, `packages/**` removed from `sonar.coverage.exclusions` — frontend coverage now visible to SonarCloud

**Verified Test Results (2026-05-20):**
- `npm run typecheck`: PASS
- `npm run test`: 213 files, 2505 tests PASS, 3 files / 70 tests SKIP (Supabase not configured in env)
- `npm run build`: PASS (2429 modules, 44s, no warnings)
- `npm run docs:check`: PASS
- `npm run check:react`: PASS (React 18.3.1 singleton)
- Python ruff check: PASS (all checks passed, 95 files formatted)
- Python pytest: ENVIRONMENT-LIMITED (temporalio/numpy not installed in audit environment)

## Platform Facts

| Field | Value |
|---|---|
| Package version | 1.6.0 (from package.json) |
| Latest inspected main commit | 0f1365d (Merge PR #1153 — post-audit CodeX hardening) |
| Repo | apexbusiness-systems/APEX-OmniHub |
| Local gate verification | 2026-05-14 — all gates clean on current main (see §Local Gate Audit below) |

## Authority

| Concern | Authority |
|---|---|
| CI authority | `.github/workflows/` — all required gates must be green |
| Release authority | `.github/workflows/release.yml` — publishes changesets + uploads `release-evidence.json` |
| Deployment authority | Cloudflare Pages (production) — provisioned externally, not in repo |
| Certification authority | This document + `release-evidence.json` artifact from latest release run |

## Current Certification Verdict

**`NOT_CERTIFIED_BLOCKED`** (B-2 only remains)

### Active Blockers

| ID | Blocker | Severity | Status | Doc |
|---|---|---|---|---|
| B-1 | Shadow deployment slot not provisioned (no Cloudflare Pages shadow project, no `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets set) | P0 | **RESOLVED 2026-05-20** — apex-omnihub-shadow project created; all 6 required secrets/variables set. | `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` |
| B-2 | `release-evidence.json` with `CERTIFIED` or `CERTIFICATION_PENDING_FINAL_MAIN_CI` verdict not yet produced by a real release run | P0 | **PENDING** — requires PR #1184 merge and release workflow run. | `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` |
| B-3 | GitHub Environment `production-shadow` for Terraform apply approval not yet configured | P1 | **RESOLVED 2026-05-20** — production-shadow GitHub Environment created with required-reviewer protection. | `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` |

### Path to CERTIFIED

1. ~~Provision Cloudflare Pages shadow slot~~ — **DONE** 2026-05-20 (apex-omnihub-shadow created)
2. ~~Set repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`~~ — **DONE** 2026-05-20
3. ~~Set repository variables: `CLOUDFLARE_SHADOW_PROJECT_NAME`, `ENABLE_SHADOW_DEPLOYMENT=true`, `SHADOW_HEALTH_URL`, `ENABLE_ATOMIC_ROUTING_FLIP=true`~~ — **DONE** 2026-05-20
4. ~~Configure GitHub Environment `production-shadow` with required reviewers~~ — **DONE** 2026-05-20
5. Merge PR #1184 to main → release workflow publishes changeset v1.6.1 → shadow deploy to apex-omnihub-shadow → health check passes → Terraform plan → production-shadow environment reviewer approves → `release-evidence.json` written with `CERTIFIED` verdict
6. Update this document to `CERTIFIED` with evidence link

## Local Gate Audit — 2026-05-14 (main @ 0f1365d)

All required quality gates verified clean on current main. CI must also confirm green post-push to achieve `CERTIFIED`.

| Gate | Command | Result |
|---|---|---|
| TypeScript | `bun run typecheck` | ✅ 0 errors |
| ESLint | `bun run lint` | ✅ 0 warnings |
| Tests | `bun run test` | ✅ 2488 passed, 0 failed |
| Build | `bun run build` | ✅ succeeded (17s) |
| Bundle size | `size-limit` | ✅ JS 115 KB / 800 KB, React 57 KB / 150 KB |
| React singleton | `bun run check:react` | ✅ React 18.3.1 only |
| Docs integrity | `bun run docs:check` | ✅ no broken links/pointers |
| npm audit (prod) | `npm audit --omit=dev --audit-level=high` | ✅ 0 vulnerabilities |
| Security posture | `bash scripts/security/security-posture-check.sh` | ✅ 9/9 (100%) |
| Secret scan | `bun run secret:scan` | ✅ no secrets found |
| Repo hygiene | `bash scripts/repo-hygiene-guard.sh` | ✅ no artifact files tracked |
| RLS posture | `bash scripts/security/check_rls_posture.sh` | ✅ PASS |
| Legal drift | `node scripts/compliance/check_legal_drift.mjs` | ✅ PASS |
| Claims proof | `node scripts/compliance/check_claims_proof.mjs` | ✅ PASS |
| Additive migrations (CI sim) | `GITHUB_BASE_REF=main bun run scripts/ci/check-additive-migrations.ts` | ✅ 4 files, 0 violations |
| Armageddon certify | `bun run armageddon:certify:ci` | ✅ PASS |
| OmniEval | `bun run eval:ci` | ✅ 16/16 passed (100%), 0 policy violations |
| Infrastructure tests | `bun run test:infra` | ✅ 7 passed |

## Known Advisories (non-blocking)

| Advisory | Notes |
|---|---|
| `postcss <8.5.10` moderate vuln | Acceptable per CLAUDE.md §12 |
| `uuid 11.0.0–11.1.0` moderate vuln | Acceptable per CLAUDE.md §12 |

## Evidence Links

- CI workflow runs: https://github.com/apexbusiness-systems/APEX-OmniHub/actions
- Release workflow: https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/release.yml
- Preflight audit: `docs/audits/PRODUCTION_CERTIFICATION_PREFLIGHT_2026-05-13.md`
- Evidence pack: `docs/audits/PRODUCTION_CERTIFICATION_EVIDENCE_2026-05-13.md`

## Verdict Enum

| Value | Meaning |
|---|---|
| `NOT_CERTIFIED_BLOCKED` | Active P0 blockers prevent certification |
| `CERTIFICATION_PENDING_FINAL_MAIN_CI` | All local gates pass; awaiting main CI run + release evidence |
| `CERTIFIED` | Latest main CI green + release-evidence.json confirms certification |

## Owner

APEX Business Systems — Release Engineering
Updated by: Tech-debt resolution audit (2026-05-14) — main @ 0f1365d
