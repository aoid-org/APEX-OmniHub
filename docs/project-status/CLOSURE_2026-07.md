# Closure Report — Certification Docs & CI Hygiene Contract (2026-07-03)

Scope: FR-A (certification-authority summary file), FR-B (`scripts/verify-changelog-paths.js` false-positive fix), FR-C (CHANGELOG backfill). Branch: `claude/cert-docs-ci-hygiene-niq9rk`, based on `main` @ `fb1dda5` (PR #1565).

Rule of record: **CI validates. Owner certifies.** No self-certification is performed anywhere in this closure.

---

## Phase 0 Findings (verbatim)

```
PHASE 0 FINDINGS:
- HEAD confirms #1555/#1557/#1558 merged: yes — 86623e5 (#1555), cc6cfa3 (merge of #1557,
  "PRCC-001 WP-3b/3c: honest LIVE/PREVIEW badges + gated-CTA styling"), 1f476fe (#1558),
  all reachable on origin/main; working branch even with origin/main @ fb1dda5.
- release-validation-summary.json exists: no (no committed file; find across the tree
  excluding node_modules returned nothing).
- docs/project-status/ exists: no (ls: cannot access 'docs/project-status/').
- verify-changelog-paths.js bug still present: yes — real run emitted 23 ::warning lines
  including the five "permanently deleted" records at CHANGELOG.md:213-217.
- Paths referencing release-validation-summary.json found:
  - CHANGELOG.md:213, CHANGELOG.md:214 — docs/project-status/release-validation-summary.json
  - .agents/omnihub-orchestrator-core.md:11 — memory/omni-recall/docs/project-status/
    release-validation-summary.json ("the canonical production certification document")
  - memory/omni-recall/docs/** (CURRENT_PLATFORM_STATE_2026_06_14/20/21/22.md,
    ops/OPS_RUNBOOK.md:30, release/SHADOW_DEPLOYMENT_BLOCKERS.md,
    architecture/DOC_RECONCILIATION_MATRIX.md:43, archive/state/checkpoints/current-status.md)
    — mixed references to the docs/project-status/ path and to the CI artifact
  - .github/workflows/release.yml:195,200-202,210,239,276,294,299-300 — CI artifact
  - scripts/ci/write-release-validation-summary.mjs:3 — writes the file
  - tests/ci/write-release-validation-summary.test.mjs — tests the writer
  - scripts/ci/shadow-certification-preflight.mjs:132-133 — describes the writer as the
    verdict producer
  - scripts/ci/guard-agent-destructive-actions.mjs:14 — names it the canonical filename in
    its legacy-filename guard rule
  - package.json:84 — "release:validation-summary" script invoking the writer
- Any code/script that actually READS this file (not just mentions it): none found at either
  candidate committed path. The filename is, however, WRITTEN by
  scripts/ci/write-release-validation-summary.mjs at the repo root (or
  RELEASE_VALIDATION_SUMMARY_OUTPUT_PATH) during .github/workflows/release.yml runs, with
  schema_version: 1 and verdict fields computed from real release-run outputs, and uploaded
  as a workflow artifact (release.yml:195-300).
```

---

## FR-A — Certification authority file: **RESOLVED (2026-07-04): canonical = `docs/release/release-validation-matrix.json` per `CI_STATUS_POLICY.md`; stale pointer at `.agents/omnihub-orchestrator-core.md:11` fixed.**

Decision rule fired: **rule 3** (evidence contradicting rule 2; escalate rather than pick). Rule 1 did not fire — no runtime reader of either candidate committed path exists. Rule 2's premise ("both references are aspirational, not implemented; this file has never existed") is **false in a material way**, on four independent axes:

1. **The filename is implemented — as a CI artifact, with an established schema.** `scripts/ci/write-release-validation-summary.mjs` writes `release-validation-summary.json` (`schema_version: 1`; fields: `commit_sha`, `workflow_run_url`, `shadow_preflight_status`, `health_result`, `validator_result`, `terraform_*`) from real release-run outputs, and `.github/workflows/release.yml:195-300` uploads it as a workflow artifact. Hand-authoring a committed file under the same canonical filename with the contract's proposed `schema_version: "1.0.0"` orchestrator-claims schema would mint a second, conflicting schema for the certification filename. Populating the writer's real schema by hand is impossible without fabricating CI-run figures, which the contract forbids ("zero fabricated figures").
2. **Repo policy reserves this filename for CI-produced output.** `memory/omni-recall/docs/release/SHADOW_DEPLOYMENT_BLOCKERS.md:164`: "The only acceptable source of truth for certification is a `release-validation-summary.json` artifact produced by a real release workflow run on `main`. Manual claims, local mock evidence, skipped shadow deployments, or unverified environment settings do not certify the release."
3. **Agent policy expects the memory/omni-recall path** — the exact contradiction rule 3 names. `.agents/omnihub-orchestrator-core.md:11`: "The canonical production certification document is `memory/omni-recall/docs/project-status/release-validation-summary.json`."
4. **The freshest verified authority doc names a different file entirely.** `memory/omni-recall/docs/project-status/CI_STATUS_POLICY.md` (v1.4.0, `last_audited: 2026-06-30`, `status: verified`) states certification state is determined ONLY by protected-branch CI gates plus `docs/release/release-validation-matrix.json` — and that matrix file **exists** (12,684 bytes, verified 2026-07-03 via `ls -la docs/release/release-validation-matrix.json`). Creating a summary JSON that the older doc-pointers describe as "Certification authority" would plant a third competing authority surface.

Creating the file at either candidate path under these conditions would risk exactly the shadow-certification hazard the repo's own CI guards (`scripts/ci/guard-agent-destructive-actions.mjs`, `scripts/ci/check-release-certification-docs.mjs`) exist to block. Per the contract's hard constraint ("If the canonical path for FR-A is ambiguous after the Phase 0 investigation, output UNCERTAIN and escalate — do not guess"), FR-A is escalated to JR with this evidence. **Decision needed from JR:** (a) confirm the intended committed location and schema for a machine-readable evidence index (or confirm `docs/release/release-validation-matrix.json` already fills this role), or (b) confirm the filename stays CI-artifact-only and the two stale doc pointers (`CHANGELOG.md:213-214`, `.agents/omnihub-orchestrator-core.md:11`) should be reconciled instead.

## FR-B — `scripts/verify-changelog-paths.js` fix: **DONE** (commit `de9e8e2`)

- Failing test written first: `tests/ci/verify-changelog-paths.test.mjs` (follows the existing `tests/ci/` node:assert + `spawnSync` fixture convention of `tests/ci/secret-scan-fixtures.test.mjs`; run with `node tests/ci/verify-changelog-paths.test.mjs`). Pre-fix run failed with "permanently-deleted record must not be flagged" while confirming the genuinely-missing fixture path WAS flagged.
- Fix: token capture is now per-line; lines containing a deletion marker (`permanently deleted`, `— removed`, `— deprecated and removed`) are skipped. No new dependency; 2 files changed.
- Real run against `CHANGELOG.md`: **23 warnings before → 14 after.** The 9 removed are exactly the deletion-record tokens on `CHANGELOG.md:213-217`.
- **Remaining 14 warnings, classified (reported per the FR-B STOP condition, deliberately not fixed here):**
  - Relocated to the omni-recall tree (7 warnings; entries are historical point-in-time references): `docs/integration/sbbl-hq-v1.6.0-patch.md` (×3), `docs/integration/sbbl-omnihub-validation-2026-05-11.md`, `docs/platform/OMNIDASH.md`, `docs/monitoring/idempotency_hitrate.json`, `docs/ops/OPS_RUNBOOK.md` — each verified present under `memory/omni-recall/docs/...`.
  - Historical paths that no longer exist in any tree (3): `docs/CURRENT_PLATFORM_STATE_2026_06_02.md` (superseded by later dated snapshots under `memory/omni-recall/docs/`), root `public/_headers` (live headers file is `apps/omnihub-site/public/_headers`, which exists), `supabase/migrations/20260226000001_rollback_receipt_cleanup.sql` (actual files: `20260226000001_rollback.sql`, `20260226000004_rollback_receipt_cleanup.sql` — the entry predates a rename).
  - Non-path false positives of the token filter, out of this contract's scope (3): the regex literal at `CHANGELOG.md:58` and npm package names `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/sdk-node` (`CHANGELOG.md:224-225`).
  - External-package path (1): `ci/scripts/apex_policy_check.py` (`CHANGELOG.md:47`) belongs to the embedded APEX Bible governance package's changelog; the directory has never existed in this repo.

  None of these is a current-authority regression; all pre-existed the fix.

## FR-C — CHANGELOG backfill: **DONE** (commit `a2748ad`)

- Last recorded entry before backfill: `## 1.8.3` (PR #1529, committed `7f498b6` — last commit touching `CHANGELOG.md`).
- Enumeration source: `git log origin/main --first-parent 7f498b6..origin/main` (37 first-parent commits).
- PRs backfilled (25): #1533, #1535, #1536, #1537, #1540, #1542, #1543, #1545, #1548, #1549, #1550, #1551, #1552, #1553, #1555, #1556, #1557, #1558, #1559, #1561, #1562, #1563, #1564, #1565, #1567. Direct-to-`main` commits also recorded: the A.R.I.S.E. Phase 1a/1b series (`ac611ca`–`180eb7d`), `/launch` static page removal (`845fced`), CompressionEngine optimization (`cd6e4d7`).
- Format used: a `## [Unreleased]` section at the top of the changesets region with `### Minor Changes` / `### Patch Changes` bullets carrying `(PR #n)` citations — matching the existing 1.8.x sections and the `[Unreleased]` header already used in this file. PR titles for the three plain merge commits (#1557, #1563, #1545) were taken from their merge-commit bodies, not memory.
- Verified: post-edit `node scripts/verify-changelog-paths.js` still reports 14 warnings (zero introduced); `node scripts/ci/check-release-certification-docs.mjs` and `node scripts/ci/guard-agent-destructive-actions.mjs` both pass.

---

## Certification statement

No self-certification performed. This closure is evidence-complete; the certification act (if any is required beyond the existing #1555 merge) remains JR's. FR-A specifically was **not** executed, because executing it on the contract's assumptions would have created a hand-authored file under the repo's reserved certification filename — the decision on its canonical location, schema, and whether it should exist as a committed file at all is escalated to JR above.
