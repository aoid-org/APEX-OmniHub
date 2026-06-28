# APEX Truth Test — User Flow: OmniMedia Load (04)

- **PR:** #1511 · **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1` · **Head:** `6fe51c4`

## Per-row evidence schema

| Field | Value |
|---|---|
| Claim | OmniMedia catalog loads and renders the user's owned media (or an honest empty/error state) |
| Status | BLOCKED |
| Surface | OmniMedia gallery (`apps/omnihub-site/dashboard/components/media/OmniMediaGallery.tsx`) |
| Action | Open OmniMedia -> client invokes catalog load (`omniMediaCatalog.ts`) |
| Expected | 200 `{items}` renders catalog; empty owned catalog -> 200 `{items:[]}` honest empty state; any failure -> honest "OmniMedia is temporarily unavailable. Retry, or check media service status." with Retry |
| Actual | UNVERIFIED — no authenticated browser session against a deployed origin |
| Evidence file | this file |
| Trace file | BLOCKED -> `traces/` (none) |
| Screenshot | BLOCKED -> `screenshots/` (none) |
| Network proof | BLOCKED -> `network/` (see 05) |
| Persistence proof | BLOCKED -> see 07 (server-persisted by design) |
| Secret redaction checked | yes (no secrets in this doc) |
| Decision impact | NO-GO for full release certification until live flow is exercised under auth |

## Intended flow (documented from code, not live-run)

1. User opens OmniMedia surface.
2. Client (`omniMediaCatalog.ts`) invokes the catalog endpoint.
3. Backend (omnilink-port path) returns:
   - 200 `{items:[...]}` -> gallery renders items (Play / Delete per item).
   - 200 `{items:[]}` -> honest empty state.
   - non-2xx (e.g. backend disabled 503 / origin 403 / JWT 401) -> client
     collapses to an `OmniMediaError` code; gallery shows honest unavailable copy
     + Retry, preserving last-good catalog.

## Live run

**BLOCKED.** Dependency: an authenticated browser session against a deployed
origin (and at least one asset in `omnimedia_assets`, currently 0 rows). No
screenshots/traces/video can be produced in this ephemeral container.
