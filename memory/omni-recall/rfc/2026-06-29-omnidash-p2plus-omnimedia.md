# RFC — OmniDash P2+ layout remediation + OmniMedia images/caps (PR #1516)

**Status:** Implemented · **Date:** 2026-06-29 · **Branch:** `claude/omnidash-sidebar-kpi-bar-3186nx`

## Context

Owner-driven, evidence-gated remediation of the OmniDash shell plus an OmniMedia
upgrade. Validated by a real authenticated Playwright user-shoes suite
(`tests/e2e-playwright/omnidash-real-user.spec.ts`, 15 tests across 5 viewports).

## Architecture-impacting changes

### 1. OmniMedia data model + edge contract
- **DB:** `omnimedia_assets.kind` CHECK widened to include `image`; bucket
  `omnimedia-assets` MIME allowlist extended with image types; per-file limit set
  to 25 MB. Migration `20260629120000_omnimedia_images_and_caps.sql` (additive,
  idempotent).
- **Edge `omnilink-port` / `omnimedia.ts`:** `omnimedia-ingest-from-upload` accepts
  `kind=image` and enforces **server-side** caps — 5 uploads / 24h and 25 MB
  cumulative per user (RLS-scoped), returning `429` with honest copy. Caps are
  server-side by design so they cannot be bypassed by a client.
- **Pipeline:** Files→OmniMedia is the existing path (`getPlayableMediaKind` →
  `omnimedia-assets` bucket → `omnimedia-ingest-from-upload`); image MIME entries
  make images flow through it automatically into the right-rail mini gallery.

### 2. OmniDash shell layout (no service/runtime impact)
- App Gallery reshaped to four horizontal "Awaiting" slots; Primary Metrics band
  removed; OmniSlate on-mount auto-scroll guarded (canonical top row no longer
  clipped); wallpaper grid + wordmark made `position:fixed` (static); SidebarKpiBar
  moved into the footer; footer status bar consolidated; language switcher surfaced
  in the OmniDash header.

## Drift protection
- Canonical layout invariants enforced in `scripts/ci/check-omnidash-integrity.mjs`.
- Runtime regression shield: `tests/e2e-playwright/omnidash-real-user.spec.ts`.
- Operational contract recorded in `docs/APEX_AGENT_OPERATIONS.md` §9.11.

## Rollback
`git revert` the PR range, then redeploy `omnilink-port` from the reverted source.
The migration is additive (no destructive revert required; `image` simply becomes
unused).
