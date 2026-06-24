---
version: 1.8.0
created: 2026-06-21
last_audited: 2026-06-21
status: release-cut — PENDING CERTIFICATION
supersedes: RELEASE_NOTES_v1.6.0.md
---
> **Historical Note:** This document contains legacy certification terminology. It has been superseded by the manual owner-approval process. CI now produces factual validation summaries only. CI validates. Owner certifies.

# Release Notes — v1.8.0

> **Status: RELEASE CUT — PENDING CERTIFICATION (2026-06-21).**
> This version has been **cut** (`package.json` 1.7.1 → 1.8.0 via `changeset version`,
> release-cut PR #1443) but is **not yet CERTIFIED**. Per `docs/project-status/CI_STATUS_POLICY.md`,
> a version is only "released/certified" once `release-evidence.json` emits `CERTIFIED`.
> Do not present v1.8.0 as the shipped/current version until that artifact exists. The
> current certification verdict remains **`NOT_CERTIFIED_NO_RELEASE_CUT`** until the
> release pipeline completes (see "Path to certification" below).

## Summary

v1.8.0 is a **minor** release rolling up the unreleased work since v1.7.1: the APEX
Agent restored to LIVE / demo-ready, platform drift-governance hardening, and the
OmniDash canonical widget rescue.

## Highlights

### Minor (new capability)
- **APEX Agent LIVE / demo-ready** — full end-to-end path verified 2026-06-19
  (OmniSlate → Cloudflare → Supabase `apex-agent` → Render orchestrator → Temporal
  Cloud → `agent_runs` → SSE → UI). See `docs/APEX_AGENT_OPERATIONS.md`.
- **Ops Doc Drift Guard CI** (`.github/workflows/ops-doc-guard.yml` +
  `scripts/ci/check-ops-doc-drift.mjs`) — fails PRs that change a runtime contract
  without updating `docs/APEX_AGENT_OPERATIONS.md`.
- **`omni_policies` governance table** provisioned with 7 tailored APEX policies.
- **Module-keyed action capability map** (`moduleActionCapabilities.ts`, keyed by
  `moduleKey + actionId`) — replaces the global action whitelist; unsupported
  OmniDash actions fail-closed with module-specific copy and never call
  `trigger-workflow`.

### Patch (correctness / UX)
- **Links** is now a genuine local URL-staging surface — validates input, never
  permanently disables the Add Link button, shows "staged locally" /
  "OmniSlate handoff not connected" copy, and never invokes OmniBoard.
- **Live `omnilink-port` Links resolver** returns an honest empty link-context
  state (no `integrations` read, no `test-all`).
- **Action-label humanization** — labels equal to the id or containing underscores
  are humanized (`create_workflow` → `Create Workflow`).
- **OmniBoard wizard** gained request-timeout handling and an explicit connection
  error taxonomy (missing config, invalid URL, unreachable/CORS, HTTP non-2xx,
  auth required, timeout).
- Live module action-id normalization; widget modal-contract + action-endpoint UX
  repairs.

## Verified facts (2026-06-21)

| Item | Value |
|---|---|
| Package version | `1.8.0` (root `package.json`); app `1.3.10` |
| Base `main` at cut | `966d695f` (PR #1441) |
| Release-cut PR | #1443 (`chore: version packages`) |
| src TS/TSX · components | 326 · 94 |
| Edge function dirs | 32 (31 + `_shared`) |
| Migrations | 94 `.sql` (90 forward + 4 rollback) |
| Workflows · orchestrator Python | 23 · 103 |

## Path to certification (remaining)

1. Squash-merge PR #1443 → `main` HEAD subject `chore: version packages`.
2. `release.yml` `release_signal` → `release_cut=true`; re-runs the 5 `verify:release` gates on current HEAD. `compliance.yml` auto-creates the **`v1.8.0`** tag + GitHub release (driven by `package.json`).
3. Shadow deploy to `apex-omnihub-shadow` + health check (resolve blocker **B-3**: preflight HTTP 403 on the `production-shadow` env check — needs production secrets / widened PAT scope).
4. **Human approval** of the `production-shadow` GitHub Environment gate (required reviewer).
5. `release-evidence.json` emits `CERTIFIED` → flip verdict in
   `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` +
   `docs/project-status/CI_STATUS_POLICY.md` (clears open P0 **B-2**), and update
   this file's `status` to `CERTIFIED`.
