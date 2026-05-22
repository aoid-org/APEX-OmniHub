# APEX Bible v1.1.0 — Integration Report

**Date:** 2026-05-22T23:00:00Z
**Branch:** claude/wizardly-cray-659d3
**Base commit:** 8f87e804c56136ec9295f8e0a0173a84efe94a2b
**Backup branch:** apex-bible-backup-20260522T225156Z
**Backup tag:** apex-bible-pre-integration-20260522T225156Z
**Package source:** `docs/APEX_BIBLE_COMPLETE_PACKAGE.zip` (origin/main commit `4788253e`)

> **Note on branch:** This integration was performed on `claude/wizardly-cray-659d3`
> (session-config requirement) rather than the directive's prescribed
> `chore/apex-bible-v1.1.0-integration`. All other phases followed the directive verbatim.

---

## What Was Installed

49 files from the APEX Bible v1.1.0 package, plus `package_manifest.json` (self-excluded from
manifest entries but installed as the canonical registry). After regeneration the integrated
manifest covers **74 files** (49 APEX + 25 pre-existing `.github/` files now governed).

| Category | Count |
|---|---|
| New files copied (exact SHA match) | 43 |
| Merged into existing files | 5 |
| Skipped (existing LICENSE preserved) | 1 |
| package_manifest.json (regenerated) | 1 |

### Files Added (43 new + package_manifest.json)

| Path | Action |
|---|---|
| `.github/CODEOWNERS` | copied (new) |
| `.github/ISSUE_TEMPLATE/rfc_request.md` | copied (new) |
| `.github/gitleaks.toml` | copied (new) |
| `.github/workflows/apex-governance.yml` | copied (new) |
| `SECURITY.md` | copied (new) |
| `governance/INDEX.md` | copied (new) |
| `governance/adr/0001-adopt-apex-bible.md` | copied (new) |
| `governance/ai/AI_AGENT_SYSTEM_PROMPT.md` | copied (new) |
| `governance/ai/AI_EVAL_POLICY.md` | copied (new) |
| `governance/ai/AI_KILL_SWITCH.md` | copied (new) |
| `governance/ai/GLOBAL_AI_PROMPT_USAGE.md` | copied (new) |
| `governance/api/API_VERSIONING_POLICY.md` | copied (new) |
| `governance/architecture/ARCHITECTURE_REVIEW_GATES.md` | copied (new) |
| `governance/architecture/ARCHITECTURE_REVIEW_TEMPLATE.md` | copied (new) |
| `governance/architecture/MERGE_RIGHTS_POLICY.md` | copied (new) |
| `governance/ci/CI_POLICY_GATES.md` | copied (new) |
| `governance/ci/apex-policy.config.json` | copied (new) |
| `governance/ci/scripts/apex_policy_check.py` | copied (new) |
| `governance/ci/scripts/apex_validate_manifest.py` | copied (new) |
| `governance/data/DATA_CLASSIFICATION.md` | copied (new) |
| `governance/deprecation/DEPRECATION_POLICY.md` | copied (new) |
| `governance/doctrine/APEX_BUILD_DOCTRINE.md` | copied (new) |
| `governance/finops/COST_BUDGET_POLICY.md` | copied (new) |
| `governance/observability/OBSERVABILITY_BASELINE.md` | copied (new) |
| `governance/observability/SLO_POLICY.md` | copied (new) |
| `governance/onboarding/ENGINEERING_ONBOARDING.md` | copied (new) |
| `governance/onboarding/MERGE_ACCESS_CHECKLIST.md` | copied (new) |
| `governance/ops/DR_POLICY.md` | copied (new) |
| `governance/ops/INCIDENT_RESPONSE.md` | copied (new) |
| `governance/ops/ON_CALL_POLICY.md` | copied (new) |
| `governance/ops/POSTMORTEM_TEMPLATE.md` | copied (new) |
| `governance/ops/RUNBOOK_TEMPLATE.md` | copied (new) |
| `governance/release/RELEASE_POLICY.md` | copied (new) |
| `governance/rfc/RFC_TEMPLATE.md` | copied (new) |
| `governance/rfc/RFC_USAGE_POLICY.md` | copied (new) |
| `governance/rubrics/APEX_BUILD_RUBRIC_100.md` | copied (new) |
| `governance/rubrics/RUBRIC_SCORING_GUIDE.md` | copied (new) |
| `governance/security/INCIDENT_DISCLOSURE.md` | copied (new) |
| `governance/security/SECURITY_BASELINE.md` | copied (new) |
| `governance/security/THREAT_MODEL_TEMPLATE.md` | copied (new) |
| `governance/supply-chain/SUPPLY_CHAIN_POLICY.md` | copied (new) |
| `governance/templates/ARCHITECTURE_DECISION_RECORD.md` | copied (new) |
| `governance/testing/TESTING_DOCTRINE.md` | copied (new) |
| `package_manifest.json` | regenerated (74 files, v1.1.0) |

