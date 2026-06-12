---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Production Certification Status

> **This is the canonical source for current certification state.**
> All other docs (PRODUCTION_STATUS.md, audit reports, README) defer here.
> Last updated: 2026-06-06

## 2026-06-06 Full Audit Addendum

Full OMEGA SCAN performed against `main` @ `c8d753c5` (June 5 2026 — latest commit). All local quality gates are green. The sole remaining item blocking `CERTIFIED` is execution of the release workflow in GitHub Actions CI with real secrets — not a code defect.

### Local Gate Audit — 2026-06-06 (main @ c8d753c5)

| Gate | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| ESLint | `npx eslint . --max-warnings 0` | ✅ 0 warnings |
| Tests | `npm run test` | ✅ 2,561 passed, 0 failed (70 skipped / 30 todo) |
| Build | `npm run build` | ✅ succeeded (17s) |
| React singleton | `npm run check:react` | ✅ React 18.3.1 only |
| Docs integrity | `npm run docs:check` | ✅ no broken links/pointers |
| npm audit (prod, HIGH+) | `npm audit --omit=dev --audit-level=high` | ✅ 0 high/critical vulnerabilities |

### Platform Facts — 2026-06-06

| Field | Value |
|---|---|
| Package version | 1.7.0 |
| HEAD (main) | `c8d753c5` — ⚡ Bolt: Optimize O(N*M) loop evaluations using O(1) Sets (#1334) |
| `chore: version packages` commit on main | `959a8fd6` — June 5, 2026 |
| src/ TypeScript/TSX files | 317 |
| Supabase Edge Function directories | 29 (including `_shared`) |
| SQL migration files | 88 |
| Test spec files | 244 |
| GitHub workflow files | 22 |
| Vitest version | `^4.1.8` |

### Remaining Gaps (non-blocking for CI release run)

| ID | Gap | Severity |
|---|---|---|
| G-1 | `SentinelPanel.tsx` — `TRACE_FEED` is a static hardcoded array; `demoMode` initialises `true`. Needs `audit_log` Realtime subscription. | P1 |
| G-2 | `NotificationCenter.tsx` — Zustand store wired correctly; needs live Realtime subscription on `omnilink_orchestration_requests` `status='waiting_approval'`. | P1 |
| G-3 | `DashboardOverview` `EcosystemPane`/`AppsSection` — needs `integrations` + `omnilink_events` live wiring for module counts. | P1 |
| G-4 | 30 `it.todo()` tests across `theme-system`, `production-truthfulness`, `fake-success-guardrails`, `zero-mock-widgets`, `prompt16/17 smoke` — skeletons with no implementation. | P2 |
| G-5 | `hono@4.12.18` moderate CVE (GHSA-xrhx-7g5j-rcj5 et al) via transitive dep `wagmi→porto`. `overrides.hono` pinned to `^4.12.16`; bump to `^4.12.21` resolves advisory. | P2 |

### Path to `CERTIFIED` — Remaining Steps

1. **Trigger `release.yml` on main** (via empty commit push or manual workflow dispatch). The `chore: version packages` commit (`959a8fd6`) is already on main; the `release_signal` step will detect it via `git log`.
2. Shadow deploys to `apex-omnihub-shadow.pages.dev` → health check passes.
3. Approve `production-shadow` GitHub Environment gate (human reviewer).
4. `write-release-evidence.mjs` emits `CERTIFIED` verdict → upload artifact.
5. Update this document verdict to `CERTIFIED` with artifact link.

---

## 2026-06-01 Branch-State Addendum

Current local branch inspection is `work` @ `86bc14a` with root package version `1.7.0`. Recent merged work includes PR #1274 OmniDash gap closure and PR #1309 entitlement/PhysiOmni ingress hardening. This addendum updates repo-state context only; it does **not** convert the platform to `CERTIFIED` without a current release-evidence artifact.


## 2026-06-04 PR #1263 Production Hardening Addendum

PR #1263 (`feat/omnidash-production-hardening`) is pending merge. It contains no schema changes or auth changes. All 42 CI checks: success or skipped.

**Changes included:**
- OmniDash modal trap fix: `DialogContent` now has `max-h-[calc(100dvh-2rem)] overflow-y-auto` — close button and footer always reachable regardless of modal content height.
- Zero mock data enforcement in all module modals: `moduleData.json` all entries `isDemo:true`; hardcoded fabricated literals removed from AuditsModule, BillingModule, SettingsModule, WorkflowsModule. Content derives from `state.stats`/`state.items` with graceful empty states. Complies with CLAUDE.md §1.3 zero-mock-data rule.
- PhysiOmni module wired to real `physiomni_devices` table (RLS: `tenant_id = auth.uid()`); static `demo-tenant-id` removed from cockpit launch URL.
- Governed CF Pages deploy workflow (`.github/workflows/deploy-production-cf-direct.yml`): replaces broken PR #1262 which targeted non-existent project `omnihub`. Correct target: `apex-omnihub` (repo variable, defaulted). Gated behind `production-shadow` GitHub Environment (human reviewer required). Real bundle smoke test verifies Supabase host baked into deployed JS.
- RSI policy v1.3.3: stale migration exclusion corrected, new workflow file excluded.

**Effect on certification verdict:** no change to `NOT_CERTIFIED_NO_RELEASE_CUT` — this is a non-release push (no changesets version PR). Shadow deployment certification path unchanged.

---

## 2026-05-20 B-2 Structural Fix Addendum

B-2's structural root cause has been resolved as of 2026-05-20 (PR #1185, commit `a54bd7c`).

The release workflow previously gated all shadow deployment and certification steps on `changesets.outputs.published == 'true'`. Because `package.json` has `"private": true`, `changeset publish` is always a no-op — `published` is always `'false'` — permanently blocking shadow certification regardless of actual release activity.

PR #1185 decouples shadow deployment from npm publish semantics:

- Added a `Detect release cut` step (`release_signal`) that sets `release_cut=true` when either the changesets action publishes (public repo path) **or** `git log -1 --format="%s"` detects a `"chore: version packages"` merge commit (private repo path).
- All five `published == 'true'` gating conditions replaced with `release_signal.outputs.release_cut == 'true'`.
- `write-release-evidence.mjs` updated: uses `releaseCut` in `computeVerdict`, reads `RELEASE_CUT_RAW`, emits `release_cut` in the JSON artifact, returns `NOT_CERTIFIED_NO_RELEASE_CUT` for no-release runs.
- Script injection fix: `github.event.head_commit.message` removed from `run` block; commit subject now read via `git log` (not event payload).

**B-2 evidence production still pending** — the structural path is clear, but `release-evidence.json` with a `CERTIFIED` verdict cannot be produced until the changesets version PR (`chore: version packages`) is created by the release workflow, merged to main, and the resulting release run completes the shadow deploy + health check sequence.

## 2026-05-20 Shadow Slot + Environment Provisioning Addendum

B-1 and B-3 are RESOLVED as of 2026-05-20. The apex-omnihub-shadow Cloudflare Pages project has been created and all required secrets and variables have been set in the GitHub repository. The production-shadow GitHub Environment has been created with required-reviewer protection.

Resolved in this pass:
- `apex-omnihub-shadow` Cloudflare Pages shadow slot provisioned.
- GitHub repository secrets set: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- GitHub repository variables set: `CLOUDFLARE_SHADOW_PROJECT_NAME=apex-omnihub-shadow`, `ENABLE_SHADOW_DEPLOYMENT=true`, `SHADOW_HEALTH_URL=https://apex-omnihub-shadow.pages.dev/health`, `ENABLE_ATOMIC_ROUTING_FLIP=true`.
- GitHub Environment `production-shadow` created with required-reviewer protection and `ENABLE_SHADOW_DEPLOYMENT=true` variable.


## 2026-05-16 Documentation Audit Addendum

This documentation audit updates indexes, maps, README links, RSI branch-protection guidance, and drift records to current repo truth. It does **not** change the certification verdict. `NOT_CERTIFIED_BLOCKED` remains in force until the release workflow produces the required certification evidence and the active blockers below are resolved.

Verified in this documentation pass:

- `bun run docs:check` passes for docs links and explicit code pointers.
- The current documentation index is `docs/DOCUMENTATION_RELEASE_INDEX.md`.
- Current RSI repository evidence is live mode in `policy/rsi-policy.yaml` with `.github/workflows/rsi-governance.yml` present.

## Platform Facts

| Field | Value |
|---|---|
| Package version | 1.7.0 (from package.json) |
| Latest main HEAD | `c8d753c5` — ⚡ Bolt: Optimize O(N*M) loop evaluations using O(1) Sets (#1334) — June 5, 2026 |
| `chore: version packages` on main | `959a8fd6` — June 5, 2026 |
| Repo | apexbusiness-systems/APEX-OmniHub |
| Local gate verification | 2026-06-06 — tsc exit 0, eslint exit 0, 2,561 tests passing |

## Authority

| Concern | Authority |
|---|---|
| CI authority | `.github/workflows/` — all required gates must be green |
| Release authority | `.github/workflows/release.yml` — publishes changesets + uploads `release-evidence.json` |
| Deployment authority | Cloudflare Pages (production) — provisioned externally, not in repo |
| Certification authority | This document + `release-evidence.json` artifact from latest release run |

## Current Certification Verdict

**`NOT_CERTIFIED_NO_RELEASE_CUT`** — All local gates pass; `chore: version packages` merged; release workflow execution with real secrets pending

### Active Blockers

| ID | Blocker | Severity | Status | Doc |
|---|---|---|---|---|
| B-1 | Shadow deployment slot not provisioned (no Cloudflare Pages shadow project, no `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets set) | P0 | **RESOLVED 2026-05-20** — apex-omnihub-shadow project created; all 6 required secrets/variables set. | `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` |
| B-2 | `release-evidence.json` with `CERTIFIED` verdict not yet produced by a real release workflow run with CI secrets | P0 | **`chore: version packages` MERGED 2026-06-05** (`959a8fd6`) — `release_signal` step will detect it; release workflow must be triggered via CI to produce evidence. | `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` |
| B-3 | GitHub Environment `production-shadow` for Terraform apply approval not yet configured | P1 | **RESOLVED 2026-05-20** — production-shadow GitHub Environment created with required-reviewer protection. | `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` |

### Path to CERTIFIED

1. ~~Provision Cloudflare Pages shadow slot~~ — **DONE** 2026-05-20 (apex-omnihub-shadow created)
2. ~~Set repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`~~ — **DONE** 2026-05-20
3. ~~Set repository variables: `CLOUDFLARE_SHADOW_PROJECT_NAME`, `ENABLE_SHADOW_DEPLOYMENT=true`, `SHADOW_HEALTH_URL`, `ENABLE_ATOMIC_ROUTING_FLIP=true`~~ — **DONE** 2026-05-20
4. ~~Configure GitHub Environment `production-shadow` with required reviewers~~ — **DONE** 2026-05-20
5. ~~Decouple release workflow from npm publish semantics~~ — **DONE** 2026-05-20 (PR #1185, commit `a54bd7c`). `release_signal` step detects version-PR merge via `git log`; all 5 gating conditions updated; `write-release-evidence.mjs` updated.
6. ~~Merge `chore: version packages` to main~~ — **DONE** 2026-06-05 (`959a8fd6`). `release_signal` will detect this commit subject.
7. **NEXT ACTION:** Trigger `release.yml` on main (push empty commit or manual workflow dispatch) → shadow deploys to `apex-omnihub-shadow` → health check passes → `production-shadow` reviewer approves → `release-evidence.json` written with `CERTIFIED` verdict
8. Update this document to `CERTIFIED` with evidence artifact link

## Local Gate Audit — 2026-06-06 (main @ c8d753c5)

All required quality gates verified clean on current main HEAD.

| Gate | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| ESLint | `npx eslint . --max-warnings 0` | ✅ 0 warnings |
| Tests | `npm run test` | ✅ 2,561 passed, 0 failed (70 skipped / 30 todo, 245 files) |
| Build | `npm run build` | ✅ succeeded (17s) |
| React singleton | `npm run check:react` | ✅ React 18.3.1 only |
| Docs integrity | `npm run docs:check` | ✅ no broken links/pointers |
| npm audit (prod, HIGH+) | `npm audit --omit=dev --audit-level=high` | ✅ 0 high/critical vulnerabilities |

_Prior audit 2026-05-14 (main @ 0f1365d) — see history for full gate table from that pass._

## Known Advisories (non-blocking)

| Advisory | Notes |
|---|---|
| `hono <=4.12.20` moderate CVE (GHSA-xrhx-7g5j-rcj5 et al) | Transitive via `wagmi→@wagmi/connectors→porto`. `overrides.hono` in `package.json` currently pins `^4.12.16`; bump to `^4.12.21` to resolve. Not used in APEX production source paths — acceptable until next dependency maintenance window. |
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
Updated by: Tech-debt resolution audit (2026-05-14) — main @ 0f1365d; B-2 structural fix (2026-05-20) — main @ a54bd7c (PR #1185); Full OMEGA SCAN audit (2026-06-06) — main @ c8d753c5
