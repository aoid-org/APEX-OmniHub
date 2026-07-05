---
version: 1.0.0
last_audited: 2026-07-04
status: implemented
---

# RFC 2026-07-04 — README-Cited Documentation Current-State Sync

## 1. Context

The README-cited documentation sync changed architecture-governance and
architecture-reference files, including `governance/doctrine/APEX_BUILD_DOCTRINE.md`,
`memory/omni-recall/docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`,
`memory/omni-recall/docs/architecture/CANONICAL_TRUTH.md`, and orchestrator
architecture documents. The repo governance workflow therefore correctly treats
the PR as architecture-impacting and requires durable RFC evidence.

This RFC records that the change is a **documentation-truth alignment**, not a
runtime architecture change. It exists to satisfy the architecture review marker
and to preserve the decision trail for future maintainers.

## 2. Architecture Impact

- **No runtime topology change.** No application source, Supabase migration,
  Edge Function, orchestrator runtime code, deployment config, secrets, auth,
  RLS policy, or package dependency was changed by this remediation.
- **Architecture authority pointers changed.** README-cited docs now defer
  branch/head/package/count facts to
  `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_04.md`.
- **Certification boundary clarified.** Production certification remains gated by
  `docs/release/release-validation-matrix.json` plus owner/live evidence for
  unresolved `BLOCKED` or `REQUIRES_MANUAL_VALIDATION` items.
- **Historical docs protected from overclaiming.** README-linked historical or
  contextual documents now include current-state notes so they do not imply live
  production proof or supersede the current snapshot.

## 3. Implementation Summary

- Added `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_04.md` with
  repo-verified counts, package versions, latest audited HEAD, and validation
  commands.
- Updated README and documentation index pointers to the current snapshot and to
  the release validation matrix.
- Updated CI/certification language to distinguish CI readiness evidence from
  owner/live production certification.
- Added current-state notes to README-cited architecture, ops, infrastructure,
  testing, governance, OmniDash, and orchestrator documents.

## 4. Validation

- `git fetch --all --prune` — used before recording the snapshot baseline.
- `npm run docs:check` — passed link and file-pointer validation.
- `git diff --check` — passed whitespace/conflict-marker validation.
- Repo count commands recorded in
  `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_04.md` generated the
  updated counts.

## 5. Rollback Plan

Rollback is a pure git revert of the documentation-sync commit(s). Because this
RFC and the linked documentation changes do not alter runtime code, database
schema, deployed infrastructure, credentials, or data, rollback does not require
migration repair, redeploy sequencing, or data cleanup.

**Status:** Implemented.
