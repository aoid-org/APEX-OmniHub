# APEX Truth Test — Network / API Proof: OmniMedia Catalog (05)

- **PR:** #1511 · **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1` · **Head:** `6fe51c4`
- **Supabase project:** APEX-OmniHub (`rtopreovkywofgwgmozi`)
- **Edge Function:** `omnilink-port` v32 (ACTIVE)

## Per-row evidence schema

| Field | Value |
|---|---|
| Claim | OmniMedia catalog load issues a real network call and receives 200 `{items}` |
| Status | UNVERIFIED / BLOCKED |
| Surface | OmniMedia gallery |
| Action | Catalog load -> POST to the omnilink-port catalog route |
| Expected request | `POST functions/v1/omnilink-port/omnimedia-catalog` with Authorization bearer JWT |
| Expected response | `200 {items: [...]}`; empty owned catalog -> `200 {items: []}` |
| Actual | UNVERIFIED — pending live edge-function logs / authenticated capture |
| Evidence file | this file |
| Trace file | BLOCKED -> `traces/` |
| Screenshot | BLOCKED -> `screenshots/` |
| Network proof | BLOCKED -> `network/` (no HAR/capture available) |
| Persistence proof | n/a here (see 07) |
| Secret redaction checked | yes — no tokens/JWTs/keys recorded; live captures MUST redact Authorization bearer before storage |
| Decision impact | NO-GO for full release until the live non-2xx code is identified and the 200 path is captured under auth |

## Code trace (verified, not live)

- An empty **owned** catalog returns `HTTP 200 {items:[]}`. Therefore a non-2xx is
  NOT a "no media" condition — it comes from a guard BEFORE the DB query in
  `supabase/functions/omnilink-port/index.ts`:
  - `OMNILINK_ENABLED !== 'true'` -> **503** (`omnilink_disabled`, index.ts:1418-1419).
  - Origin not allowlisted -> **403** (`origin_not_allowed`, index.ts:1423).
  - Missing / invalid JWT -> **401** (`unauthorized`, index.ts:746-751).
- The user-facing screenshot ("Edge Function returned a non-2xx status code") maps
  to one of the above guards firing before the query. **Exact live code is pending
  edge-function logs.**

## Required next action

Pull live `omnilink-port` (v32) logs for the failing request to determine the
exact non-2xx status (503 vs 403 vs 401), then capture a redacted 200 `{items}`
response under an authenticated session. Both are **BLOCKED** in this container.
