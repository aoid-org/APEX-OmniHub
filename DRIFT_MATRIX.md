# Documentation Drift Matrix

| Topic | Canonical Truth | Conflicting File(s) | Issue Type | Exact Fix Made | Disposition |
| --- | --- | --- | --- | --- | --- |
## 2026-05-20 Tech Debt Audit + CI Hardening Pass

| Topic | Canonical Truth | Conflicting/Changed File(s) | Issue Type | Exact Fix Made | Disposition |
|-------|----------------|----------------------------|-----------|----------------|-------------|
| GitHub Action SHA pinning | All GH Actions must use pinned commit SHAs | `.github/workflows/integration.yml`, `.github/workflows/deploy-omnihub-proof.yml` | Security drift | Pinned checkout@v4→SHA, setup-node@v4→SHA, wrangler-action@v3→SHA | Corrected 2026-05-20 |
| Node version in CI | package.json engines requires >=22 <25 | `.github/workflows/integration.yml` node-version: '20' | Version drift | Changed node-version to '24' | Corrected 2026-05-20 |
| GH_PAT exposure in clone URL | Secrets must not appear in logged URLs | `.github/workflows/integration.yml` git clone with token in URL | Security drift | Replaced with git config credential substitution | Corrected 2026-05-20 |
| Dependency auto-merge gate | Auto-merge must only occur when CI is green | `.github/workflows/dependency-consolidation.yml` force-merging CI-failing PRs | CI integrity | Added mergeable_state === 'clean' check before merge | Corrected 2026-05-20 |
| Lighthouse CI enforcement | Accessibility must be enforced as hard gate | `.lighthouserc.json` — accessibility and color-contrast were 'warn' | Quality drift | Changed categories:accessibility and color-contrast to 'error' | Corrected 2026-05-20 |
| SonarCloud coverage scope | Frontend src/apps/packages must be in coverage | `sonar-project.properties` — src/**, apps/**, packages/** excluded | Coverage gap | Removed those three globs from sonar.coverage.exclusions | Corrected 2026-05-20 |
| Stripe webhook secret validation | Missing secrets must return 503, not silently fail | `supabase/functions/stripe-webhook/index.ts` — ?? '' fallback | Security gap | Moved reads inside handler, added explicit 503 guard | Corrected 2026-05-20 |
| ORCHESTRATOR_SHARED_SECRET validation | Missing signing secret must throw, not use empty string | `supabase/functions/_shared/requestSigning.ts` — ?? '' fallback | Security gap | Throws Error if secret absent | Corrected 2026-05-20 |

| **Package Manager Authority** | `npm` is authoritative for CI/releases (`package-lock.json`), Node 24 is target. `bun` is optional/local. | `CLAUDE.md`, `docs/architecture/CANONICAL_TRUTH.md`, `docs/onboarding/DEVELOPER_ONBOARDING.md` | Authority Contradiction | Updated onboarding commands to use `npm`, clarified `bun` is optional local-only in `CLAUDE.md` and `CANONICAL_TRUTH.md`. | Corrected |
| **Hosting Target** | Cloudflare Pages is the canonical web runtime & edge compute platform. | `README.md`, `docs/project-status/PRODUCTION_STATUS.md` | Legacy State | Marked Vercel Edge proxy mentions as historical / legacy. | Corrected / Marked historical |
| **Local Setup Truth** | One command `docker compose -f docker-compose.dev.yml up` starts frontend + Temporal + Redis. | `README.md` | Minor Error | None. Checked and verified to be correct. | Flagged but intentionally untouched |
| **Production Status Framing** | OmniHub uses cloud Supabase, Cloudflare Pages, Temporal. | `docs/project-status/PRODUCTION_STATUS.md` | Legacy State | Updated to clearly frame Vercel elements as historical artifacts superseded by Cloudflare Pages. | Corrected |
| **OmniDash left-sidebar source of truth** | Sidebar is a 9-widget rail owned by `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`; `APP_REGISTRY` and `OMNIDASH_CONTRACT` remain 14-app product/platform contracts. | `apps/omnihub-site/dashboard/OmniDashShell.tsx`, `docs/platform/OMNIDASH.md`, `docs/architecture/CANONICAL_TRUTH.md`, `docs/architecture/frontend-map.md`, `docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md`, `docs/onboarding/DEVELOPER_ONBOARDING.md` | Contract Boundary Drift | Added sidebar contract docs, onboarding note, architecture map entries, runbook, ESLint drift guard, and contract tests. | Corrected 2026-05-12 |
## 2026-05-12 Docs Drift Remediation Pass

Actual files changed in this pass:
- `docs/rsi/BRANCH_PROTECTION_REQUIRED.md`
- `docs/architecture/LIB_DIRECTORY_POLICY.md`
- `docs/infrastructure/PORTABILITY_MATRIX.md`
- `docs/architecture/OMNILINK_PORTABILITY_AND_SRE_STRATEGY.md`
- `docs/infrastructure/DISASTER_RECOVERY_PLAN.md`
- `docs/infrastructure/PATH_B_CONTAINERIZED_MULTICLOUD.md`
- `docs/infrastructure/CLOUD_AGNOSTIC_ARCHITECTURE.md`
- `docs/ops/OPERATIONAL_EXCELLENCE.md`
- `docs/knowledge/references/cloud.md`


## 2026-05-16 Current-Tree Documentation Audit Pass

- Created `docs/DOCUMENTATION_RELEASE_INDEX.md` as the current inventory and authority-order index for maps, READMEs, status documents, audits, and runbooks.
- Updated `README.md` and `docs/README.md` to point onboarding agents to the current documentation index and certification authority, and refreshed top-level repo statistics from live file counts.
- Updated `docs/rsi/BRANCH_PROTECTION_REQUIRED.md` to reflect current RSI live-mode repo evidence and the active RSI workflow while preserving the manual branch-protection caveat.
- Updated `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`, `docs/architecture/DOC_RECONCILIATION_MATRIX.md`, and `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` with current-tree documentation audit notes without changing the certification verdict.
- Corrected `.github/pull_request_template.md` onboarding link so the PR template resolves to the actual developer onboarding document.

## 2026-05-20 Certification Infrastructure + Docs Remediation Pass

Actual changes made in this pass:

- `apex-omnihub-shadow` Cloudflare Pages shadow slot provisioned via Cloudflare API (B-1 resolved). GitHub repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set. GitHub repository variables `CLOUDFLARE_SHADOW_PROJECT_NAME=apex-omnihub-shadow`, `ENABLE_SHADOW_DEPLOYMENT=true`, `SHADOW_HEALTH_URL=https://apex-omnihub-shadow.pages.dev/health`, and `ENABLE_ATOMIC_ROUTING_FLIP=true` set.
- GitHub Environment `production-shadow` created with required-reviewer protection rule and `ENABLE_SHADOW_DEPLOYMENT=true` environment variable (B-3 resolved).
- `omega/` APEX Resilience Protocol canonicalised in `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` and `CLAUDE.md`: added as a distinct runtime entry separate from `orchestrator/` and `services/orchestrator/`.
- `orchestrator/` vs `services/orchestrator/` vs `omega/` disambiguation table added to both `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` and `CLAUDE.md` to prevent future confusion between the three similarly-named Python areas.
- `vitest.config.ts` branch coverage threshold raised from 60 to 63 (statements 69→70, functions 71→72, lines 70→71) to match current passing test suite coverage.
- Changeset `shadow-slot-coverage-docs.md` added for v1.6.1 patch release (PR #1184).
- Comprehensive documentation audit performed 2026-05-20: stale docs archived or updated, certification status and blocker docs updated to reflect B-1 and B-3 resolution.
