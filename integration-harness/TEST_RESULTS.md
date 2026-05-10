# APEX OmniHub ↔ SBBL-HQ Integration Harness — Test Results Ledger

- **Document Version:** v1.0.0
- **Last Updated (UTC):** 2026-05-10
- **Harness Version:** `integration-harness` (branch `work`)
- **Result Status Legend:** `PASS` | `FAIL` | `BLOCKED` | `UNVERIFIED`

## 1) Run Metadata

| Field | Value |
|---|---|
| Run ID | `CI: integration-harness (GitHub Actions)` |
| Runner | `ubuntu-latest` |
| Trigger | `push` on `main/work/develop` |
| Target repos | `APEX-OmniHub` + sibling `sbbl-hq` |
| Required secrets | `SBBL_SUPABASE_*`, `INTEGRATION_*` |
| Artifacts path | `integration-harness/playwright-report`, `integration-harness/playwright-results` |

## 2) Latest Verified Execution Snapshot

| Date (UTC) | Source | Command | Result | Evidence |
|---|---|---|---|---|
| 2026-05-10 | Local validation | `bash -n integration-harness/run.sh` | PASS | Script syntax validated |
| 2026-05-10 | Local validation | `npx playwright test --list -c playwright.config.ts` | PASS | 12 tests discovered across specs 01–05 |
| 2026-05-10 | CI run | `cd integration-harness && bash run.sh` | FAIL | `SBBL repo not found at ../sbbl-hq` |

## 3) Spec-Level Result Matrix (Current)

> Status is based on latest **executed** evidence only. No fabrication.

| Spec | Name | Latest Status | Notes |
|---|---|---|---|
| 01 | OmniDash render | UNVERIFIED | Not executed to completion in latest CI run |
| 02 | Telemetry websocket | UNVERIFIED | Not executed to completion in latest CI run |
| 03 | OmniPort round-trip | UNVERIFIED | Not executed to completion in latest CI run |
| 04 | Broadcast reflection | UNVERIFIED | Not executed to completion in latest CI run |
| 05 | PPV entitlement sync | UNVERIFIED | Not executed to completion in latest CI run |

## 4) Known Failure History

| Date (UTC) | Failure Class | Failure Detail | Disposition |
|---|---|---|---|
| 2026-05-10 | CI preflight | Missing sibling repo path `../sbbl-hq` | Workflow patched to clone sibling repo before harness run |

## 5) Versioned Change Log

| Version | Date (UTC) | Change Summary |
|---|---|---|
| v1.0.0 | 2026-05-10 | Initial professional test-results ledger with dated run metadata, evidence table, and spec matrix |

## 6) Required Evidence for Promotion to PASS

A run may only be marked `PASS` when all criteria are true:

1. Harness run completes (`bash run.sh`) with exit code `0`.
2. Specs 01–05 all execute and report terminal status.
3. Playwright HTML report is generated and retained.
4. Any skipped tests are explicitly justified in run notes.