---

## What Was Merged (Not Overwritten)

| Path | Merge strategy | Notes |
|---|---|---|
| `.github/pull_request_template.md` | append-apex | Existing APEX OmniHub checklist preserved; APEX Bible sections appended after `---` separator |
| `CHANGELOG.md` | prepend-governance | APEX Bible v1.1.0 entry prepended under `## Governance` heading |
| `CONTRIBUTING.md` | append-apex | Existing contributing guide preserved; APEX Bible contribution rules appended |
| `Makefile` | append-apex-targets | Existing `test:wwwct` targets preserved; APEX governance targets added in separate `.PHONY` block |
| `README.md` | append-apex | Existing 304-line README preserved; `# APEX Bible Governance` section appended |

---

## What Was Skipped (Existing Preserved)

| Path | Reason |
|---|---|
| `LICENSE` | Do not overwrite existing license (per integration policy) |

---

## What Requires Human Action

### 1. CODEOWNERS Placeholder Handles

The package ships with placeholder GitHub team handles. Confirm these exist in your org
or replace with your actual team handles:

- [ ] `@apex-architecture` — used in `/governance/`, `/src/domains/`, `/src/services/`, `/src/workers/`, `/src/ai/`, `/db/`, `/infra/`
- [ ] `@apex-leadership` — used in `/governance/`, `/.github/CODEOWNERS`
- [ ] `@apex-devops` — used in `/.github/workflows/`, `/db/`, `/infra/`
- [ ] `@apex-ai-governance` — used in `/src/ai/`

UNCERTAIN: team handle `@apex-architecture` — confirm it exists in your GitHub org or replace.
UNCERTAIN: team handle `@apex-leadership` — confirm it exists in your GitHub org or replace.
UNCERTAIN: team handle `@apex-devops` — confirm it exists in your GitHub org or replace.
UNCERTAIN: team handle `@apex-ai-governance` — confirm it exists in your GitHub org or replace.

### 2. Branch Protection Setup

Apply in GitHub: **Settings → Branches → Add protection rule for `main`**:

```
✓ Require a pull request before merging
✓ Require approvals: 1 (minimum)
✓ Dismiss stale pull request approvals when new commits are pushed
✓ Require review from Code Owners
✓ Require status checks to pass before merging
  ✓ Require branches to be up to date before merging
  ✓ Status checks required:
      - Governance gate (required for branch protection)
✓ Require conversation resolution before merging
✓ Require signed commits (recommended)
✓ Do not allow bypassing the above settings
```

### 3. Service Tier Assignment

Every existing service must be assigned a tier (T1/T2/T3/T4) per
`governance/release/RELEASE_POLICY.md`. File a follow-up ticket.

### 4. Data Classification

Every existing data store must be classified P0–P4 per
`governance/data/DATA_CLASSIFICATION.md`. File a follow-up ticket.

### 5. SLO Declarations

Every T1/T2 service must declare an SLO per `governance/observability/SLO_POLICY.md`.
File a follow-up ticket.

### 6. Pre-Existing Policy Violations (Out of Scope — Do Not Fix Here)

`make apex-policy` found **44 pre-existing product code violations** — all "Module exceeds
500 lines." These existed before this integration. They are flagged for team awareness; fixing
them is out of scope for this PR and should be addressed in follow-up refactor tickets.

