# APEX Truth Test — Data Provenance: OmniMedia Catalog (06)

- **PR:** #1511 · **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1` · **Head:** `6fe51c4`
- **Supabase project:** APEX-OmniHub (`rtopreovkywofgwgmozi`)

## Provenance claim

OmniMedia catalog items originate from `public.omnimedia_assets` and are surfaced
to the UI as playable items via signed URLs.

## Schema status (VERIFIED, live)

- `public.omnimedia_assets` **EXISTS** live, RLS enabled, **0 rows**.
- Migration `supabase/migrations/20260628000000_omnimedia_pipeline.sql` is
  **applied**.

## Field mapping (DB -> catalog item -> UI)

| DB source (`omnimedia_assets`) | Catalog item field | UI consumer | Notes |
|---|---|---|---|
| asset id (PK) | `item.id` | gallery key; Play/Delete target | identity |
| title / name | `item.title` | item label; `aria-label` "Play {title}" / "Delete {title}" | i18n labels (gallery 169/190) |
| storage object path | (resolved) `item.url` / signed URL | Play action | signed URL minted from Storage; not the raw path |
| media kind / mime | `item.type` (where applicable) | render/playback handling | |
| owner id | (RLS filter) | scoping | RLS ensures owned-only items |
| created/updated timestamps | (ordering) | catalog ordering | |

> Exact column names are defined in `20260628000000_omnimedia_pipeline.sql`; the
> mapping above describes the provenance chain. With 0 live rows, a row-to-pixel
> trace cannot be completed here.

## Per-row evidence schema

| Field | Value |
|---|---|
| Claim | Catalog items are real `omnimedia_assets` rows served via signed URLs (no mock/sample data) |
| Status | PASS (schema) / BLOCKED (live row trace) |
| Surface | OmniMedia gallery |
| Action | Catalog load -> map DB rows to items |
| Expected | Items 1:1 with owned `omnimedia_assets` rows; URLs are signed Storage URLs |
| Actual | Schema verified live; 0 rows -> no live item to trace end-to-end |
| Evidence file | this file |
| Trace file | BLOCKED -> `traces/` |
| Screenshot | BLOCKED -> `screenshots/` |
| Network proof | see 05 (BLOCKED) |
| Persistence proof | see 07 |
| Secret redaction checked | yes — signed URLs/tokens MUST be redacted in any live capture |
| Decision impact | Schema/provenance design sound; live provenance proof needed before full certification |
