# APEX Truth Test — Negative-State Honesty (08)

- **PR:** #1511 · **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1` · **Head:** `6fe51c4`

## Summary

The OmniMedia error state is now **honest in code**: every catalog/ingest/delete
failure collapses to a stable `OmniMediaError` code, and the gallery renders i18n
copy "OmniMedia is temporarily unavailable. Retry, or check media service status."
inside a `role="alert"` region with a Retry control. The previous defect (raw SDK
text "Edge Function returned a non-2xx status code") is fixed.

## Negative states to test

| # | Negative state | Trigger (backend cause) | Expected user-facing behavior | Code basis | Live status |
|---|---|---|---|---|---|
| 1 | Backend disabled | `OMNILINK_ENABLED !== 'true'` -> 503 (index.ts:1418-1419) | Honest "temporarily unavailable" + Retry; NO raw SDK text; last-good catalog preserved | `omnimedia_catalog_failed` (lib 105-109); gallery 120/128/138 | BLOCKED (live) |
| 2 | Origin not allowlisted | non-allowlisted origin -> 403 (index.ts:1423) | Same honest copy + Retry | same collapse path | BLOCKED (live) |
| 3 | Missing / invalid JWT | no/invalid auth -> 401 (index.ts:746-751) | Same honest copy + Retry (or auth redirect upstream) | same collapse path | BLOCKED (live) |
| 4 | Empty owned catalog | DB query returns no rows -> 200 `{items:[]}` | Honest empty state (NOT an error) | code trace: empty -> 200 | BLOCKED (live; 0 rows present) |
| 5 | Ingest failure | upload/ingest path error | Honest failure surfaced; `omnimedia_ingest_failed` | lib 135-141 | BLOCKED (live) |
| 6 | Delete failure | delete path error | Honest failure surfaced; `omnimedia_delete_failed` | lib 151-153 | BLOCKED (live) |
| 7 | Repeated failure with prior data | second failed load after a good load | Last-good catalog preserved; honest error banner shown alongside | gallery last-good preservation + in-flight dedupe | BLOCKED (live) |

## Per-row evidence schema (representative — state 1)

| Field | Value |
|---|---|
| Claim | Backend-disabled (503) renders honest copy, not raw SDK text |
| Status | PASS (code) / BLOCKED (live) |
| Surface | OmniMedia gallery error region (`role="alert"`) |
| Action | Catalog load while backend disabled |
| Expected | "OmniMedia is temporarily unavailable. Retry, or check media service status." + Retry |
| Actual | Code-confirmed; live render UNVERIFIED |
| Evidence file | this file |
| Trace / Screenshot / Network | BLOCKED -> respective subfolders |
| Persistence proof | last-good catalog preserved (code) |
| Secret redaction checked | yes |
| Decision impact | Honesty fix verified in code; live exercise of all 7 states needed for certification |

## Drift guard

User-facing copy intentionally references "media service status," not
`OMNILINK_ENABLED` or `omnilink-port`. The backend cause is documented here for
engineers only.
