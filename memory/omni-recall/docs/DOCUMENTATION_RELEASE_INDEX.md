---
version: 1.4.0
last_audited: 2026-06-22
status: verified
---

# Documentation Release Index

> Current repo-truth index refreshed 2026-06-22 (comprehensive docs pass: repo-truth re-verification of README + omni-recall canonical files; version line corrected 1.7.1 → 1.8.1; portability/storage provider work landed on branch `claude/focused-ptolemy-dgd054`). Use this file as the onboarding entry point for maps, READMEs, status records, audits, and runbooks. Historical docs remain useful as evidence, but current-state claims defer to the canonical files listed below and to `CURRENT_PLATFORM_STATE_2026_06_21.md` (a 2026-06-22 refresh is pending).

## Current Repo Facts Verified in This Pass (2026-06-22)

> Repository counts, HEAD, and versions were directly verified this session against the working tree and `git log`. Live infrastructure health (APEX Agent / Render / Temporal / Supabase) is **carried forward** from the 2026-06-19 verification — not re-checked in this docs pass (no live credentials used).

| Fact | Current repo evidence |
|---|---|
| `main` HEAD | `1f22570` — chore: exempt apex-governance.yml from ops drift guard |
| Source files under `src/` | **322** TypeScript/TSX |
| GitHub workflow files | **23** files in `.github/workflows/` |
| Release/package versions | Root `package.json` declares **`1.8.1`** (1.8.2 in progress); app package `apps/omnihub-site/package.json` declares `1.3.10` |
| SQL migrations | **98** `.sql` files = **94 forward** + **4 rollback** (`migrations/rollback/`) |
| Edge function dirs | **33** (32 function dirs + `_shared`) |
| Custom hooks (`src/` + `apps/`) | **39** (`use*.ts*`) |
| Python orchestrator files | **100** |
| Test/spec source files | **373** (312 TS `.test/.spec` + 61 Python `test_*/_test`) |
| Module action gating | **Module-keyed capability map** (`moduleActionCapabilities.ts`, `moduleKey + actionId`) — PR #1441 replaced the global whitelist; unsupported actions fail-closed with module-specific copy, never call `trigger-workflow` |
| Canonical package manager | npm for CI (`package-lock.json` canonical); bun optional for local dev (`bun.lock` committed) |
| RSI mode | `policy/rsi-policy.yaml` declares `mode: live`; `.github/workflows/rsi-governance.yml` is present |
| APEX Agent (carried forward) | **LIVE / demo-ready** — verified end-to-end 2026-06-19; traces `61ce8dce`, `861d9f0c`, `da6e7fe5` completed |
| `omni_policies` (carried forward) | Provisioned 2026-06-19 — 7 tailored policies active |
| Ops-doc CI guard | `scripts/ci/check-ops-doc-drift.mjs` + `.github/workflows/ops-doc-guard.yml` active on all PRs to `main` |
| Shadow deployment slot | `apex-omnihub-shadow.pages.dev` provisioned 2026-05-20; GitHub Environment: `production-shadow` |
| PR #1441 corrective gates (local) | typecheck exit 0; eslint exit 0; `vitest run tests/omnidash` 585 passed; build success; ops-doc-guard PASS |

## Documentation Authority Order

0. `docs/CURRENT_PLATFORM_STATE_2026_06_21.md` for the latest branch/head assessment and drift-control snapshot. (`docs/CURRENT_PLATFORM_STATE_2026_06_20.md` and earlier are now historical.)
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

