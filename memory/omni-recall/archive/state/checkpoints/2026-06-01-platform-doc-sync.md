---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---
> **Historical Note:** This document contains legacy certification terminology. It has been superseded by the manual owner-approval process. CI now produces factual validation summaries only. CI validates. Owner certifies.

# 2026-06-01 Platform Documentation Synchronization Checkpoint

- date: 2026-06-01
- branch: work
- verified_head: 86bc14a (`feat(omnidash): implement from-zero gap closure (WP0-WP17) (#1274)`)
- package_version: 1.7.0
- app_package_version: apps/omnihub-site 1.3.10
- purpose: eliminate documentation drift after PR #1274 OmniDash gap closure and PR #1309 security hardening.

## Current Durable Facts

- The latest verified branch state is no longer the 2026-05-31 `7a2c45ed` post-PR-1251 snapshot.
- OmniDash is the canonical post-auth surface at `/omnidash`, `/omnidash/*`, `/dashboard`, and `/dashboard/*`.
- `OmniDashShell.tsx` is current shell authority; `OmniDashLayout.tsx` references are stale unless explicitly historical.
- `apex-agent` remains the canonical Supabase function slug; `apex-assistant` is legacy/410.
- Current repo counts: 353 `src/` files, 318 root TypeScript/TSX files, 30 Supabase function directories, 84 migrations, 22 workflows, 319 test/spec sources, 101 orchestrator Python files.
- PR #1274 added agent avatar contracts/assets, live OmniDash widget hardening, persistent OmniSlate/notification stores, and broad OmniDash guardrail tests.
- PR #1309 hardened subscription activation RPC and enforced HMAC validation on PhysiOmni ingress.

## Documentation Files Updated in the Session

- `docs/CURRENT_PLATFORM_STATE_2026_06_02.md`
- `README.md`
- `CHANGELOG.md`
- `docs/README.md`
- `docs/DOCUMENTATION_RELEASE_INDEX.md`
- `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`
- `docs/architecture/CANONICAL_TRUTH.md`
- `docs/architecture/CANONICAL_TRUTH_MATRIX.md`
- `docs/architecture/DOC_RECONCILIATION_MATRIX.md`
- `docs/platform/OMNIDASH.md`
- `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md`
- `docs/ops/OPS_RUNBOOK.md`
- `docs/onboarding/DEVELOPER_ONBOARDING.md`
- `apps/omnihub-site/FRONTEND_ARCHITECTURE_MAP.md`
- `apps/omnihub-site/marketing-site-README.md`
- `apps/omnihub-site/CHANGELOG.md`
- `memory/omni-recall/start-here.md`
- `memory/omni-recall/state/checkpoints/current-status.md`
- `memory/omni-recall/wiki/source_indexes/omni-recall-source-index.md`

## Future-Agent Guardrail

If a future agent sees a doc claim that production status is based on `7a2c45ed`, `2026-05-31`, `OmniDashLayout.tsx`, or an off-by-default `OMNIDASH_ENABLED` model, treat it as stale and reconcile against `docs/CURRENT_PLATFORM_STATE_2026_06_02.md` plus the live code tree.
