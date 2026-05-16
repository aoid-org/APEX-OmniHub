# Documentation Release Index

> Current repo-truth index generated for the 2026-05-16 documentation audit. Use this file as the onboarding entry point for maps, READMEs, status records, audits, and runbooks. Historical docs remain useful as evidence, but current-state claims defer to the canonical files listed below.

## Current Repo Facts Verified in This Pass

| Fact | Current repo evidence |
|---|---|
| Documentation files under `docs/` | 162 Markdown files |
| GitHub workflow files | 21 files in `.github/workflows/` |
| Release/package versions | `CHANGELOG.md` latest release line is `1.6.3`; `package.json` declares `1.6.0` |
| Canonical package manager | `bun.lock` is present; `package-lock.json` is retained for npm audit parity |
| RSI mode | `policy/rsi-policy.yaml` declares `mode: live`; `.github/workflows/rsi-governance.yml` is present |
| Production certification | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` remains the current authority and still reports `NOT_CERTIFIED_BLOCKED` until release evidence proves certification |

## Documentation Authority Order

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

- `README.md`
- `docs/README.md`
- `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`
- `docs/architecture/CANONICAL_TRUTH.md`
- `docs/architecture/CANONICAL_TRUTH_MATRIX.md`
- `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md`
- `docs/architecture/DOC_RECONCILIATION_MATRIX.md`

## Current maps

- `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`
- `docs/architecture/BOUNDED_CONTEXT_MAP.md`

## Current README files

- `.changeset/README.md`
- `.claude/skills/apex-skill-forge-v8/README.md`
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

- `docs/project-status/APEX_ECOSYSTEM_STATUS.md`
- `docs/project-status/APEX_RELEASE_READINESS_REPORT_v1.6.0.md`
- `docs/project-status/CI_STATUS_POLICY.md`
- `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md`
- `docs/project-status/PRODUCTION_STATUS.md`
- `docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md`
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

- `docs/` — 6 Markdown file(s): `DOCUMENTATION_RELEASE_INDEX.md`, `DRIFT_AUDIT_2026_05_12.md`, `DRIFT_REMEDIATION_REPORT_2026_05_12.md`, `README.md`, `sbbl-omnihub-integration-readiness-2026-05-09.md`, `skill-forge-implementation.md`
- `docs/api/` — 2 Markdown file(s): `API_EXTENSION_GUIDE.md`, `EDGE_FUNCTIONS_REFERENCE.md`
- `docs/architecture/` — 12 Markdown file(s): `ARCHITECTURE_CANONICAL_MAP.md`, `BOUNDED_CONTEXT_MAP.md`, `CANONICAL_TRUTH.md`, `CANONICAL_TRUTH_MATRIX.md`, `DETAILED_SYSTEM_DESIGN.md`, `DOC_RECONCILIATION_MATRIX.md`, `EXECUTIVE_ARCHITECTURE_SUMMARY.md`, `GENERAL_TECH_SPECS.md`, `LIB_DIRECTORY_POLICY.md`, `MAN_MODE_WORKFLOW_DIAGRAMS.md`, `OMNILINK_PORTABILITY_AND_SRE_STRATEGY.md`, `frontend-map.md`
- `docs/archive/legacy-runbooks/` — 4 Markdown file(s): `CI_RUNTIME_GATES_legacy.md`, `MIGRATION_RUNBOOK_legacy.md`, `OPS_RUNBOOK_legacy_2026-01-25.md`, `PRODUCTION_DEPLOYMENT_GUIDE_legacy.md`
- `docs/audits/` — 17 Markdown file(s): `ANNOTATED_PR_TRIAGE_2026_05_06.md`, `AOID_RELEASE_READINESS_REPORT_4-4-2026.md`, `APEX_RELEASE_READINESS_REPORT.md`, `ARMAGEDDON_TEST_SUITE_REPORT.md`, `DOCUMENTATION_AUDIT_2026-05-15.md`, `FULL_CODE_AUDIT_AND_VALUATION_2026_03_06.md`, `M-04_OMNIHUB_19_POINT_AUDIT_2026-05-06.md`, `OMNIDASH_BUILD_AUDIT_2026_03_21.md`, `PRODUCTION_CERTIFICATION_EVIDENCE_2026-05-13.md`, `PRODUCTION_CERTIFICATION_PREFLIGHT_2026-05-13.md`, `RUNTIME_REMEDIATION_CALL_GRAPH.md`, `RUNTIME_REMEDIATION_RESULTS.md`, `SUPABASE_SECURITY_AUDIT_2026_05_04.md`, `THIRD_PARTY_CODE_AUDIT_2026_03_07.md`, `THIRD_PARTY_CODE_AUDIT_2026_03_08.md`, `THIRD_PARTY_CODE_AUDIT_2026_03_09.md`, `VOICE_FORTRESS_TELEMETRY_AUDIT.md`
- `docs/capabilities/` — 6 Markdown file(s): `fortress-protocol.md`, `maestro.md`, `man-mode.md`, `omniport.md`, `orchestrator.md`, `tri-force-protocol.md`
- `docs/ci/` — 1 Markdown file(s): `CHAOS_CI_FIX.md`
- `docs/compliance/` — 9 Markdown file(s): `DATA_RETENTION_POLICY.md`, `EVIDENCE_CHECKLIST.md`, `GDPR_COMPLIANCE.md`, `GDPR_WORKFLOWS.md`, `OMNILINK_HYBRID_CERTIFICATION.md`, `PRIVACY_POLICY.md`, `SOC2_READINESS.md`, `TERMS_OF_SERVICE.md`, `THIRD_PARTY_NOTICES.md`
- `docs/compliance/sbom/` — 1 Markdown file(s): `README.md`
- `docs/extensibility/` — 1 Markdown file(s): `PLUGIN_ARCHITECTURE.md`
- `docs/guides/` — 5 Markdown file(s): `DR_RUNBOOK.md`, `NATIVE_PUSH_SETUP.md`, `NFT_VERIFICATION_RUNBOOK.md`, `WEB3_VERIFICATION_RUNBOOK.md`, `admin-secret-setup.md`
- `docs/infrastructure/` — 22 Markdown file(s): `BACKUP_VERIFICATION.md`, `BLOCKCHAIN_CONFIG.md`, `BLOCKCHAIN_DEPLOYMENT_CHECKLIST.md`, `CICD_PIPELINE_DESIGN.md`, `CI_RUNTIME_GATES.md`, `CLOUD_AGNOSTIC_ARCHITECTURE.md`, `COST_OPTIMIZATION.md`, `DEMO_MODE.md`, `DEPLOYMENT_ROLLOUT_PLAN.md`, `DISASTER_RECOVERY_PLAN.md`, `DOPPLER_IMPLEMENTATION_GUIDE.md`, `EMERGENCY_CONTROLS_USAGE.md`, `MIGRATION_NOTES.md`, `MIGRATION_RUNBOOK.md`, `OBSERVABILITY_STACK_SETUP.md`, `PATH_A_ENHANCED_SERVERLESS.md`, `PATH_B_CONTAINERIZED_MULTICLOUD.md`, `PORTABILITY_MATRIX.md`, `PRODUCTION_DEPLOYMENT_GUIDE.md`, `PRODUCTION_ROLLOUT_PLAN.md`, `SRE_PACKAGE.md`, `SUPABASE_SETUP.md`
- `docs/integration/` — 2 Markdown file(s): `sbbl-hq-v1.6.0-patch.md`, `sbbl-omnihub-validation-2026-05-11.md`
- `docs/knowledge/` — 3 Markdown file(s): `DEVELOPER_OPERATING_MODEL.md`, `OMNIDEV_MANIFESTO.md`, `SYSTEM_KNOWLEDGE_BASE.md`
- `docs/knowledge/references/` — 8 Markdown file(s): `cloud.md`, `databases.md`, `frameworks.md`, `languages.md`, `observability.md`, `scale.md`, `security.md`, `testing.md`
- `docs/onboarding/` — 2 Markdown file(s): `BRANCH_PROTECTION.md`, `DEVELOPER_ONBOARDING.md`
- `docs/ops/` — 10 Markdown file(s): `INCIDENT_RESPONSE.md`, `OPEN_PR_GOVERNANCE_2026-05-13.md`, `OPERATIONAL_EXCELLENCE.md`, `OPS_RUNBOOK.md`, `OPS_RUNBOOKS_CI_GUARDRAILS.md`, `OPS_RUNBOOK_v1.3.8.md`, `PR_TRIAGE.md`, `adaptive-nightly-eval.md`, `omnidash-asset-rca.md`, `repo-scope-context.md`
- `docs/platform/` — 12 Markdown file(s): `CONNECTOR_KIT.md`, `OMNIBOARD.md`, `OMNIDASH.md`, `OMNIEVAL.md`, `OMNIHUB_PROTOCOL_CONFORMANCE.md`, `OMNILINK_MANIFESTO_LITE.md`, `OMNILINK_MOBILE_PWA.md`, `OMNILINK_PORT_DISCIPLINE.md`, `OMNIPOLICY.md`, `OMNIPORT_API_REFERENCE.md`, `OMNISENTRY.md`, `OMNITRACE.md`
- `docs/project-status/` — 5 Markdown file(s): `APEX_ECOSYSTEM_STATUS.md`, `APEX_RELEASE_READINESS_REPORT_v1.6.0.md`, `CI_STATUS_POLICY.md`, `PRODUCTION_CERTIFICATION_STATUS.md`, `PRODUCTION_STATUS.md`
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

## Verification Commands for This Index

```bash
bun run docs:check
python3 - <<'PY'
from pathlib import Path
print(sum(1 for _ in Path("docs").rglob("*.md")))
print(sum(1 for _ in Path(".github/workflows").glob("*.yml")) + sum(1 for _ in Path(".github/workflows").glob("*.yaml")))
PY
```
