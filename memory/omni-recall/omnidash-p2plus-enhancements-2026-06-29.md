> **Current-state note (2026-07-05):** Later OmniDash surface repair commits through `d22ddcf` are captured in `docs/CURRENT_PLATFORM_STATE_2026_07_05.md`; this PR #1516 record remains the canonical layout-law baseline for that enhancement set.

# OmniDash P2+ Enhancements — PR #1516 (2026-06-29)

Canonical record of the owner-driven OmniDash + OmniMedia enhancement pass.
Companion to the RFC (`memory/omni-recall/rfc/2026-06-29-omnidash-p2plus-omnimedia.md`)
and the operational record (`docs/APEX_AGENT_OPERATIONS.md` §9.11). Enforced by
`scripts/ci/check-omnidash-integrity.mjs` (`npm run check:omnidash`) and the
authenticated user-shoes suite (`tests/e2e-playwright/omnidash-real-user.spec.ts`).

## Canonical layout (locked — do not regress)
- **Top row above the fold:** APEX Agent · OmniSlate · APEX Ecosystem fully
  visible on load. OmniSlate's `scrollIntoView` is guarded (`messages.length ===
  0 → return`) so it never auto-scrolls the canvas on mount.
- **App Gallery:** four **horizontal** "Awaiting" slots (`repeat(4, minmax(0,1fr))`),
  label "App Gallery", no Connect affordance, non-interactive. The Primary Metrics
  / `PrimaryKpiBand` band is **removed**.
- **System KPIs:** `SidebarKpiBar` in the **left sidebar footer** (full width,
  matches nav items). Right-rail `SystemHealthRow` removed.
- **Wallpaper + wordmark:** both `position:fixed` — static, never scroll.
- **Footer status bar:** copyright + Guardian only (no version chip, no duplicate
  Edmonton, no redundant Zero Trust). Location joined to sidebar branding.
- **Language switcher:** surfaced in the OmniDash header (`.omni-header-lang`).

## Mobile / tablet (one-handed, never obfuscated)
- **Header de-clip (JSX-driven via `isDesktop`):** on `<1024px` the secondary
  search field is dropped, the wordmark shrinks, and the action cluster (org ·
  Zero Trust · Connect AI · language · theme · notifications · account) shrinks +
  scrolls horizontally so no control is ever clipped off the right edge.
- **Flick-to-set (mobile/tablet only):** after the long-press pick-up, a fast
  flick release (`>=0.5px/ms`, `>=24px`) flings a widget's context into OmniSlate
  via the `omnislate-drop` event, with a fly-then-settle animation. Desktop keeps
  precise drag-and-drop. Velocity-gated to avoid scroll conflict.

## Modal behavior
- **OmniBoard modal:** single Close control (the OmniSpatialHost chrome's X). The
  wizard's redundant `✕` was removed; voice capture now stops on unmount. Backdrop
  click and Esc also close (pre-existing Modal Law).

## OmniMedia (images + Files pipeline + caps)
- `omnimedia_assets.kind ∈ {video, audio, image}`; bucket MIME allowlist extended
  with `image/jpeg|png|webp|gif|avif`; per-file limit 25 MB. Migration
  `20260629120000_omnimedia_images_and_caps.sql` (applied to `rtopreovkywofgwgmozi`).
- **Server-side** upload caps in `omnilink-port/omnimedia-ingest-from-upload`:
  5 uploads / rolling 24h and 25 MB cumulative per user (`429` on breach).
- Files routes media uploads to OmniMedia via `getPlayableMediaKind`, so images
  flow through the same pipeline automatically into the right-rail mini gallery
  (min-height raised so previews aren't cramped).

## Persistence
- **Data:** OmniMedia assets in Supabase (`omnimedia_assets` + private storage
  bucket), RLS owner-scoped; caps enforced server-side. Durable, cross-device.
- **UI prefs:** localStorage, per-device (`apex.sidebar.kpi.collapsed`,
  `apex_locale`, `omnidash_layout_v2:{userId}:{breakpoint}`).
