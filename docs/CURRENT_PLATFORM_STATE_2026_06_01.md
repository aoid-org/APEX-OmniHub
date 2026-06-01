# Current Platform State — 2026-06-01

> **Canonical drift-control snapshot for the current `work` branch.** This file reconciles current repo state, recent git history, architecture boundaries, documentation authority, and operator next steps. Historical docs remain valid as evidence only when they do not conflict with this snapshot, `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md`, or `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`.

## Verification Metadata

| Field | Value |
|---|---|
| Snapshot date | 2026-06-01 |
| Branch inspected | `work` |
| HEAD inspected | `86bc14a` — `feat(omnidash): implement from-zero gap closure (WP0-WP17) (#1274)` |
| Package version | `1.7.0` in root `package.json` |
| App package version | `1.3.10` in `apps/omnihub-site/package.json` |
| Package manager posture | Bun-first (`bun.lock` present) with npm lock retained for audit parity |
| Certification authority | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| Architecture authority | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` + `docs/architecture/CANONICAL_TRUTH.md` |

## Repo Facts Verified from the Working Tree

| Area | Current count / state |
|---|---:|
| Source files under `src/` | 353 |
| TypeScript/TSX under `src/` | 318 |
| Root React `.tsx` component files under `src/` | 94 |
| OmniHub site dashboard files | 81 |
| Supabase Edge Function directories | 30 including `_shared` |
| Supabase SQL migrations | 84 top-level migration files |
| GitHub workflow files | 22 |
| Test/spec sources across root/app/orchestrator/package test trees | 319 |
| Hook files matching `use*.ts*` across root/app surfaces | 35 |
| Python orchestrator files | 101 |

## Recent Git History Assessment

The current branch has advanced materially beyond the 2026-05-31 post-PR-1251 docs snapshot. The most important recent commits are:

1. `86bc14a` — PR #1274 implemented the OmniDash from-zero gap closure across WP0-WP17.
   - Added deterministic APEX Agent avatar contracts/assets.
   - Added OmniSlate context-drop, insights, payload-safety, fake-success, theme, integration-ownership, and zero-mock widget guard tests.
   - Added persistent notification and OmniSlate stores.
   - Hardened OmniDash module widgets, Settings, Translation, Integrations, WidgetShell, and live-data wiring.
   - Added PR #1274 audit/evidence reports under `docs/audits/`.
2. `3a51a27` — PR #1309 hardened entitlement activation RPC and PhysiOmni ingress.
   - Enforced activation RPC hardening via `20260601000000_harden_subscription_activation_rpc.sql`.
   - Added HMAC validation and negative tests for PhysiOmni ingress.
3. `e18a318`, `702554a`, `37066cc` — OmniDash live data, i18n safety, OmniBoard feed, and APEX app corrections.
4. `bec5113`, `7a495dd`, `ca592f9` — CI scanner and release/staging workflow fixes.

## Current Architecture Truth

### Runtime Planes

| Plane | Current implementation |
|---|---|
| Frontend control plane | React 18 + Vite 7 + TypeScript in `apps/omnihub-site/`, routed by `apps/omnihub-site/src/App.tsx` |
| Post-auth product surface | OmniDash at `/omnidash`, `/omnidash/*`, `/dashboard`, and `/dashboard/*` |
| Public/pre-auth surface | Marketing, legal, demo, product, and feature routes in `preAuthRoutes` inside `apps/omnihub-site/src/App.tsx` |
| Edge/API plane | Supabase Edge Functions in `supabase/functions/`; `apex-agent` is canonical and `apex-assistant` is legacy/Gone |
| Data plane | Supabase Postgres migrations in `supabase/migrations/`, including 2026-06-01 subscription activation hardening |
| Workflow plane | Python Temporal orchestrator under `orchestrator/` |
| Governance/CI plane | GitHub Actions workflows under `.github/workflows/`; RSI policy live in `policy/rsi-policy.yaml` |

### OmniDash Current Contract

- `OmniDashShell.tsx` is the canonical shell. Do not refer to `OmniDashLayout.tsx` as current shell authority.
- The left sidebar rail is a locked 9-widget contract sourced from `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`.
- Product/platform apps remain a separate 14-app registry in `packages/core/src/registry.ts` and `src/contracts/omnidash.contract.ts`.
- APEX app ecosystem display uses `apps/omnihub-site/dashboard/contracts/apexApps.ts`.
- Agent avatar selection and asset paths use `apps/omnihub-site/dashboard/contracts/agentAvatars.ts`.
- Integration ownership copy/source-of-truth uses `apps/omnihub-site/dashboard/contracts/appIntegrationOwnership.ts`.
- The UI is always-on post-auth; old docs that say `OMNIDASH_ENABLED=0/1` gates access are stale unless explicitly describing a historical release.

## Certification and Release Posture

- Root package version is 1.7.0; the branch includes post-1.7.0 hardening and OmniDash gap-closure work.
- `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` remains the certification authority.
- Do not claim `CERTIFIED` unless a current `release-evidence.json` artifact with an accepted final verdict exists for this release line.
- Local test/audit claims must include exact command, date, branch, and observed result.

## Documentation Drift Findings Resolved in This Pass

| Drift | Resolution |
|---|---|
| Docs index still described 2026-05-20 / v1.6.x facts | Updated index and linked this 2026-06-01 snapshot |
| Several docs referenced `OmniDashLayout.tsx` as shell authority | Updated active frontend docs to `OmniDashShell.tsx` |
| OmniDash doc still described a feature flag off-by-default model | Updated active OmniDash doc to always-on post-auth route model |
| Omni-Recall status stopped at 2026-05-31 / commit `7a2c45ed` | Added 2026-06-01 checkpoint for `86bc14a` branch state |
| README stats were 2026-05-31 counts | Updated to current counts from the working tree |

## Operator Rules Going Forward

1. Before changing runtime topology, update this file and the canonical architecture map in the same PR.
2. Before changing OmniDash sidebar/app contracts, update tests in `tests/omnidash/` first, then update the relevant contract file.
3. Before changing Supabase functions or migrations, update edge-function and migration references in docs plus any security runbooks affected.
4. Before claiming production certification, attach release evidence; do not promote local pass counts to production certification.
5. Keep Omni-Recall checkpoint files current after major branch/head changes so future agents do not resume from stale commit facts.
