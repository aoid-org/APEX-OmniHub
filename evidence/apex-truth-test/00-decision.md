# APEX Truth Test — Decision (00)

- **PR:** #1511 · **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1` · **Head:** `6fe51c4`
- **Supabase project:** APEX-OmniHub (`rtopreovkywofgwgmozi`, ACTIVE_HEALTHY)
- **Date:** 2026-06-28

## Overall Decision

**GO for diff-level/gallery-remediation verification only. NO-GO for full release
certification until APEX Bible truth validation evidence passes.**

## Why GO (diff-level / gallery scope)

- PR #1511 reverts the Connections split back to a display-only "Integrated Apps
  Gallery" (HEAD `6fe51c4`). CI + Cloudflare preview are green.
- The gallery is display-only by design; no live action surface is introduced by
  this widget.

## Why NO-GO (full release certification)

- The full APEX Bible truth-validation evidence pack cannot be completed in this
  ephemeral CI-style container: there is **no authenticated browser session
  against a deployed origin**. Authenticated E2E (screenshots / video / traces /
  live network / axe) is **BLOCKED**, not failed.
- The static fake-surface scan has not yet been executed (placeholder in `01`).
- The exact live non-2xx code from `omnilink-port` is **pending edge-function
  logs**.

## OmniMedia Remediation Status

- **Defect (verified):** user-facing error rendered raw SDK text — "Couldn't load
  your media: Edge Function returned a non-2xx status code."
- **Fix (confirmed in code, this PR):**
  - `apps/omnihub-site/dashboard/lib/omniMediaCatalog.ts` collapses every
    invoke/SDK/timeout failure into stable `OmniMediaError` codes
    (`omnimedia_catalog_failed` / `omnimedia_ingest_failed` /
    `omnimedia_delete_failed`).
  - `apps/omnihub-site/dashboard/components/media/OmniMediaGallery.tsx` shows
    honest i18n copy: "OmniMedia is temporarily unavailable. Retry, or check media
    service status." with a Retry control, in-flight dedupe, and last-good catalog
    preservation.
- **Live confirmation:** BLOCKED on authenticated session + edge-function logs.

## Drift Guard

OmniMedia is the user-facing media surface. `omnilink-port` / `OMNILINK_ENABLED`
are backend/config dependencies only and are never product truth or user-exposed
wording. Allowed phrasing: "OmniMedia depends on the omnilink-port backend path in
this deployment."

## Evidence Index

| File | Scope |
|---|---|
| `01-static-scan.md` | Fake-surface static scan (method + placeholder) |
| `02-product-truth.md` | Per-surface product-truth declaration |
| `03-surface-inventory.md` | Visible action / control inventory |
| `04-user-flow.md` | OmniMedia load flow (live run BLOCKED) |
| `05-network-api-proof.md` | Catalog network/API proof (BLOCKED) |
| `06-data-provenance.md` | omnimedia_assets -> UI field mapping |
| `07-refresh-persistence.md` | Server-persistence / refresh survival |
| `08-negative-states.md` | Negative-state honesty matrix |
| `09-visual-quality.md` | Visual preservation (BLOCKED) |
| `10-accessibility.md` | Accessibility baseline (axe run BLOCKED) |
