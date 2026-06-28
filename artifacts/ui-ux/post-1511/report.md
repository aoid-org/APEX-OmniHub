# Post-1511 OmniDash After-Evidence Report

## Decision
**PARTIAL GO.** CSS extraction and responsive repair passed repo-level
validation (typecheck, lint, vitest, build, Playwright overflow matrix).
**Authenticated dashboard after-screenshots are BLOCKED** — no authenticated
session is available in this ephemeral container and the local preview build
carries no client-side Supabase config, so `/omnidash` redirects to `/auth`.

## Environment
- Branch: `followup/post-1511-omnidash-css-responsive-evidence`
- Base commit: `1111caa` (post-#1511 `main`)
- URL: `http://localhost:4173` (local `vite preview` of the production build)
- Auth source: **none available** — `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` unset,
  no `playwright/.auth/e2e-test-user.json`, and the preview build has empty
  `VITE_SUPABASE_*` so the browser app has no backend to authenticate against.
- Viewport matrix: 1440×900, 1280×800, 1024×768, 393×851
- Browser: Chromium build 1194 (`/opt/pw-browsers/chromium-1194`), launched via
  `executablePath` (Playwright's pinned 1208 headless-shell is not installed here).

## Screenshots Captured
| File | Surface | Viewport | Status |
|---|---|---|---|
| `after/auth-page-desktop-1440.png` | **Auth/login page** (not dashboard) | 1440 | Captured — h-overflow=false (sw=cw=1440) |
| `after/auth-page-narrow-desktop-1280.png` | **Auth/login page** | 1280 | Captured — h-overflow=false (sw=cw=1280) |
| `after/auth-page-tablet-1024.png` | **Auth/login page** | 1024 | Captured — h-overflow=false (sw=cw=1024) |
| `after/auth-page-mobile-393.png` | **Auth/login page** | 393 | Captured — h-overflow=false (sw=cw=393) |

> These are honestly labeled as the **unauthenticated auth gate**, the surface
> `/omnidash` redirects to without a session. They demonstrate the served app is
> responsive (no horizontal overflow at any tested viewport) but are **NOT**
> proof of authenticated OmniDash UX. No unauthenticated fallback is presented
> as authenticated evidence.

### BLOCKED (authenticated dashboard surfaces)
The following could not be captured and are NOT marked complete:
`desktop-1440-{landing,header,kpi-band,integrated-apps-gallery,observability-*}`,
`narrow-desktop-1280-landing`, `tablet-1024-landing`,
`mobile-393-{landing,nav-or-drawer,integrated-apps-gallery,kpi-band}`,
plus the optional modal surfaces.

**Reason:** no authenticated session + no client-side Supabase config in the
preview build → `/omnidash` → `/auth`.
**Smallest next action:** run the screenshot capture against a deployed origin
(Cloudflare Pages preview from CI) with `VITE_SUPABASE_*` set and a provisioned
E2E test user (`E2E_USER_EMAIL`/`E2E_USER_PASSWORD` or the globalSetup
`playwright/.auth/e2e-test-user.json`), reusing `signInWithSupabaseSession`.

## Responsive Findings
Dashboard responsive structure is proven WITHOUT a browser session by the vitest
guardrail (renders the REAL `OmniDashShell`), and the served-app overflow matrix
is proven in a real browser by the Playwright spec.

- **1440 (desktop):** two 300px rails + center grid; no overflow. Vitest:
  OmniGridTop uses `minmax(0, 220px) minmax(0, 1fr) minmax(0, 220px)`.
- **1280 (narrow desktop):** the prior cramming source. Rails now shrink to 240px
  via `--omni-rail-width` (media query 1025–1365px); side grid columns shrink via
  `minmax(0, …)`. Playwright: no horizontal overflow.
- **1024 (tablet):** JS `useViewport` drops rails to the drawer; single column.
  Playwright: no horizontal overflow.
- **393 (mobile):** bottom nav + drawer; vitest confirms `grid-template-columns:
  1fr`. Playwright: no horizontal overflow; mobile nav targets ≥44px.

## CSS Extraction Findings
- Styles extracted to `omniSkin.css` (OSE v1.1 component layer):
  `ose-icon-button` (+`:hover`/`:focus-visible`/disabled), `ose-icon-button__badge`,
  `ose-avatar-button` (+`:focus-visible`), `ose-integrated-apps-grid`,
  `ose-integrated-apps-slot`; 44px min targets under `(pointer: coarse)`.
- Rail width moved from an inline `300px` literal to the `--omni-rail-width`
  token (theme.css) applied via `.omni-sidebar`/`.omni-right-panel`; retired the
  `OMNI_RAIL_WIDTH` JS constant.
- Inline styles intentionally retained: theme-conditional header background, live
  health/status `rgba()`, sprite/asset background URLs, DraggableWidget transforms,
  orbital-ring/comet SVG geometry + animations.
- Remaining inline-style debt (logged for a follow-up extraction PR):
  M03Panels.tsx (53), PrimaryKpiBand.tsx (13), OmniMediaLaunchWidget.tsx (6),
  ObservabilityToggle.tsx (4), and shell decorative blocks (NavItem tiles,
  blueprint grid, watermark).

## APEX Truth Checks
- Rendered: yes (auth page captured; dashboard structure rendered in vitest).
- Usable: responsive — no horizontal overflow at any tested viewport.
- Backed by correct ownership: gallery stays display-only (guardrail test).
- No fake Connections split: confirmed (guardrail asserts absence).
- No Connect App CTA in gallery: confirmed (guardrail asserts absence).
- No horizontal overflow: confirmed at 1440/1280/1024/393 (Playwright).
- No critical console errors: served app shows 3 non-fatal resource errors
  (no backend in preview); no ChunkLoad/React/hook errors.

## Remaining Follow-Up
- Authenticated dashboard after-screenshots against a deployed origin (BLOCKED here).
- Second-wave inline-style extraction (M03Panels, PrimaryKpiBand, decorative blocks).
- Data-viz honesty pass (out of this PR's scope).
