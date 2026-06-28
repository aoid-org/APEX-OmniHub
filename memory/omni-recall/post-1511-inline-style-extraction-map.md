# Post-1511 Inline-Style Extraction Map

> Classification of OmniDashShell + component inline styles for the post-1511
> OmniSkin CSS extraction. Live-tree only. Visually preserving.
>
> Legend:
> - **STATIC_EXTRACT** — static, move to an `ose-*` CSS class
> - **DYNAMIC_KEEP** — runtime geometry / live state, keep inline
> - **DYNAMIC_CAN_USE_CSS_VAR** — mostly static; theme/state via CSS var or class modifier
> - **DO_NOT_TOUCH** — out of scope or high-risk

## Scope decision
Extraction targets the contract's named high-risk, repeated, **interactive** surfaces
where moving to CSS also buys `:hover` / `:focus-visible` / disabled / 44px touch
parity. The 136 shell inline styles are NOT all extracted in this PR — large static
decorative blocks (orbital rings, blueprint grid, watermark) stay inline (verbatim,
low-risk, non-interactive) and are logged as remaining debt. This is an explicit
PARTIAL extraction (allowed by contract).

## OmniDashShell.tsx

| Element | Lines (approx) | Class | Classification |
|---|---|---|---|
| Header action icon buttons: Theme toggle, Bell | 602, 624 | `ose-icon-button` | **STATIC_EXTRACT** (34×34 base; color via inline/var; +focus-visible +44px coarse) |
| Header avatar (initials) | 647 | `ose-avatar-button` | **STATIC_EXTRACT** (static gradient/shape; text content dynamic) |
| Bell unread badge | 635 | `ose-icon-button__badge` | STATIC_EXTRACT (count is dynamic text) |
| Header shell container | 472 | `ose-header` | **DYNAMIC_CAN_USE_CSS_VAR** (bg is isDark-conditional → CSS var via theme) |
| Footer bar | 1605 | `ose-footer-bar` (extend existing `.omni-footer-bar`) | STATIC_EXTRACT |
| Integrated Apps Gallery container | 1311 | `ose-integrated-apps-gallery` | STATIC_EXTRACT |
| Integrated Apps Gallery grid | 1315 | reuse `.omni-grid-apps` + CSS | **STATIC_EXTRACT** (fixes grid responsiveness) |
| Integrated Apps Gallery slot | 1317 | `ose-integrated-apps-slot` | STATIC_EXTRACT (awaiting empty state) |
| OmniGridTop grid columns | 1345 | `.omni-grid-top` + CSS breakpoints | **DYNAMIC_CAN_USE_CSS_VAR** (remove inline `220px 1fr 220px`; use CSS auto-fit + breakpoints) |
| Sidebar rail width / panel widths | 333, 1471, 1562 | `.omni-sidebar` / `.omni-right-panel` + CSS | DYNAMIC_CAN_USE_CSS_VAR (narrow-desktop width reduction) |
| NavItem tile (orange glass) | 250 | — | DYNAMIC_KEEP (hover state via JS `hov`; large; defer) |
| Agent orbital rings / comet SVGs | 770–860 | — | DYNAMIC_KEEP (animation + SVG geometry) |
| Blueprint grid bg / watermark | 1496, 1540 | — | DYNAMIC_KEEP (theme-conditional decorative; low risk; defer) |
| DraggableWidget transforms | (DraggableWidget.tsx) | — | DO_NOT_TOUCH (runtime drag geometry) |

## PrimaryKpiBand.tsx / ObservabilityToggle.tsx / M03Panels.tsx
- Mostly self-contained component styling. **Defer** to a later extraction PR —
  not named high-risk targets, and not the source of responsive cramming. Logged
  as remaining debt. (ObservabilityToggle already has data-testid + accessible
  toggle semantics from #1511.)

## media/OmniMediaGallery.tsx
- Already className-driven (0 inline `style={{`). No action.

## Dynamic styles intentionally retained (verbatim)
- Theme-conditional header background (→ resolved via CSS var, not inline branch)
- Live health/status `rgba()` palette (channel + alpha) in NavItem/ContextDroplet
- Sprite `backgroundPosition` / asset `backgroundImage` URLs
- DraggableWidget transform coordinates
- Orbital-ring + comet SVG geometry and keyframe animations

## Remaining inline-style debt (for a follow-up extraction PR)
- M03Panels.tsx (53), PrimaryKpiBand.tsx (13), OmniMediaLaunchWidget.tsx (6),
  ObservabilityToggle.tsx (4)
- Shell decorative blocks: orbital rings, blueprint grid, watermark, NavItem tiles