**Zero governance violations** — the installed governance package is clean.

Affected files (excerpt):
```
sandbox/chaotic-client-simulation.ts (675 lines)
orchestrator/infrastructure/cache.py (624 lines)
orchestrator/observability/omnitrace.py (648 lines)
orchestrator/workflows/agent_saga.py (1464 lines)
orchestrator/activities/tools.py (1062 lines)
apps/omnihub-site/dashboard/OmniDashShell.tsx (1682 lines)
src/omniconnect/ingress/OmniPort.ts (1130 lines)
```
Full list in `.apex-bible-integration/final-policy-report.json` (gitignored).

### 7. Makefile Colon-Target Compatibility (Pre-Existing)

The repo's original `Makefile` contained `test:wwwct:` style targets with colon-in-name
syntax that is incompatible with GNU make on this system (`make 3.8x+`). These were renamed
to `test-wwwct`, `test-wwwct-sandbox`, `test-wwwct-report` (npm scripts unchanged). The
broken `.PHONY: test:wwwct ...` line was removed. This was a pre-existing incompatibility
exposed during integration, not introduced by it.

---

## Verification Evidence

```
make apex-validate:
  APEX manifest valid. 74 files verified, version 1.1.0.
  Exit code: 0 — PASS

make apex-policy:
  Exit code: 1 — FAIL (44 pre-existing product code violations, 0 governance violations)

make apex-verify: PARTIAL (validate PASS, policy FAIL pre-existing)
```

Policy report JSON: `.apex-bible-integration/final-policy-report.json` (gitignored, 44 violations, all product code)

---

## PR Body (Copy Into GitHub)

```markdown
## Summary

Adopts APEX Bible v1.1.0 — the canonical APEX Business Systems governance package.

- Installs `governance/` (49 documents: doctrine, policies, templates, rubrics)
- Adds `.github/workflows/apex-governance.yml` (gitleaks + osv-scanner + CodeQL)
- Adds `.github/CODEOWNERS`, `.github/gitleaks.toml`, `SECURITY.md`
- Merges (additive) into `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`,
  `.github/pull_request_template.md`, `Makefile`
- Regenerates `package_manifest.json` to cover 74 governed files

## What Changes for Contributors

- PRs must complete the updated `.github/pull_request_template.md` checklist
- Architecture-impacting PRs (changes under `src/domains/`, `src/services/`,
  `src/workers/`, `src/ai/`, `db/`, `infra/`, `supabase/migrations/`) require
  an RFC link in the PR body — CI will block otherwise
- Branch protection (once configured by repo admin) requires the
  `Governance gate (required for branch protection)` status check to pass

## What Doesn't Change

- No product code modified
- No existing CI workflows removed
- No existing CODEOWNERS rules removed (additive merge)
- Existing LICENSE preserved

## Pre-Existing Findings (Not Fixed Here)

- 44 product code modules exceed the 500-line governance limit (follow-up refactor tickets needed)
- `Makefile` had incompatible colon-named make targets (renamed to hyphen equivalents, npm scripts unchanged)

## How to Roll Back

```bash
git checkout main && git branch -D claude/wizardly-cray-659d3
# If already merged:
git reset --hard apex-bible-pre-integration-20260522T225156Z
```

## Verification

`make apex-validate` → exit 0 (74 files, manifest integrity PASS)
`make apex-policy` → exit 1 (44 pre-existing product code violations, 0 governance violations)

## Reviewer Checklist

- [ ] Read `governance/INDEX.md`
- [ ] Read `governance/doctrine/APEX_BUILD_DOCTRINE.md`
- [ ] Confirm CODEOWNERS handles match your org's teams (see §1 above)
- [ ] Confirm no product code was touched (`git diff main -- ':(exclude)governance' ':(exclude).github' ':(exclude)INTEGRATION_REPORT.md'`)
- [ ] Apply branch protection per `INTEGRATION_REPORT.md` §2 after merge
- [ ] File follow-up tickets for service tiers, data classification, SLOs, 500-line violations
```
