---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Documentation Release Index

> Current repo-truth index refreshed for the 2026-06-10 drift audit (post apex-skill-forge v9.4.0 merge, PR #1369). Use this file as the onboarding entry point for maps, READMEs, status records, audits, and runbooks. Historical docs remain useful as evidence, but current-state claims defer to the canonical files listed below and to `docs/CURRENT_PLATFORM_STATE_2026_06_06.md`.

## Current Repo Facts Verified in This Pass

| Fact | Current repo evidence |
|---|---|
| Documentation files under `docs/` | Current docs tree includes this 2026-06-06 platform-state snapshot; historical audit docs remain point-in-time evidence |
| GitHub workflow files | 22 files in `.github/workflows/` |
| Release/package versions | Root `package.json` declares `1.7.0`; app package `apps/omnihub-site/package.json` declares `1.3.10` |
| Canonical package manager | npm for CI (`package-lock.json` canonical); bun optional for local dev (`bun.lock` committed) |
| RSI mode | `policy/rsi-policy.yaml` declares `mode: live`; `.github/workflows/rsi-governance.yml` is present |
| Production certification | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` remains the current authority; verdict is `NOT_CERTIFIED_NO_RELEASE_CUT` — trigger `release.yml` on main |
| Shadow deployment slot | `apex-omnihub-shadow.pages.dev` provisioned 2026-05-20; GitHub Environment: `production-shadow` |
| `chore: version packages` | Merged to main at `959a8fd6` on 2026-06-05 |

## Documentation Authority Order

0. `docs/CURRENT_PLATFORM_STATE_2026_06_06.md` for the latest branch/head assessment and drift-control snapshot. (`docs/CURRENT_PLATFORM_STATE_2026_06_02.md` is now historical.)
1. `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` for certification/release verdicts.
2. `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` and `docs/architecture/CANONICAL_TRUTH.md` for current topology.
3. `docs/architecture/CANONICAL_TRUTH_MATRIX.md` for claim labels, simulation disclaimers, and portability status terms.
4. `docs/architecture/DOC_RECONCILIATION_MATRIX.md` for which legacy docs remain active, historical, or deprecated.
5. Dated audit reports for point-in-time evidence only; do not treat older audit dates as newer production truth.

## Anti-Drift Rules for Agents and Developers

- Re-verify live files before editing; do not force stale snapshot findings onto a safely diverged tree.
- Keep new operational instructions linked from `docs/README.md` and this index.
- When changing workflows, update the matching status/runbook docs and branch-protection guidance in the same PR.
- When changing runtime topology, update the canonical architecture map before updating historical reports.
- Label simulation, dry-run, sandbox, and mock evidence explicitly; do not promote it to live production proof.
- Do not create new shared-library roots; follow `docs/architecture/LIB_DIRECTORY_POLICY.md`.

## Canonical start points

- `docs/CURRENT_PLATFORM_STATE_2026_06_06.md` _(current — supersedes 2026-06-02 snapshot)_
- `README.md`
- `docs/README.md`
- `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`
- `docs/architecture/CANONICAL_TRUTH.md`
- `docs/architecture/CANONICAL_TRUTH_MATRIX.md`
- `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md`
- `docs/project-status/APEX_RELEASE_READINESS_REPORT_v1.6.1.md` _(historical release-readiness point-in-time report — created 2026-05-20)_
- `docs/architecture/DOC_RECONCILIATION_MATRIX.md`

## Current maps

- `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`
- `docs/architecture/BOUNDED_CONTEXT_MAP.md`

## Current README files

- `.changeset/README.md`
- `.claude/skills/apex-skill-forge-v9-claude/README.md`
- `.claude/skills/apex-skill-forge-v9-universal/README.md`
- `.claude/skills/one-pass-debug-skill/one-pass-debug/README.md`
- `.cursor/superpowers/README.md`
- `README.md`
- `apex-resilience/README.md`
- `docs/README.md`
- `docs/compliance/sbom/README.md`
- `docs/rsi/README.md`
- `docs/testing/README.md`
- `integration-harness/README.md`
- `ios/App/CapApp-SPM/README.md`
- `local-agents/README.md`
- `omega/README.md`
- `orchestrator/README.md`
- `sandbox/README.md`
- `scripts/debug/README.md`
- `scripts/dev/README.md`
- `sim/README.md`
- `src/lib/database/README.md`
- `src/lib/storage/README.md`
- `src/lib/web3/README.md`
- `terraform/README.md`

## Status and release documents

- `docs/project-status/APEX_RELEASE_READINESS_REPORT_v1.6.0.md` _(status update addendum added 2026-05-20)_
- `docs/project-status/APEX_RELEASE_READINESS_REPORT_v1.6.1.md` _(NEW — created 2026-05-20; current onboarding entry point alongside PRODUCTION_CERTIFICATION_STATUS.md)_
- `docs/project-status/CI_STATUS_POLICY.md` _(updated 2026-05-20)_
- `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` _(current certification authority — branch-state addendum updated 2026-06-01)_
- `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` _(B-1/B-3 resolved — updated 2026-05-20)_
- `docs/releases/RELEASE_NOTES_v1.6.0.md`

## Audit documents

- `docs/audits/ANNOTATED_PR_TRIAGE_2026_05_06.md`
- `docs/audits/AOID_RELEASE_READINESS_REPORT_4-4-2026.md`
- `docs/audits/APEX_RELEASE_READINESS_REPORT.md`
- `docs/audits/ARMAGEDDON_TEST_SUITE_REPORT.md`
- `docs/audits/DOCUMENTATION_AUDIT_2026-05-15.md`
- `docs/audits/FULL_CODE_AUDIT_AND_VALUATION_2026_03_06.md`
- `docs/audits/M-04_OMNIHUB_19_POINT_AUDIT_2026-05-06.md`
- `docs/audits/OMNIDASH_BUILD_AUDIT_2026_03_21.md`
- `docs/audits/PRODUCTION_CERTIFICATION_EVIDENCE_2026-05-13.md`
- `docs/audits/PRODUCTION_CERTIFICATION_PREFLIGHT_2026-05-13.md`
- `docs/audits/RUNTIME_REMEDIATION_CALL_GRAPH.md`
- `docs/audits/RUNTIME_REMEDIATION_RESULTS.md`
- `docs/audits/SUPABASE_SECURITY_AUDIT_2026_05_04.md`
- `docs/audits/THIRD_PARTY_CODE_AUDIT_2026_03_07.md`
- `docs/audits/THIRD_PARTY_CODE_AUDIT_2026_03_08.md`
- `docs/audits/THIRD_PARTY_CODE_AUDIT_2026_03_09.md`
- `docs/audits/VOICE_FORTRESS_TELEMETRY_AUDIT.md`
- `docs/DRIFT_AUDIT_2026_05_12.md`
- `docs/DRIFT_REMEDIATION_REPORT_2026_05_12.md`
- `DRIFT_MATRIX.md`

## Runbooks and operating procedures

- `docs/archive/legacy-runbooks/MIGRATION_RUNBOOK_legacy.md`
- `docs/archive/legacy-runbooks/OPS_RUNBOOK_legacy_2026-01-25.md`
- `docs/guides/DR_RUNBOOK.md`
- `docs/guides/NATIVE_PUSH_SETUP.md`
- `docs/guides/NFT_VERIFICATION_RUNBOOK.md`
- `docs/guides/WEB3_VERIFICATION_RUNBOOK.md`
- `docs/guides/admin-secret-setup.md`
- `docs/infrastructure/MIGRATION_RUNBOOK.md`
- `docs/ops/INCIDENT_RESPONSE.md`
- `docs/ops/OPEN_PR_GOVERNANCE_2026-05-13.md`
- `docs/ops/OPERATIONAL_EXCELLENCE.md`
- `docs/ops/OPS_RUNBOOK.md`
- `docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md`
- `docs/ops/OPS_RUNBOOK_v1.3.8.md`
- `docs/ops/PR_TRIAGE.md`
- `docs/ops/adaptive-nightly-eval.md`
- `docs/ops/omnidash-asset-rca.md`
- `docs/ops/repo-scope-context.md`
- `docs/sim/RUNBOOK.md`

## Full `docs/` Directory Coverage

- `docs/` — 9 Markdown file(s): `AOID.md`, `CURRENT_PLATFORM_STATE_2026_06_06.md`, `DOCUMENTATION_RELEASE_INDEX.md`, `DRIFT_AUDIT_2026_05_12.md`, `DRIFT_REMEDIATION_REPORT_2026_05_12.md`, `README.md`, `csp-policy.md`, `sbbl-omnihub-integration-readiness-2026-05-09.md`, `skill-forge-implementation.md`
- `docs/api/` — 2 Markdown file(s): `API_EXTENSION_GUIDE.md`, `EDGE_FUNCTIONS_REFERENCE.md`
- `docs/architecture/` — 12 Markdown file(s): `ARCHITECTURE_CANONICAL_MAP.md`, `BOUNDED_CONTEXT_MAP.md`, `CANONICAL_TRUTH.md`, `CANONICAL_TRUTH_MATRIX.md`, `DETAILED_SYSTEM_DESIGN.md`, `DOC_RECONCILIATION_MATRIX.md`, `EXECUTIVE_ARCHITECTURE_SUMMARY.md`, `GENERAL_TECH_SPECS.md`, `LIB_DIRECTORY_POLICY.md`, `MAN_MODE_WORKFLOW_DIAGRAMS.md`, `OMNILINK_PORTABILITY_AND_SRE_STRATEGY.md`, `frontend-map.md`
- `docs/archive/legacy-runbooks/` — 4 Markdown file(s): `CI_RUNTIME_GATES_legacy.md`, `MIGRATION_RUNBOOK_legacy.md`, `OPS_RUNBOOK_legacy_2026-01-25.md`, `PRODUCTION_DEPLOYMENT_GUIDE_legacy.md` _(pre-existing legacy archive — not modified in 2026-05-20 pass)_
- `docs/audits/` — 17 Markdown file(s): `ANNOTATED_PR_TRIAGE_2026_05_06.md`, `AOID_RELEASE_READINESS_REPORT_4-4-2026.md`, `APEX_RELEASE_READINESS_REPORT.md`, `ARMAGEDDON_TEST_SUITE_REPORT.md`, `DOCUMENTATION_AUDIT_2026-05-15.md`, `FULL_CODE_AUDIT_AND_VALUATION_2026_03_06.md`, `M-04_OMNIHUB_19_POINT_AUDIT_2026-05-06.md`, `OMNIDASH_BUILD_AUDIT_2026_03_21.md`, `PRODUCTION_CERTIFICATION_EVIDENCE_2026-05-13.md`, `PRODUCTION_CERTIFICATION_PREFLIGHT_2026-05-13.md`, `RUNTIME_REMEDIATION_CALL_GRAPH.md`, `RUNTIME_REMEDIATION_RESULTS.md`, `SUPABASE_SECURITY_AUDIT_2026_05_04.md`, `THIRD_PARTY_CODE_AUDIT_2026_03_07.md`, `THIRD_PARTY_CODE_AUDIT_2026_03_08.md`, `THIRD_PARTY_CODE_AUDIT_2026_03_09.md`, `VOICE_FORTRESS_TELEMETRY_AUDIT.md`
- `docs/capabilities/` — 6 Markdown file(s): `fortress-protocol.md`, `maestro.md`, `man-mode.md`, `omniport.md`, `orchestrator.md`, `tri-force-protocol.md`
- `docs/ci/` — 1 Markdown file(s): `CHAOS_CI_FIX.md`
- `docs/compliance/` — 9 Markdown file(s): `DATA_RETENTION_POLICY.md`, `EVIDENCE_CHECKLIST.md`, `GDPR_COMPLIANCE.md`, `GDPR_WORKFLOWS.md`, `OMNILINK_HYBRID_CERTIFICATION.md`, `PRIVACY_POLICY.md`, `SOC2_READINESS.md`, `TERMS_OF_SERVICE.md`, `THIRD_PARTY_NOTICES.md`
- `docs/compliance/sbom/` — 1 Markdown file(s): `README.md`
- `docs/extensibility/` — 1 Markdown file(s): `PLUGIN_ARCHITECTURE.md`
- `docs/guides/` — 5 Markdown file(s): `DR_RUNBOOK.md`, `NATIVE_PUSH_SETUP.md`, `NFT_VERIFICATION_RUNBOOK.md`, `WEB3_VERIFICATION_RUNBOOK.md`, `admin-secret-setup.md`
- `docs/infrastructure/` — 19 Markdown file(s): `BACKUP_VERIFICATION.md`, `BLOCKCHAIN_CONFIG.md`, `BLOCKCHAIN_DEPLOYMENT_CHECKLIST.md`, `CI_RUNTIME_GATES.md`, `CLOUD_AGNOSTIC_ARCHITECTURE.md`, `COST_OPTIMIZATION.md`, `DEMO_MODE.md`, `DISASTER_RECOVERY_PLAN.md`, `DOPPLER_IMPLEMENTATION_GUIDE.md`, `EMERGENCY_CONTROLS_USAGE.md`, `MIGRATION_NOTES.md`, `MIGRATION_RUNBOOK.md`, `OBSERVABILITY_STACK_SETUP.md`, `PATH_A_ENHANCED_SERVERLESS.md`, `PATH_B_CONTAINERIZED_MULTICLOUD.md`, `PORTABILITY_MATRIX.md`, `PRODUCTION_DEPLOYMENT_GUIDE.md`, `SRE_PACKAGE.md`, `SUPABASE_SETUP.md`
- `docs/integration/` — 2 Markdown file(s): `sbbl-hq-v1.6.0-patch.md`, `sbbl-omnihub-validation-2026-05-11.md`
- `docs/knowledge/` — 3 Markdown file(s): `DEVELOPER_OPERATING_MODEL.md`, `OMNIDEV_MANIFESTO.md`, `SYSTEM_KNOWLEDGE_BASE.md`
- `docs/knowledge/references/` — 8 Markdown file(s): `cloud.md`, `databases.md`, `frameworks.md`, `languages.md`, `observability.md`, `scale.md`, `security.md`, `testing.md`
- `docs/onboarding/` — 2 Markdown file(s): `BRANCH_PROTECTION.md`, `DEVELOPER_ONBOARDING.md`
- `docs/ops/` — 10 Markdown file(s): `INCIDENT_RESPONSE.md`, `OPEN_PR_GOVERNANCE_2026-05-13.md`, `OPERATIONAL_EXCELLENCE.md`, `OPS_RUNBOOK.md`, `OPS_RUNBOOKS_CI_GUARDRAILS.md`, `OPS_RUNBOOK_v1.3.8.md`, `PR_TRIAGE.md`, `adaptive-nightly-eval.md`, `omnidash-asset-rca.md`, `repo-scope-context.md`
- `docs/platform/` — 12 Markdown file(s): `CONNECTOR_KIT.md`, `OMNIBOARD.md`, `OMNIDASH.md`, `OMNIEVAL.md`, `OMNIHUB_PROTOCOL_CONFORMANCE.md`, `OMNILINK_MANIFESTO_LITE.md`, `OMNILINK_MOBILE_PWA.md`, `OMNILINK_PORT_DISCIPLINE.md`, `OMNIPOLICY.md`, `OMNIPORT_API_REFERENCE.md`, `OMNISENTRY.md`, `OMNITRACE.md`
- `docs/project-status/` — 4 Markdown file(s): `APEX_RELEASE_READINESS_REPORT_v1.6.0.md`, `APEX_RELEASE_READINESS_REPORT_v1.6.1.md` _(NEW 2026-05-20)_, `CI_STATUS_POLICY.md`, `PRODUCTION_CERTIFICATION_STATUS.md`
- `docs/quality/` — 1 Markdown file(s): `QUALITY_ASSURANCE_FRAMEWORK.md`
- `docs/release/` — 1 Markdown file(s): `SHADOW_DEPLOYMENT_BLOCKERS.md`
- `docs/releases/` — 1 Markdown file(s): `RELEASE_NOTES_v1.6.0.md`
- `docs/rsi/` — 2 Markdown file(s): `BRANCH_PROTECTION_REQUIRED.md`, `README.md`
- `docs/rsi/proposals/` — 2 Markdown file(s): `attestation-verification.md`, `github-admin-setup.md`
- `docs/runtime/` — 1 Markdown file(s): `ENTERPRISE_CONTROL_PLANE.md`
- `docs/scalability/` — 1 Markdown file(s): `SCALABILITY_ARCHITECTURE.md`
- `docs/security/` — 11 Markdown file(s): `DEPENDABOT_MAJOR_UPGRADE_REVIEW_2026-05-13.md`, `ENV_FILE_EXPOSURE_ADVISORY.md`, `SECRETS_INVENTORY_AND_ROTATION.md`, `SECRETS_MANAGER_SETUP.md`, `SECRET_SCANNING.md`, `SECURITY_ADVISORIES.md`, `SECURITY_HARDENING_CHECKLIST.md`, `dependency-scanning.md`, `device-registry.md`, `prompt-defense-tuning.md`, `zero-trust-baseline.md`
- `docs/sim/` — 9 Markdown file(s): `ARCHITECTURE.md`, `CHAOS_SIMULATION_DELIVERY.md`, `CHAOTIC_CLIENT_SIMULATION_REPORT.md`, `CHAOTIC_CLIENT_STORY.md`, `INVENTORY.md`, `RESULTS_REPORT.md`, `RUNBOOK.md`, `SANDBOX_TEST_RESULTS_TEMPLATE.md`, `TEST_EXECUTION_REPORT.md`
- `docs/testing/` — 4 Markdown file(s): `ARMAGEDDON_LIVE_VALIDATION_RESULTS_2026_05_08.md`, `E2E_TEST_RESULTS.md`, `README.md`, `worldwide-wildcard-tests.md`
- `docs/valuation/` — 1 Markdown file(s): `PLATFORM_VALUATION_BRIEF.md`

## 2026-06-06 Platform-State Documentation Sync

Full OMEGA SCAN audit performed against `main` @ `c8d753c5`. All local quality gates verified green.

| File | Change |
|---|---|
| `docs/CURRENT_PLATFORM_STATE_2026_06_06.md` | **NEW** — supersedes 2026-06-02 snapshot; includes 2026-06-06 gate results, repo counts, OmniDash real-data status table, and drift resolutions |
| `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` | 2026-06-06 addendum added; verdict updated to `NOT_CERTIFIED_NO_RELEASE_CUT`; gate audit updated to 2,561 tests; hono CVE advisory added; path-to-CERTIFIED step 6 marked DONE |
| `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` | B-2 status updated: `chore: version packages` merged; CI execution is the final remaining step |
| `docs/DOCUMENTATION_RELEASE_INDEX.md` | This file — canonical start point updated to 2026-06-06 snapshot |
| `README.md` | Stats snapshot updated to 2026-06-06 counts; canonical map link updated |
| `next-action.md` | Updated: highest-impact next action is triggering `release.yml` on main |

### Certification status (as of 2026-06-06)

| Blocker | Status |
|---|---|
| B-1 | RESOLVED (2026-05-20) |
| B-2 | `chore: version packages` MERGED (2026-06-05) — CI release run pending |
| B-3 | RESOLVED (2026-05-20) |

---

## 2026-06-01 Platform-State Documentation Sync

| File | Change |
|---|---|
|  `docs/CURRENT_PLATFORM_STATE_2026_06_06.md` | New current branch/head assessment, git-history summary, repo counts, and drift guardrails |
| `README.md` | Updated repo statistics, docs audit date, and current-state link |
| `docs/architecture/*` | Reconciled architecture maps/truth matrix with PR #1274 and PR #1309 state |
| `docs/platform/OMNIDASH.md` | Updated from feature-flag-era wording to always-on post-auth OmniDash surface |
| `memory/omni-recall/state/checkpoints/2026-06-01-platform-doc-sync.md` | Added durable recall checkpoint for future agents |

## 2026-05-20 Documentation Audit Pass

Documents created, modified, or archived in this audit pass:

### Created
| File | Notes |
|---|---|
| `docs/project-status/APEX_RELEASE_READINESS_REPORT_v1.6.1.md` | New release readiness report for v1.6.1 |

### Modified
| File | Change Summary |
|---|---|
| `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` | `omega/` and `orchestrator/` disambiguation added |
| `CLAUDE.md` | `omega/` and `orchestrator/` disambiguation added |
| `vitest.config.ts` | Coverage thresholds raised (branches 60→63, north-star 75%) |
| `.changeset/shadow-slot-coverage-docs.md` | v1.6.1 changeset |
| `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` | B-1 RESOLVED, B-3 RESOLVED |
| `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md` | B-1/B-3 resolved |
| `DRIFT_MATRIX.md` | 2026-05-20 entry added |
| `docs/project-status/APEX_RELEASE_READINESS_REPORT_v1.6.0.md` | Status update addendum added |
| `docs/project-status/CI_STATUS_POLICY.md` | Updated |
| `docs/testing/README.md` | Coverage thresholds updated |
| `docs/architecture/CANONICAL_TRUTH.md` | Updated |
| `docs/architecture/EXECUTIVE_ARCHITECTURE_SUMMARY.md` | Updated |
| `docs/architecture/GENERAL_TECH_SPECS.md` | Updated |
| `docs/architecture/DETAILED_SYSTEM_DESIGN.md` | Updated |
| `docs/onboarding/DEVELOPER_ONBOARDING.md` | pnpm fix, package manager fix, Node/Python version fix |
| `README.md` | Node requirement fix |
| `CONTRIBUTING.md` | Package manager policy updated |
| `docs/api/API_EXTENSION_GUIDE.md` | Placeholder URL notice added |
| `docs/extensibility/PLUGIN_ARCHITECTURE.md` | Coming Soon → Planned, implementation status added |
| `docs/api/EDGE_FUNCTIONS_REFERENCE.md` | Updated |

### Permanently Deleted
| File | Reason |
|---|---|
| `docs/project-status/APEX_ECOSYSTEM_STATUS.md` | v1.4.1 snapshot, 71 days stale — superseded by PRODUCTION_CERTIFICATION_STATUS.md |
| `docs/project-status/PRODUCTION_STATUS.md` | v1.5.1 snapshot, 56 days stale — superseded by PRODUCTION_CERTIFICATION_STATUS.md |
| `docs/infrastructure/DEPLOYMENT_ROLLOUT_PLAN.md` | 8-week phased rollout from 2026-03-01 — all phases elapsed; Vercel-centric |
| `docs/infrastructure/PRODUCTION_ROLLOUT_PLAN.md` | Duplicate phased rollout — superseded by PRODUCTION_DEPLOYMENT_GUIDE.md |
| `docs/infrastructure/CICD_PIPELINE_DESIGN.md` | Design-phase planning doc predating live workflows — superseded by CI_RUNTIME_GATES.md |
| `docs/project-status/PRODUCTION_STATUS.md` | Superseded by PRODUCTION_CERTIFICATION_STATUS.md |
| `docs/project-status/APEX_ECOSYSTEM_STATUS.md` | Superseded by APEX_RELEASE_READINESS_REPORT_v1.6.1.md |
| `docs/infrastructure/DEPLOYMENT_ROLLOUT_PLAN.md` | Superseded by current deployment guides |
| `docs/infrastructure/PRODUCTION_ROLLOUT_PLAN.md` | Superseded by current deployment guides |
| `docs/infrastructure/CICD_PIPELINE_DESIGN.md` | Superseded by CI_RUNTIME_GATES.md and workflow YAML |

### Certification status (as of 2026-05-20)
| Blocker | Status |
|---|---|
| B-1 | RESOLVED |
| B-2 | PENDING |
| B-3 | RESOLVED |

### Deployment topology addition
- Shadow deployment slot: `apex-omnihub-shadow.pages.dev` (provisioned 2026-05-20)
- GitHub Environment: `production-shadow` (created 2026-05-20)

---

## Verification Commands for This Index

```bash
bun run docs:check
python3 - <<'PY'
from pathlib import Path
print(sum(1 for _ in Path("docs").rglob("*.md")))
print(sum(1 for _ in Path(".github/workflows").glob("*.yml")) + sum(1 for _ in Path(".github/workflows").glob("*.yaml")))
PY
```