- `docs/CURRENT_PLATFORM_STATE_2026_06_21.md` _(current — supersedes 2026-06-20 snapshot)_
- `docs/CURRENT_PLATFORM_STATE_2026_06_20.md` _(historical — 2026-06-20 snapshot)_
- `docs/CURRENT_PLATFORM_STATE_2026_06_14.md` _(historical — 2026-06-14 snapshot)_
- `docs/CURRENT_PLATFORM_STATE_2026_06_06.md` _(historical — 2026-06-06 snapshot)_
- `README.md`
- `docs/README.md`
- `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`
- `docs/architecture/CANONICAL_TRUTH.md`
- `docs/architecture/CANONICAL_TRUTH_MATRIX.md`
- `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md`
- `docs/project-status/APEX_RELEASE_READINESS_REPORT_v1.6.1.md` _(historical release-readiness point-in-time report — created 2026-05-20)_
- `docs/architecture/DOC_RECONCILIATION_MATRIX.md`
- `docs/APEX_AGENT_OPERATIONS.md` _(APEX Agent anti-drift operations reference — added 2026-06-19)_

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

- `docs/` — 13 Markdown file(s): `AOID.md`, `APEX_AGENT_OPERATIONS.md` _(NEW 2026-06-19; §9.1 added 2026-06-21)_, `CURRENT_PLATFORM_STATE_2026_06_06.md` _(historical)_, `CURRENT_PLATFORM_STATE_2026_06_14.md` _(historical)_, `CURRENT_PLATFORM_STATE_2026_06_20.md` _(historical)_, `CURRENT_PLATFORM_STATE_2026_06_21.md` _(NEW 2026-06-21 — current)_, `DOCUMENTATION_RELEASE_INDEX.md`, `DRIFT_AUDIT_2026_05_12.md`, `DRIFT_REMEDIATION_REPORT_2026_05_12.md`, `README.md`, `csp-policy.md`, `sbbl-omnihub-integration-readiness-2026-05-09.md`, `skill-forge-implementation.md`
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

## 2026-06-21 Platform-State Documentation Sync (PR #1441 widget rescue + repo-truth sync)

