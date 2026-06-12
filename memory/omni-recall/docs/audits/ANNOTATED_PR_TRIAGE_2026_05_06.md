---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Annotated Pull Request Triage — 2026-05-06

## Vercel Reference Classification

LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical. Any Vercel commands, rollback paths, modules, or Edge Runtime references in this document are not current deployment proof unless separately labeled VERIFIED with active configuration evidence. See `docs/architecture/CANONICAL_TRUTH_MATRIX.md`.


**Scope:** Only the PRs annotated in the provided screenshot were audited.

**Repository baseline:** `origin/main` at `40df877c` (`docs: comprehensive hardening pass — agent briefing, CI runbooks, onboarding`) plus the local review branch at `9854bb4` (`fix: enforce patched axios and protobufjs dependency resolutions (#1067)`).

**Decision policy for this queue:**

- **Merge only** when the PR is security-critical or clearly beneficial, has no local merge conflict, and does not remove current hardening work.
- **Update before merge** when the PR is directionally useful but has merge conflicts, stale package state, missing lockfile updates, generated artifacts, or broad infrastructure churn.
- **Close / supersede** when current `main` or the local hardening branch already contains the safer outcome, or when the PR is stale/noisy relative to the current architecture.
- **Dependency PRs** must update manifests and lockfiles together; manifest-only version bumps are not merge-ready in this repo because npm audit and frozen install gates depend on the lockfiles.

## Executive decision table

| PR                                                        | Decision                              | Evidence                                                                                                                                                                                                                        | Required action                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| #1068 — Harden OmniPort webhook HMAC validation           | **Update, then merge**                | Clean merge against `origin/main` and local branch. Adds server-only/raw-payload HMAC validation plus tests. This is beneficial security work, but GitHub reports `mergeable_state=unstable`, so CI must be green before merge. | Keep open. Require CI pass. If CI fails, fix on `codex/update-omniport-hmac-verification-logic-jbtdw7` and merge after tests.         |
| #1061 — protobufjs RCE + axios SSRF remediation           | **Close as superseded**               | Conflicts in `package.json`. The local hardening branch already pins `axios` and overrides `protobufjs` safely.                                                                                                                 | Close/supersede with reference to local/main hardening commit `9854bb4` after it lands. Do not merge this stale manifest-only branch. |
| #1060 — replace `USING (true)` operator-role RLS policies | **Update, then merge**                | Clean merge. More complete than #1058 and directly eliminates cross-tenant RLS leakage in `man_tasks`.                                                                                                                          | Keep #1060 as the canonical RLS PR. Rebase on latest main, run Supabase migration validation, then merge.                             |
| #1058 — tenant/user-based RLS policies                    | **Close as superseded by #1060**      | Touches the same migration as #1060 but is less complete. Merging both would create review noise around the same RLS surface.                                                                                                   | Close after #1060 is merged or explicitly mark superseded by #1060.                                                                   |
| #1055 — memoize/optimize `SkillForgeWidget`               | **Merge after focused UI test**       | Clean, small component-only performance change. No architectural conflict detected.                                                                                                                                             | Run focused component tests/typecheck; merge if green.                                                                                |
| #1050 — remove `dangerouslySetInnerHTML` on Home page     | **Update before any merge**           | Merge conflict against current Home/package state and very large Home rewrite. Security intent is valid, but the branch is stale and high-risk.                                                                                 | Rebase and reduce to the smallest no-`dangerouslySetInnerHTML` patch. Require UI snapshot/e2e smoke before merge.                     |
| #1040 — O(log n) OmniPort time-window filtering           | **Update before merge**               | Clean merge, but includes `test-force-commit.txt` and unrelated `.jules/bolt.md` edits. Core metrics change is potentially beneficial.                                                                                          | Remove generated/empty artifacts, isolate metrics/test changes, then run focused tests.                                               |
| #1039 — codecov/codecov-action 4.6.0 → 6.0.0              | **Update before merge**               | Clean workflow-only diff. Major action upgrade can require token/coverage behavior changes and should be verified against current CI.                                                                                           | Keep open; validate Codecov v6 configuration, permissions, and upload behavior before merge.                                          |
| #1038 — trufflehog 3.93.3 → 3.95.2                        | **Update before merge**               | Clean workflow-only diff. Current workflow uses pinned install and a pinned action SHA; version bump must preserve pinned supply-chain posture.                                                                                 | Update pinned installer/action SHA intentionally, then run secret-scanning workflow.                                                  |
| #1037 — hardhat 2.28.6 → 3.4.2                            | **Close / do not merge**              | Major Hardhat 3 migration is not a safe manifest-only bump. Current Hardhat scripts/config are built around Hardhat 2.                                                                                                          | Close or replace with a dedicated Hardhat 3 migration PR that updates config, plugins, lockfiles, and contract tests together.        |
| #1036 — `@types/uuid` 10 → 11                             | **Update before merge**               | Clean manifest-only bump. Missing lockfile evidence.                                                                                                                                                                            | Regenerate lockfiles and run typecheck before merge.                                                                                  |
| #1035 — `lucide-react` 0.462.0 → 1.11.0                   | **Update before merge**               | Clean manifest-only bump, but this UI icon library is broadly imported across app shells and dashboards. Missing lockfile evidence.                                                                                             | Regenerate lockfiles and run typecheck/component smoke before merge.                                                                  |
| #1034 — Tailwind 3.4.19 → 4.2.4                           | **Close / replace with migration PR** | Tailwind 4 is a major migration; current repo config is Tailwind 3 style. Manifest-only bump is unsafe.                                                                                                                         | Close and create a Tailwind 4 migration branch only if product wants the migration.                                                   |
| #1033 — Hardhat Toolbox 5 → 7                             | **Close / do not merge**              | Major toolbox bump is coupled to Hardhat 3 and plugin ecosystem changes. Manifest-only bump is unsafe.                                                                                                                          | Close with #1037, or replace with one tested Hardhat 3 migration PR.                                                                  |
| #1028 — Vercel → Cloudflare Pages + badge/tests           | **Close as stale/superseded**         | Conflicts with current Home/package state and deletes large CI/Terraform surfaces. Current docs and workflows already describe Cloudflare-centric deployment.                                                                   | Close unless a fresh infra RFC revalidates every deleted Vercel/CI/Terraform path.                                                    |
| #1026 — add APEX core badge SVG + Home wiring             | **Close as superseded**               | Conflicts with current Home page. The current repo already has public badge assets and hero badge coverage evolved beyond this PR.                                                                                              | Close as superseded by later badge fixes/hardening.                                                                                   |
| #1024 — auto-update `INSTITUTIONAL_READINESS.json`        | **Update before merge**               | Clean JSON-only diff but automated valuation/readiness data must match latest generated report and not overwrite manual evidence.                                                                                               | Regenerate readiness data from the current generator, review diff, then merge only if values match source evidence.                   |
| #997 — `pytest-timeout` >=2.2.0 → >=2.4.0                 | **Update before merge**               | Clean pyproject-only bump. Missing lockfile/requirements sync.                                                                                                                                                                  | Update `requirements*.txt`/lock artifacts consistently and run orchestrator tests.                                                    |
| #996 — `numpy` >=1.26.0 → >=2.4.4                         | **Close / do not merge**              | `numpy>=2.4.4` is not safe for the orchestrator dependency graph without validating transitive packages such as sentence-transformers. The PR is pyproject-only and lacks lockfile/test evidence.                               | Close or replace with a controlled NumPy 2 migration PR after dependency compatibility validation.                                    |
| #983 — peter-evans/create-pull-request 7.0.11 → 8.1.0     | **Update before merge**               | Clean workflow-only action bump. Needs permission/token behavior validation because it can create or update PRs.                                                                                                                | Validate workflow permissions and dry-run behavior before merge.                                                                      |

