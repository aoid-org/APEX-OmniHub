# Production Certification Status

> **This is the canonical source for current certification state.**
> All other docs (PRODUCTION_STATUS.md, audit reports, README) defer here.
> Last updated: 2026-05-13

## Platform Facts

| Field | Value |
|---|---|
| Package version | 1.6.0 (from package.json) |
| Latest inspected main commit | 58e93e1fd83b557d4926a058e9ea4237a743df2e |
| Repo | apexbusiness-systems/APEX-OmniHub |
| Branch inspected | main |

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
4. Merge this PR to main and confirm all required CI gates pass
5. Confirm release workflow runs and produces `release-evidence.json` with `CERTIFIED` verdict
6. Update this document to `CERTIFIED` with evidence link

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
Updated by: Production Certification Hardening (2026-05-13)
