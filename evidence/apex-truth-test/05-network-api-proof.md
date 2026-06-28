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

---

## EXECUTED LIVE NETWORK EVIDENCE (lead, 2026-06-28)

Direct probes against the deployed function `omnilink-port` on project
`rtopreovkywofgwgmozi` (`https://rtopreovkywofgwgmozi.supabase.co/functions/v1/omnilink-port/omnimedia-catalog`).
Anon apikey used; **all secrets redacted here** (no token printed). Drift guard: these probe a
*backend dependency* of OmniMedia, not OmniMedia ownership.

| Probe | Request | Status | Interpretation |
|---|---|---|---|
| 1 | POST, no `Origin` | **403** `origin_not_allowed` | The `OMNILINK_ENABLED` 503 gate runs *before* the origin check — a 403 (not 503) proves **`OMNILINK_ENABLED` is enabled**. Config is NOT the cause. |
| 2 | POST, valid `Origin` (`*.apex-omnihub-shadow.pages.dev`), apikey, no user JWT | **404** `not_found` | If the `omnimedia-*` route existed it would return **401** (auth check inside the handler). A **404** proves the deployed bundle (v32) has **no omnimedia routing**. |
| 3 | OPTIONS preflight, valid `Origin` | **204** | Function alive; CORS preflight OK. |

**Root cause (PROVEN, VERIFIED):** the deployed `omnilink-port` (v32) predates the OmniMedia
routing. The DB migration was applied (`omnimedia_assets` exists) but the Edge Function was never
redeployed with the `omnimedia-*` handler, so `omnimedia-catalog` falls through to `404` → the
Supabase SDK surfaces "Edge Function returned a non-2xx status code". Confirmed not 503/403/auth.

**Decision:** `omnimedia-catalog` expected `POST → 200 {items}`; actual `404` (route missing in
deploy). Status: **FAIL (backend), root-caused.** Frontend now degrades honestly regardless.

## Remediation status

- **Frontend (shipped, VERIFIED):** raw SDK error can no longer reach the UI (stable OmniMediaError
  codes + honest i18n copy + Retry). Unit/render tests lock it.
- **Backend deploy (deferred to pipeline, per owner gate):** redeploy must come from CI, not an
  MCP push from this proxied container. The agent proxy does not support the Supabase CLI's
  bundle-deploy transport (gRPC/HTTP2 → `TransportError`; asset upload via REST succeeds). The
  deploy workflows **do** deploy this function:
  - `.github/workflows/deploy-production-cf-direct.yml:163` → `supabase functions deploy omnilink-port`
  - `.github/workflows/deploy-web3-functions.yml:64` → `supabase functions deploy omnilink-port`
  So on merge, CI bundles `supabase/functions/omnilink-port` (now including `omnimedia.ts`) from
  disk and the route goes live. **Not BLOCKED-INFRA** — a deploy path exists and targets this function.
- **Post-merge smoke (required):** re-run probe 2 with a valid origin → expect **401** (route now
  reachable; auth required), and an authenticated catalog call → **200 {items}**.
