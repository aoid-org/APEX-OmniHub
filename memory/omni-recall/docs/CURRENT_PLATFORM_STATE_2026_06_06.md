---
version: 1.0.0
last_audited: 2026-06-12
status: archived
archived_date: 2026-06-21
superseded_by: CURRENT_PLATFORM_STATE_2026_06_22.md
---

# Current Platform State — 2026-06-06

> **Canonical drift-control snapshot for `main` HEAD.** This file supersedes `docs/CURRENT_PLATFORM_STATE_2026_06_02.md` as the current onboarding entry point. Historical docs remain valid as evidence only when they do not conflict with this snapshot, `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md`, or `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`.

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-06-06 |
| Branch inspected | `main` |
| HEAD inspected | `c8d753c5` — ⚡ Bolt: Optimize O(N*M) loop evaluations using O(1) Sets (#1334) |
| Package version | `1.7.0` in root `package.json` |
| App package version | `1.3.10` in `apps/omnihub-site/package.json` |
| Package manager posture | npm-first for CI (`package-lock.json` canonical); bun optional for local dev (`bun.lock` committed) |
| Certification authority | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| Architecture authority | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` + `docs/architecture/CANONICAL_TRUTH.md` |

## Repo Facts Verified from the Working Tree

| Area | Current count / state |
|---|---:|
| Source files under `src/` | 317 TypeScript/TSX files |
| Root React `.tsx` component files under `src/` | 94 |
| OmniHub site dashboard files | 81 |
| Supabase Edge Function directories | 29 (including `_shared`) |
| Supabase SQL migrations | 88 top-level migration files |
| GitHub workflow files | 22 |
| Test/spec sources across root/app/orchestrator/package test trees | 244 |
| Hook files matching `use*.ts*` across root/app surfaces | 35 |
| Python orchestrator files | 101 |

## Local Gate Verification (2026-06-06)

| Gate | Result |
|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ 0 errors |
| ESLint (`npx eslint . --max-warnings 0`) | ✅ 0 warnings |
| Vitest (`npm run test`) | ✅ 2,561 passed, 0 failed (70 skipped / 30 todo, 245 files) |
| Production build (`npm run build`) | ✅ 17s, clean output |
| React singleton (`npm run check:react`) | ✅ React 18.3.1 only |
| Docs drift (`npm run docs:check`) | ✅ no broken links/pointers |
| npm audit prod HIGH+ | ✅ 0 high/critical (1 moderate: hono transitive via wagmi) |

## Recent Git History Assessment

The most important recent commits since the 2026-06-02 snapshot:

1. `c8d753c5` — PR #1334: Optimize O(N*M) loop evaluations in `TriforceGuardian.ts` and `SemanticRouter.ts` to O(1) Set lookups (June 5, 2026)
2. `7fd31ce4` — PR #1338: Update sitemap lastmod dates to 2026-06-05
3. `0e02efcc` — fix(ci): handle flip bypass in shadow preflight
4. `959a8fd6` — **`chore: version packages`** — changesets version commit on main; `release_signal` in `release.yml` will detect this. This is the final prerequisite for release workflow certification.
5. `dde7643d` — PR #1336: OmniDash right sidebar live feed + left sidebar demo mode
6. `fb0109b2` — PR #1335: OmniDash production hardening — modal fix, zero mock data, governed CF deploy

## Current Architecture Truth

### Runtime Planes

| Plane | Current implementation |
|---|---|
| Frontend control plane | React 18 + Vite 7 + TypeScript in `apps/omnihub-site/`, routed by `apps/omnihub-site/src/App.tsx` |
| Post-auth product surface | OmniDash at `/omnidash`, `/omnidash/*`, `/dashboard`, and `/dashboard/*` |
| Public/pre-auth surface | Marketing, legal, demo, product, and feature routes in `preAuthRoutes` inside `apps/omnihub-site/src/App.tsx` |
| Edge/API plane | Supabase Edge Functions in `supabase/functions/`; `apex-agent` is canonical and `apex-assistant` is legacy/deprecated |
| Data plane | Supabase Postgres migrations in `supabase/migrations/`; 88 migration files including 2026-06-01 subscription activation hardening |
| Workflow plane | Python Temporal orchestrator under `orchestrator/` |
| Governance/CI plane | GitHub Actions workflows under `.github/workflows/`; RSI policy live in `policy/rsi-policy.yaml` |

### OmniDash Current Contract

- `OmniDashShell.tsx` is the canonical shell. Do not refer to `OmniDashLayout.tsx` as current shell authority.
- The left sidebar rail is a locked 9-widget contract sourced from `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`.
- Product/platform apps remain a separate 14-app registry in `packages/core/src/registry.ts` and `src/contracts/omnidash.contract.ts`.
- APEX app ecosystem display uses `apps/omnihub-site/dashboard/contracts/apexApps.ts`.
- Agent avatar selection and asset paths use `apps/omnihub-site/dashboard/contracts/agentAvatars.ts`.
- Integration ownership copy/source-of-truth uses `apps/omnihub-site/dashboard/contracts/appIntegrationOwnership.ts`.
- The UI is always-on post-auth; old docs that say `OMNIDASH_ENABLED=0/1` gates access are stale.

### OmniDash Real-Data vs Mock Status

| Panel | Data Status | Source |
|---|---|---|
| Tasks | REAL DATA | `omnilink_orchestration_requests`, `integrations`, `omnilink_api_keys` |
| Events | REAL DATA | `omnilink_events` |
| Approvals | REAL DATA | `omnilink_orchestration_requests` (via rpc `omnilink_set_approval`) |
| Integrations | REAL DATA | `integrations`, `omnilink_api_keys`, `omnilink_events` |
| Entities | REAL DATA | `omnilink_entities` |
| Runs | REAL DATA | `omni-runs` (Edge Function via `omnilink_runs`) |
| LocalAgents | REAL DATA | `omnilink_events` |
| Ops | REAL DATA | `omnidash_today_items`, `omnidash_pipeline_items`, `omnidash_kpi_daily`, `omnidash_incidents`, `memory_health_stats` |
| OmniTraceFeed | REAL DATA | `audit_log` (Realtime), Gateway SSE |
| NotificationCenter | PARTIAL — Zustand store wired; **pending** Realtime subscription on `omnilink_orchestration_requests` | P1 gap |
| SentinelPanel | MOCK — `TRACE_FEED` static array; `demoMode=true` on init; **pending** `audit_log` Realtime wiring | P1 gap |
| DashboardOverview (EcosystemPane/AppsSection) | PARTIAL — **pending** `integrations` + `omnilink_events` live wiring | P1 gap |

## Certification and Release Posture

- Root package version is 1.7.0.
- `chore: version packages` commit (`959a8fd6`) is on main as of June 5, 2026.
- All local quality gates are green as of this snapshot.
- `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` remains the certification authority.
- Current verdict: **`NOT_CERTIFIED_NO_RELEASE_CUT`** — one CI release workflow run required.
- Do not claim `CERTIFIED` unless a current `release-evidence.json` artifact with an accepted final verdict exists for this release line.

## Documentation Drift Findings Resolved in This Pass (2026-06-06)

| Drift | Resolution |
|---|---|
| `PRODUCTION_CERTIFICATION_STATUS.md` referenced stale HEAD `e5b93237` and pending PR #1263 | Updated to `c8d753c5`; PR #1263 is merged; 2026-06-06 gate audit added |
| `PRODUCTION_CERTIFICATION_STATUS.md` verdict was `NOT_CERTIFIED_BLOCKED` | Updated to `NOT_CERTIFIED_NO_RELEASE_CUT` — B-1/B-3 resolved, `chore: version packages` merged, only CI execution pending |
| `PRODUCTION_CERTIFICATION_STATUS.md` listed outdated local gate results (2488 tests, 2026-05-14) | Updated to 2,561 tests, 2026-06-06 |
| `PRODUCTION_CERTIFICATION_STATUS.md` missing hono CVE advisory | Added to Known Advisories |
| `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` B-2 still marked STRUCTURAL FIX only | Updated: `chore: version packages` now merged; CI execution is final remaining step |
| `docs/DOCUMENTATION_RELEASE_INDEX.md` pointed to `CURRENT_PLATFORM_STATE_2026_06_02.md` as current | Updated canonical start point to this file |
| `README.md` stats snapshot dated 2026-06-01 | Updated to 2026-06-06 counts |
| `next-action.md` still listed PR #1313 as the highest-impact action | Updated to trigger `release.yml` |

## Operator Rules Going Forward

1. Before changing runtime topology, update this file and the canonical architecture map in the same PR.
2. Before changing OmniDash sidebar/app contracts, update tests in `tests/omnidash/` first, then update the relevant contract file.
3. Before changing Supabase functions or migrations, update edge-function and migration references in docs plus any security runbooks affected.
4. Before claiming production certification, attach release evidence; do not promote local pass counts to production certification.
5. Keep Omni-Recall checkpoint files current after major branch/head changes so future agents do not resume from stale commit facts.
6. The canonical current-state doc filename changes with each major snapshot; always update `docs/DOCUMENTATION_RELEASE_INDEX.md` canonical start point and `README.md` link together.
