# APEX Bible Index

Version: 1.1.0

Single navigation map for the APEX governance package. If you only read one file, read `doctrine/APEX_BUILD_DOCTRINE.md`.

---

## Start Here

| File | Purpose |
|---|---|
| `doctrine/APEX_BUILD_DOCTRINE.md` | Canonical principles. Read first. |
| `../README.md` | Install + implementation order. |
| `../CHANGELOG.md` | Version history. |
| `onboarding/ENGINEERING_ONBOARDING.md` | New-engineer day 1. |
| `onboarding/MERGE_ACCESS_CHECKLIST.md` | Path to merge rights with scored exercises. |

## Architecture & Governance

| File | Purpose |
|---|---|
| `architecture/ARCHITECTURE_REVIEW_GATES.md` | Hard blockers; required checks. |
| `architecture/ARCHITECTURE_REVIEW_TEMPLATE.md` | Reviewer's worksheet. |
| `architecture/MERGE_RIGHTS_POLICY.md` | Who can merge what. |
| `rfc/RFC_USAGE_POLICY.md` | When an RFC is required. |
| `rfc/RFC_TEMPLATE.md` | Full RFC structure (21 sections). |
| `templates/ARCHITECTURE_DECISION_RECORD.md` | ADR template. |
| `adr/0001-adopt-apex-bible.md` | First ADR: adopt the Bible. |

## CI / CD

| File | Purpose |
|---|---|
| `ci/CI_POLICY_GATES.md` | What CI must block on. |
| `ci/apex-policy.config.json` | Policy config (forbidden names, patterns, RFC sections). |
| `ci/scripts/apex_policy_check.py` | Policy enforcement script. |
| `../.github/workflows/apex-governance.yml` | The actual workflow. |
| `../.github/gitleaks.toml` | Secret-scan config with APEX allowlist. |
| `../.github/CODEOWNERS` | Ownership routing. |
| `../.github/pull_request_template.md` | PR checklist. |
| `../.github/ISSUE_TEMPLATE/rfc_request.md` | RFC issue template. |

## Observability

| File | Purpose |
|---|---|
| `observability/OBSERVABILITY_BASELINE.md` | What every prod system must emit. |
| `observability/SLO_POLICY.md` | Tier SLOs, error budgets, burn alerts, naming, retention, sampling. |

## Security

| File | Purpose |
|---|---|
| `security/SECURITY_BASELINE.md` | Always/never list. |
| `security/THREAT_MODEL_TEMPLATE.md` | STRIDE + AI-specific. |
| `security/INCIDENT_DISCLOSURE.md` | Breach notification SLAs and process. |

## Data & Privacy

| File | Purpose |
|---|---|
| `data/DATA_CLASSIFICATION.md` | P0–P4 tiers, handling, retention, subject rights. |

## FinOps

| File | Purpose |
|---|---|
| `finops/COST_BUDGET_POLICY.md` | Tags, budget tiers, AI cost caps, dashboards. |

## Release Management

| File | Purpose |
|---|---|
| `release/RELEASE_POLICY.md` | Service tiers, branching, canary, hotfix. |
| `api/API_VERSIONING_POLICY.md` | Versioning, idempotency, webhooks. |
| `deprecation/DEPRECATION_POLICY.md` | Lifecycle stages, EOL approval. |
| `supply-chain/SUPPLY_CHAIN_POLICY.md` | SBOM, signing, CVE SLAs, vendor review. |

## Operations

| File | Purpose |
|---|---|
| `ops/INCIDENT_RESPONSE.md` | Severity model, requirements. |
| `ops/ON_CALL_POLICY.md` | Coverage, response SLAs, paging tiers. |
| `ops/DR_POLICY.md` | RPO/RTO targets, restore drills. |
| `ops/POSTMORTEM_TEMPLATE.md` | Postmortem structure. |
| `ops/RUNBOOK_TEMPLATE.md` | Runbook structure. |

## Testing

| File | Purpose |
|---|---|
| `testing/TESTING_DOCTRINE.md` | Required test types, rules, minimum coverage. |

## AI Governance

| File | Purpose |
|---|---|
| `ai/AI_AGENT_SYSTEM_PROMPT.md` | Drop-in prompt for all internal AI agents. |
| `ai/GLOBAL_AI_PROMPT_USAGE.md` | Where to install, required behavior, audit rule. |
| `ai/AI_KILL_SWITCH.md` | Mandatory stop mechanism per AI system. |
| `ai/AI_EVAL_POLICY.md` | Eval sets, red-team, model pinning, drift monitoring. |

## Rubrics

| File | Purpose |
|---|---|
| `rubrics/APEX_BUILD_RUBRIC_100.md` | 10×10 scoring rubric. |
| `rubrics/RUBRIC_SCORING_GUIDE.md` | How reviewers apply each category. |

---

## Quick-Reference: Common Tasks

| Task | Read |
|---|---|
| Propose a new feature | `rfc/RFC_TEMPLATE.md` + `RFC_USAGE_POLICY.md` |
| Review someone's PR | `architecture/ARCHITECTURE_REVIEW_GATES.md` + `rubrics/RUBRIC_SCORING_GUIDE.md` |
| Classify new data | `data/DATA_CLASSIFICATION.md` |
| Set up observability for a new service | `observability/SLO_POLICY.md` |
| Define rollback for a new deploy | `release/RELEASE_POLICY.md` + write runbook from `ops/RUNBOOK_TEMPLATE.md` |
| Ship an AI feature | `ai/AI_EVAL_POLICY.md` + `ai/AI_KILL_SWITCH.md` |
| Respond to an incident | `ops/INCIDENT_RESPONSE.md` + `ops/ON_CALL_POLICY.md` |
| Disclose a breach | `security/INCIDENT_DISCLOSURE.md` |
| Deprecate an API | `deprecation/DEPRECATION_POLICY.md` + `api/API_VERSIONING_POLICY.md` |
| Onboard an engineer | `onboarding/ENGINEERING_ONBOARDING.md` + `MERGE_ACCESS_CHECKLIST.md` |
