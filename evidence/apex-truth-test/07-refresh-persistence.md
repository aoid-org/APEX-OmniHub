# APEX Truth Test — Refresh / Persistence (07)

- **PR:** #1511 · **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1` · **Head:** `6fe51c4`

## Claim

OmniMedia catalog data survives a full page refresh because it is **server-
persisted** in `public.omnimedia_assets`, not held only in client state.

## Basis (design, verified at schema level)

- `public.omnimedia_assets` exists live (RLS enabled). Catalog items are loaded
  from the server on each mount; there is no client-only source of truth to lose
  on refresh.
- After refresh, the client re-invokes the catalog endpoint and re-renders from
  the same persisted rows -> data survives by design.
- Note: the gallery also preserves a **last-good catalog** in memory across a
  failed reload (UX resilience), but that is on top of, not instead of, server
  persistence.

## Per-row evidence schema

| Field | Value |
|---|---|
| Claim | OmniMedia catalog persists across refresh (server-backed) |
| Status | BLOCKED (live proof) — sound by design |
| Surface | OmniMedia gallery |
| Action | Load catalog -> refresh page -> reload catalog |
| Expected | Identical owned items render after refresh (from `omnimedia_assets`) |
| Actual | UNVERIFIED — requires authenticated session + persisted rows (0 live rows) |
| Evidence file | this file |
| Trace file | BLOCKED -> `traces/` |
| Screenshot | BLOCKED -> `screenshots/` (before/after refresh) |
| Network proof | see 05 (re-invoke on remount) |
| Persistence proof | BLOCKED -> live before/after refresh capture not producible here |
| Secret redaction checked | yes |
| Decision impact | Persistence is architecturally guaranteed; live before/after proof needed for certification |

## Live proof

**BLOCKED.** Dependency: authenticated browser session + at least one persisted
`omnimedia_assets` row to observe surviving a refresh.
