# Doc Reconciliation Matrix (Phase 2)

## Vercel Reference Classification

LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical. Any Vercel commands, rollback paths, modules, or Edge Runtime references in this document are not current deployment proof unless separately labeled VERIFIED with active configuration evidence. See `docs/architecture/CANONICAL_TRUTH_MATRIX.md`.


Last Updated: 2026-05-12

| File | Status | Notes | Action |
|---|---|---|---|
| `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` | current | Rewritten to align with code/runtime topology. | keep as canonical map |
| `docs/architecture/CANONICAL_TRUTH.md` | current | New single-source truth for deployment/build topology. | maintain |
| `docs/infrastructure/MIGRATION_RUNBOOK.md` | current | Migrated from Vercel-era instructions to Cloudflare Pages + Supabase flow. | maintain |
| `docs/infrastructure/PRODUCTION_DEPLOYMENT_GUIDE.md` | current | Simplified and aligned with current CI/security/deploy flow. | maintain |
| `docs/infrastructure/CI_RUNTIME_GATES.md` | current | Updated to match modern multi-phase guardrail workflow. | maintain |
| `docs/ops/OPS_RUNBOOK.md` | deprecated | Retained for historical traceability only. | do not use for active ops |
| `docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md` | current | Elevated as active ops index with canonical linkouts. | maintain |
| `docs/sim/RUNBOOK.md` | current | Safety rails and execution guidance are still strong. | maintain |
| `orchestrator/README.md` | current | Matches worker/API split and Temporal architecture. | maintain |
| `orchestrator/ARCHITECTURE.md` | current | Detailed and directionally correct. | maintain |
| `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts` | current | Canonical 9-widget OmniDash left-sidebar rail contract; separate from `APP_REGISTRY` and `OMNIDASH_CONTRACT`. | maintain with sidebar contract tests |
