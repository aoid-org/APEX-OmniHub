---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Doc Reconciliation Matrix (Phase 2)

## Vercel Reference Classification

LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical. Any Vercel commands, rollback paths, modules, or Edge Runtime references in this document are not current deployment proof unless separately labeled VERIFIED with active configuration evidence. See `docs/architecture/CANONICAL_TRUTH_MATRIX.md`.


Last Updated: 2026-06-01

| File | Status | Notes | Action |
|---|---|---|---|
| `docs/CURRENT_PLATFORM_STATE_2026_06_02.md` | current | Current branch/head assessment for `work` @ `86bc14a`, PR #1274, PR #1309, repo counts, and drift guardrails. | maintain after major branch/head changes |
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

## 2026-05-16 Current-Tree Documentation Audit Addendum

| File | Status | Notes | Action |
|---|---|---|---|
| `docs/DOCUMENTATION_RELEASE_INDEX.md` | current | Current inventory and authority order for maps, READMEs, status records, audits, and runbooks. | use as onboarding entry point |
| `README.md` | current | Updated top-level docs links and repo statistics to match current tree counts. | maintain with repo-count changes |
| `docs/README.md` | current | Updated docs index to point to the documentation release index and certification authority. | maintain with docs inventory changes |
| `docs/rsi/BRANCH_PROTECTION_REQUIRED.md` | current | Updated from stale snapshot/proposal-only language to current `mode: live` RSI workflow evidence while preserving manual branch-protection caveat. | maintain with RSI workflow/check changes |
| `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` | current authority | Certification verdict remains authoritative; this documentation audit does not convert `NOT_CERTIFIED_BLOCKED` to certified. | update only with release evidence |
| `.github/pull_request_template.md` | current | Link to developer onboarding corrected relative to `.github/`. | maintain with onboarding path changes |
