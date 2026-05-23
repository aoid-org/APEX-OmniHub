---
name: apex-omnihub
description: APEX-OmniHub — canonical platform monorepo for APEX Business Systems
type: project
verified: true
last-verified: 2026-05-23
---

# APEX-OmniHub

## One-Line Definition

The canonical platform hub repository for APEX Business Systems — all active products, shared packages, infrastructure, and governance in one Turborepo monorepo.

## Remote

`https://github.com/apexbusiness-systems/APEX-OmniHub.git`
Default branch: `main`

## Observed Structure (2026-05-23)

Verified from GitHub API root listing:
- `apps/` — product applications
- `packages/` — shared packages
- `services/` — microservices (currently: `orchestrator`)
- `api/` — API layer
- `src/` — core source
- `supabase/` — Supabase config and migrations
- `terraform/` — infrastructure as code
- `scripts/` — tooling
- `docs/` — documentation
- `tests/` + `e2e/` — test suites
- `security/` — gitleaks, trufflehog config
- `governance/` + `policy/` — governance layer
- `omega/`, `sandbox/`, `sim/`, `edge/` — specialized environments
- `android/`, `ios/` — mobile targets
- `capacitor.config.ts` — Capacitor bridge
- `hardhat.config.cts` — blockchain layer
- `turbo.json` — Turborepo orchestration
- `memory/omni-recall/` — this continuity system

## Active Products in Org (verified 2026-05-23)

| Product | Visibility | Updated |
|---|---|---|
| APEX-OmniHub | public | 2026-05-23 |
| autorep-ai-console | public | 2026-05-23 |
| aSpiral | public | 2026-05-23 |
| jubeeloveai | public | 2026-05-23 |
| sbbl-hq | public | 2026-05-21 |
| DueRadar | public | 2026-05-21 |
| trutalk | public | 2026-05-20 |
| agrisense-ai | **private** | 2026-05-20 |
| CareConnect | **private** | 2026-05-20 |
| Armageddon-Core | public | 2026-05-17 |
| FLOWBills | public | 2026-05-12 |
| TradeLine247 | public | 2026-05-05 |

## Backfill Status

Verified from GitHub API in-session 2026-05-23. Full git history not yet ingested — marked pending.