## Queue consolidation rules for agents

1. **Security PR priority:** land #1068 and #1060 first after CI; they address runtime ingress verification and tenant isolation.
2. **Supersede stale security patches:** do not merge #1061 after the stronger dependency hardening branch lands; close it as superseded to avoid conflict churn.
3. **One migration per subsystem:** do not combine Hardhat 3, Tailwind 4, Cloudflare/Vercel infrastructure, or NumPy 2 migrations with unrelated fixes.
4. **No manifest-only dependency merges:** any dependency PR must include the lockfiles and the smallest relevant validation command output.
5. **No generated or placeholder artifacts:** remove files like `test-force-commit.txt` before merging performance PRs.
6. **RLS migrations require database validation:** run migration diff/apply checks on an isolated Supabase environment before merging RLS changes.

## Commands used for this audit

```bash
git fetch origin '+refs/heads/*:refs/remotes/origin/*' --prune
git fetch origin '+refs/pull/*/head:refs/remotes/pull/*' --prune
python - <<'PY'
# queried GitHub pull metadata for the annotated PR numbers via api.github.com
PY
python - <<'PY'
# checked git diff, git cherry, and git merge-tree for each annotated PR against origin/main and local HEAD
PY
rg -n "OmniPort|HMAC|dangerouslySetInnerHTML|USING \\(true\\)|operator_role|man_tasks|SkillForgeWidget|omniport-metrics" src tests supabase .github package.json orchestrator/pyproject.toml docs apps
```

## Access note

This environment has internet access and can read the public repository and PR refs, but it does not include GitHub CLI or a write-capable GitHub token. Therefore, the close/merge/update actions above are the authoritative triage decisions, but the actual GitHub PR state changes must be executed by an operator or automation runner with repository write permissions.
