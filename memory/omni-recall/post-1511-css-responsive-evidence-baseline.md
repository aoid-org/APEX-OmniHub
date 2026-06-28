# Post-1511 CSS / Responsive / Evidence Baseline

> Follow-up to PR #1511 (merged). Scope: inline-style extraction → OmniSkin CSS,
> responsive repair, authenticated after-evidence. Live-tree only, visually
> preserving, non-destructive, rollback-safe.

## Starting State
- Base branch: `main`
- Base commit: `1111caa` (`feat(rc): Post-1510 UI/UX remediation … (#1511)`)
- PR #1511 merge commit: `1111caa` (verified merged into `main`)
- Current branch: `followup/post-1511-omnidash-css-responsive-evidence`

## Live Tree Confirmed
- Files inspected:
  - `apps/omnihub-site/dashboard/OmniDashShell.tsx` (live shell)
  - `apps/omnihub-site/dashboard/components/PrimaryKpiBand.tsx`
  - `apps/omnihub-site/dashboard/components/ObservabilityToggle.tsx`
  - `apps/omnihub-site/dashboard/components/M03Panels.tsx`
  - `apps/omnihub-site/dashboard/components/media/OmniMediaGallery.tsx`
  - `apps/omnihub-site/dashboard/components/media/OmniMediaLaunchWidget.tsx`
  - `apps/omnihub-site/dashboard/omniSkin.css`
  - `apps/omnihub-site/dashboard/omniSkinTokens.ts`
  - `apps/omnihub-site/src/styles/omnidash-layout.css`
  - `apps/omnihub-site/src/styles/theme.css`
  - `apps/omnihub-site/dashboard/hooks/useViewport.ts`
- Ghost paths avoided: `src/components/dashboard/` **EXISTS in repo but is OFF-LIMITS**
  for OmniDash work (instant NO-GO if edited). Will not be touched.

## Inline Style Inventory (`style={{` occurrences)
| File | static `style={{` count |
|---|---|
| `OmniDashShell.tsx` | 136 |
| `M03Panels.tsx` | 53 |
| `PrimaryKpiBand.tsx` | 13 |
| `OmniMediaLaunchWidget.tsx` | 6 |
| `ObservabilityToggle.tsx` | 4 |
| `OmniMediaGallery.tsx` | 0 (already className-driven) |

- Dynamic inline styles that MUST remain:
  - `DraggableWidget` transform/drag coordinates (runtime geometry)
  - `gridTemplateColumns` driven by `isDesktop` (will move to CSS breakpoints)
  - live health/status palette colors (computed `rgba()` from channel + alpha)
  - sprite `backgroundPosition`/`backgroundImage` URLs (asset-driven)
  - theme-conditional `background` on header (isDark) — can become CSS var
- High-risk extraction targets (static, repeated, interactive):
  - Header shell + action buttons (theme toggle, bell, avatar) — **named in contract**
  - Footer bar
  - Integrated Apps Gallery shell + slots
  - Icon-only buttons missing hover/focus-visible parity

## OmniSkin Current State
- `omniSkin.css`: @keyframes (apexPulse, apexShimmer, apexFadeIn, navGlow,
  ringRotate, ringBreath, ringBreath2, scanLine) + shell resets + scrollbar.
  Imported once in `src/main.tsx`. **No component classes yet.**
- `omniSkinTokens.ts`: `T` (CSS-var tokens), `CHANNELS` (decimal RGB), `omniRgba()`,
  `NAV_BG`/`NAV_BORDER`/`NAV_SHADOW`, `HEALTH_PALETTE`. Sound — reuse, don't fork.
- `omnidash-layout.css`: 2212 lines. **Targets `.od-*` and `.apex-hero-*` classes
  used by `DashboardOverview.tsx`, NOT the live shell.** Media queries at 1200,
  1180, 960, 1024, 768, 640, coarse-pointer, reduced-motion — all scoped to
  `.od-*`/`.apex-hero-*`/`.omnidash-shell`. The live shell's `.omni-*` classes
  (omni-shell-main, omni-sidebar, omni-right-panel, omni-grid-top, omni-grid-apps,
  omni-header-actions, omni-header-search, omni-nav-item, omni-footer-bar,
  omni-canvas-container) have **0 CSS rules anywhere**.
- `theme.css`: OmniDash CSS vars (`--omni-*`) for light + dark. Contrast tokens
  fixed in #1511.

## Responsive Current State
- **Mechanism:** 100% JS-driven via `useViewport` (breakpoints: mobile ≤640,
  tablet 641–1024, desktop >1024). The shell branches layout on `isDesktop`;
  grid columns are inline (`"220px 1fr 220px"` desktop / `"1fr"` else).
  There is **no CSS media query that styles the live shell.**
- Desktop 1440: OK — two 300px rails (`OMNI_RAIL_WIDTH=300`) + center grid.
- **Narrow desktop 1280: CRAMMED.** Still `isDesktop` (>1024), so renders two
  300px rails = 600px chrome, leaving ~680px center which then carries a
  `220px 1fr 220px` grid (440px fixed) → middle column squeezed. Header (58px)
  carries many controls with no overflow handling.
- Tablet 1024: `isTablet` → rails drop to drawer; single-column. Functional but
  unverified for overflow.
- Mobile 393: `isMobile` → bottom nav + drawer. Functional but unverified.
- Known overflow/clipping: narrow-desktop center-column squeeze (1025–1366px band).
- Known hidden controls: none confirmed; header overflow strategy absent.
- Known drawer/bottom-nav gaps: right-rail content (SystemHealthRow, OmniTraceFeed,
  OmniSentryWidget, SentinelPanel, OmniMediaLaunchWidget) — mobile drawer only
  surfaces a subset (SystemHealthRow, OmniTraceFeed, SentinelPanel). To verify.

## Evidence Requirements
- Authenticated user/session source: Playwright `signInWithSupabaseSession` helper
  (`tests/e2e-playwright/helpers/auth`), gated by `skipWithoutSupabaseConfig()`.
  Requires real Supabase URL + test-user creds in env. **Availability TBD in Phase 4.**
- Preview/deployed URL: Cloudflare Pages preview is produced by CI on PR; not
  reachable from this ephemeral container without the deployed URL + creds.
- Screenshot destinations: `artifacts/ui-ux/post-1511/after/`
- Trace destinations: `artifacts/ui-ux/post-1511/traces/`

## NO-GO Risks (before implementation)
1. Touching `src/components/dashboard/` ghost path. → Mitigation: live-tree only.
2. Visual regression from extraction (inline → class drift). → Mitigation: extract
   only verbatim-equivalent static styles; keep dynamic inline; build + test + diff.
3. Breaking JS-driven layout by adding conflicting CSS. → Mitigation: CSS media
   queries scoped to existing `.omni-*` classes; keep `useViewport` branching intact.
4. Authenticated screenshots unavailable in container. → Mitigation: responsive
   guardrail tests (scrollWidth ≤ clientWidth) as primary proof; mark screenshots
   BLOCKED with reason if creds absent (→ PARTIAL GO, never fabricated).
5. Reintroducing solved ownership drift (Connections split / Connect-App CTA).
   → Mitigation: gallery stays display-only; guardrail tests already enforce.