Full repo-truth documentation sync performed against `main` @ `966d695f` (PR #1441, merged this session). Repository counts were re-verified directly; live infrastructure health was carried forward from the 2026-06-19 verification (not re-checked — no live credentials used).

| File | Change |
|---|---|
| `docs/CURRENT_PLATFORM_STATE_2026_06_21.md` | **NEW** — supersedes 2026-06-20 snapshot; PR #1441 behavior record, verified repo counts (with verification commands), corrects the 06-20 `0020ba6b`/#1439 conflation, labels carried-forward infra |
| `docs/APEX_AGENT_OPERATIONS.md` | §9.1 added (2026-06-21) — records the read-free, no-op `omnilink-port` Links resolver contract change |
| `README.md` | Stats snapshot → 2026-06-21 (migrations 90→94, hooks 35→38, test files 346); HEAD/repo-history note → `966d695f`/#1441; Action Gating description → module-keyed capability map; platform-state links → 2026-06-21 |
| `memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md` | This file — facts table, authority order, start points, and `docs/` coverage updated to the 2026-06-21 snapshot |
| `memory/omni-recall/docs/README.md` | Platform snapshot pointer + dates → 2026-06-21 |
| `memory/omni-recall/docs/architecture/CANONICAL_TRUTH.md` | Header → `main` @ `966d695f` / v1.7.1; Source-of-Truth statement **21** added (module-keyed capability map, honest Links resolver, OmniBoard wizard hardening); conflict-resolution pointer → 2026-06-21 |
| `memory/omni-recall/start-here.md` | Last Verified Session → 2026-06-21 / `966d695f` / PR #1441 |
| `memory/omni-recall/state/checkpoints/current-status.md` | Appended 2026-06-21 session block (PR #1441 corrective commit + docs sync) |
| `memory/omni-recall/docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` | 2026-06-21 addendum added — HEAD `966d695f`, #1439/#1441 merges, verified repo facts; verdict **unchanged** (`NOT_CERTIFIED_NO_RELEASE_CUT`, no release cut) |
| `memory/omni-recall/docs/project-status/CI_STATUS_POLICY.md` | Current CI State → HEAD `966d695f` (#1441 merged 2026-06-21); #1438/#1439/#1441 rows added (merge = green signal under branch protection; tallies only where API-verified); workflow registry re-stamped 2026-06-21 |
| `CLAUDE.md` (root) | `last_audited` → 2026-06-21 (core protocols re-verified accurate; no content drift) |
| `orchestrator/README.md` | Production-runtime note added (points to canonical ops doc; flags semantic cache disabled in prod + Temporal Cloud); `last_audited` → 2026-06-21 |

### Note on scope (anti-drift)

This pass updates **living** documents only (entry points, indexes, current-status, canonical truth) and adds **one new dated snapshot**. Dated point-in-time artifacts (audits, reports, prior `CURRENT_PLATFORM_STATE_*` snapshots, checkpoints) were **left intact** — editing a dated historical record would itself create drift; corrections to them are recorded forward in the current snapshot instead.

---

## 2026-06-20 Platform-State Documentation Sync (APEX Agent Restoration)

Full drift audit performed against `main` @ `6f859ec8` (PR #1436). PR #1435 (`4bbd3e5b`, APEX Agent restoration) and PR #1436 (`6f859ec8`, OmniDash modal contracts) both merged 2026-06-19 and CI verified fully green via the GitHub check-runs API (#1435: 43 success / 3 skipped / 0 failed; #1436: 46 success / 3 skipped / 0 failed). APEX Agent confirmed LIVE.

| File | Change |
|---|---|
| `docs/CURRENT_PLATFORM_STATE_2026_06_20.md` | **NEW** — supersedes 2026-06-14 snapshot; full restoration event record, repo counts, CI state |
| `docs/APEX_AGENT_OPERATIONS.md` | **NEW** — canonical anti-drift operations reference for APEX Agent (service inventory, env contract, DB objects, runbook, migration-baseline rule) |
| `docs/operations/APEX_AGENT_RUNBOOK.md` | **NEW** — full production runbook (architecture, components, env vars, deploy, smoke test, incident response, logs, secrets, migration-baseline §11) |
| `docs/operations/APEX_AGENT_RESTORATION_EVIDENCE.md` | **NEW** — restoration evidence, trace IDs, migration-baseline documentation |
| `scripts/ci/check-ops-doc-drift.mjs` | **NEW** — deterministic guard: fails PRs that change runtime-contract paths without updating `docs/APEX_AGENT_OPERATIONS.md` |
| `.github/workflows/ops-doc-guard.yml` | **NEW** — CI workflow wiring the ops-doc drift guard on all PRs to `main` |
| `.github/pull_request_template.md` | Updated — wording changed from "LAW — required" to "CI-enforced" with workflow pointer |
| `orchestrator/tests/test_tool_validation.py` | Updated — `respond_to_user` added to canonical tool set; alias resolution test added |
| `orchestrator/tests/test_tools_extended.py` | Updated — stale `RuntimeError` test replaced with `test_check_semantic_cache_disabled_returns_none` (disabled cache returns `None`) |
| `README.md` | Stats snapshot updated to 2026-06-20 counts; canonical state link updated to 2026-06-20 doc; release line updated to `1.7.1` |
| `memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md` | This file — canonical start point updated to 2026-06-20 snapshot; new ops docs added |

### APEX Agent restoration summary (2026-06-19)

Full end-to-end verified: OmniSlate → Cloudflare Pages → Supabase `apex-agent` → Render `apex-orchestrator-api` → Temporal Cloud → Render `apex-orchestrator-worker` → `agent_runs` terminal → SSE `completed` → UI answer. Traces `61ce8dce`, `861d9f0c`, `da6e7fe5` completed with real LLM answers. `omni_policies` provisioned with 7 tailored governance policies.

### Migration history baseline (2026-06-19)

Production had live schema objects while `schema_migrations` showed 0 applied. All 89 migrations baselined as applied without re-running SQL. `omni_policies` provisioned same day. Repo now holds 90 migration files.

---

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
