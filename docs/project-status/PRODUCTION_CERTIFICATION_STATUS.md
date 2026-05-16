# Production Certification Status

> **This is the canonical source for current certification state.**
> All other docs (PRODUCTION_STATUS.md, audit reports, README) defer here.
> Last updated: 2026-05-16


## 2026-05-16 Documentation Audit Addendum

This documentation audit updates indexes, maps, README links, RSI branch-protection guidance, and drift records to current repo truth. It does **not** change the certification verdict. `NOT_CERTIFIED_BLOCKED` remains in force until the release workflow produces the required certification evidence and the active blockers below are resolved.

Verified in this documentation pass:

- `bun run docs:check` passes for docs links and explicit code pointers.
- The current documentation index is `docs/DOCUMENTATION_RELEASE_INDEX.md`.
- Current RSI repository evidence is live mode in `policy/rsi-policy.yaml` with `.github/workflows/rsi-governance.yml` present.

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

**`NOT_CERTIFIED_BLOCKED`**

### Active Blockers

| ID | Blocker | Severity | Doc |
|---|---|---|---|
| B-1 | Shadow deployment slot not provisioned (no Cloudflare Pages shadow project, no `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets set) | P0 | `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` |
| B-2 | `release-evidence.json` with `CERTIFIED` or `CERTIFICATION_PENDING_FINAL_MAIN_CI` verdict not yet produced by a real release run | P0 | `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` |
| B-3 | GitHub Environment `production-shadow` for Terraform apply approval not yet configured | P1 | `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` |

### Path to CERTIFIED

1. Provision Cloudflare Pages shadow slot (see `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md`)
2. Set repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
3. Set repository variables: `CLOUDFLARE_SHADOW_PROJECT_NAME`, `ENABLE_SHADOW_DEPLOYMENT=true`
4. ~~Merge tech-debt branch to main~~ — **DONE** (PR #1149, #1152, #1153 merged 2026-05-14)
5. Confirm release workflow runs and produces `release-evidence.json` with `CERTIFIED` verdict
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
