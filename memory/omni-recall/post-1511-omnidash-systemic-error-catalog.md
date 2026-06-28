# OmniDash Systemic Error Catalog + Surface Map (AUDIT ONLY — NO FIXES)

> Mandate: catalog every failure first. No code changes in this pass.
> Branch: `followup/post-1511-omnidash-css-responsive-evidence` · Base `main@1111caa`
> Date: 2026-06-28 · Live target: https://apexomnihub.icu/omnidash

## 0. Evidence method & honest environment limits

- **Code audit:** full read access to the live tree (`apps/omnihub-site`).
- **Live browser test:** ATTEMPTED, **BLOCKED**. Chromium through the agent proxy
  returns `ERR_CONNECTION_CLOSED` for `apexomnihub.icu` (curl works via the CA
  bundle; the browser does not tunnel). So I cannot drive the deployed site.
- **Local browser test:** the build gates `/omnidash` behind Supabase auth; with
  no test-user creds it redirects to `/auth`. So authenticated full-surface
  browser proof is not producible in this sandbox.
- **Console evidence:** taken from the user-supplied DevTools screenshots of the
  live site (authoritative for the backend failures below).

## 1. Surface map (what actually mounts per breakpoint)

`useViewport`: mobile ≤640 · tablet 641–1024 · desktop >1024.
Rails render ONLY when `isDesktop`. Sidebar renders ONLY when `isDesktop`.

| Region | Desktop >1024 | Tablet 641–1024 | Mobile ≤640 |
|---|---|---|---|
| Top header (OmniSkills, search, org, Zero Trust, Connect AI, theme, bell, avatar) | ✅ full | ✅ (can crowd) | ✅ (crowds/clips) |
| **Left sidebar module nav** (OmniBoard, PhysiOmni, Audits, Links, Automations, Workflows, Files, Billing, Settings) | ✅ | ❌ **UNMOUNTED** | ❌ **UNMOUNTED** |
| Main canvas: KPI band, Agent, OmniSlate, Ecosystem, Integrated Apps Gallery, Observability | ✅ | ✅ (1-col) | ✅ (1-col) |
| Right rail: SystemHealthRow, OmniTraceFeed, **OmniSentryWidget**, SentinelPanel, **OmniMediaLaunchWidget** | ✅ all 5 | ❌ rail unmounted | ❌ rail unmounted |
| Mobile drawer (replaces rail) | n/a | ⚠️ only 3/5: SystemHealthRow, OmniTraceFeed, SentinelPanel | ⚠️ only 3/5 |
| Footer bar | ✅ | ✅ | ❌ hidden via CSS |
| Bottom nav (Home/Slate/Apps/Insights/More) | ❌ | ✅ (dead) | ✅ (dead) |
| OmniSpatialHost (modals), GlobalMediaDock | ✅ | ✅ | ✅ |

**Surface-map verdict:** on tablet & mobile the **primary module navigation
(sidebar) is entirely unmounted** and its replacement (bottom nav) is
non-functional, and **2 of 5 rail widgets (OmniSentry, OmniMediaLaunch) are
dropped** from the drawer. There is no path to OmniBoard/Billing/Settings/etc. on
tablet or mobile.

## 2. Error catalog (each failure → root cause → evidence → severity)

| # | Symptom (user-reported) | Root cause | Evidence (file:line) | Layer | Sev |
|---|---|---|---|---|---|
| E1 | Footer buttons do nothing | `mobileTab` is set by the bottom nav but **no surface reads it**; nothing switches on tab change | `OmniDashShell.tsx:1361` decl, `:1616` passed to nav; zero other reads | Navigation controller | **P0** |
| E2 | Home stays selected regardless | Same as E1 — the active tab updates locally but no surface changes, so it reads as "stuck" | `OmniMobileBottomNav.tsx` (active = `activeTab===id`); no router | Active-state model | **P0** |
| E3 | OmniBoard permanently active | `activeNav` defaults to OmniBoard and `onCancel` resets to `'OmniBoard'`; it only opens modals, never reflects a real surface | `OmniDashShell.tsx` `handleNav` → `useOmniModal.getState().invoke`, `onCancel: setActiveNav('OmniBoard')` | Active-state model | **P1** |
| E4 | Tablet/mobile lose major widgets | Sidebar + both rails are gated on `isDesktop`; drawer carries only 3/5 rail widgets | `OmniDashShell.tsx` `{isDesktop && <OmniDashSidebar/>}`, rails `{isDesktop && ...}`, drawer block omits OmniSentry/OmniMediaLaunch | Conditional mounting | **P0** |
| E5 | Widget controls inaccessible / not mounted | `DraggableWidget` renders only a drag badge — **no per-widget controls** (settings/close/minimize/resize) are mounted | `DraggableWidget.tsx:310-349` (only children + DRAG badge) | Widget mounting | **P1** |
| E6 | No resize behavior | DraggableWidget implements **drag only** (long-press → translate); no resize handles exist anywhere | `DraggableWidget.tsx` (no width/height mutation, no resize handles) | Widget mounting | **P1** |
| E7 | Snap/drop misaligned | Positions stored as `transform: translate()` offsets layered on flex/grid flow; collision resolve uses viewport rects → drift vs flow layout | `DraggableWidget.tsx:199-251` (getBoundingClientRect + delta translate) | Widget layout | **P2** |
| E8 | OmniSlate obstructed by widgets | Dragged widgets persist absolute-ish translate offsets that can overlap siblings (incl. OmniSlate); collision avoidance is best-effort viewport math | `DraggableWidget.tsx:202-220` resolveCollisions | Widget layout | **P2** |
| E9 | Background scroll wrong | Blueprint grid is `position:absolute; inset:0` **inside** the `overflow:auto` canvas, so it scrolls with content instead of staying fixed behind it | `OmniDashShell.tsx:1460-1479` (canvas `overflow:auto`; grid `position:absolute inset:0`) | Layout/overlap | **P2** |
| E10 | Click-outside doesn't close modal | Backdrop button DOES call `abortModal` — but the draggable `motion.div` (drag enabled) + the `pointer-events-none` centering layer can swallow/relocate the dialog so the backdrop isn't hit; behaviour is inconsistent | `OmniSpatialHost.tsx:289-344` (backdrop z-9000 under z-9001 centering layer; `drag` on panel) | Modal engine | **P1** |
| E11 | Duplicate close buttons | Host chrome renders a close X (`OmniSpatialHost.tsx:336`) AND the module content renders its **own** header close using the `onClose` prop | `OmniSpatialHost.tsx:336` + `ModuleRenderer.tsx:18` modules take `{onClose}` and render own header (e.g. OmniBoardModule) | Modal engine | **P1** |
| E12 | OmniMedia "fix didn't work" | The **frontend** honest-error fix IS deployed (screenshot shows my copy). The data is dead because the **backend** `omnilink-port/omnimedia-catalog` → **404** (stale v32 bundle lacks the route) | Live console: `omnimedia-catalog … 404`; `list_edge_functions`: omnilink-port **v32** | Backend deploy | **P0** |
| E13 | Gateway/export/compliance disconnected | Same backend: `omnilink-port/omniboard-start` → **502**; OmniBoard/Billing modals show gateway-unavailable / "Edge Function returned a non-2xx" | Live console: `omniboard-start … 502`, Billing modal raw error | Backend deploy | **P0** |
| E14 | Simulated data in production UI | Demo mode is active in prod → "PRIMARY METRICS (SIMULATED)", "Zero Trust Active (Simulated)", KPIs "simulated" | `OmniDashShell.tsx` `isDemoMode = ops.demo` / `demoMode` from context drives "(Simulated)" labels | Data provenance | **P1** |
| E15 | Billing modal leaks raw SDK error | `BillingModule` surfaces "Edge Function returned a non-2xx status code" verbatim (OmniMedia was sanitized in #1511; Billing was not) | Live screenshot (Billing modal body); `ModuleRenderer.tsx:26` BillingModule | Error honesty | **P1** |

## 3. Systemic root causes (the spine, grouped)

1. **No navigation controller / surface router (E1, E2, E3).** Both nav surfaces
   (footer `mobileTab`, sidebar `activeNav`) set state that no renderer consumes
   to switch the visible surface. Navigation is cosmetic.
2. **Breakpoint-gated unmounting (E4).** Sidebar + rails are `isDesktop`-only with
   an incomplete drawer fallback → tablet/mobile lose primary nav and 2 widgets.
3. **Widget mounting lacks controls + resize (E5, E6, E7, E8).** DraggableWidget
   is drag-only; no controls, no resize, transform-vs-flow drift.
4. **Modal engine duplication + inconsistent dismiss (E10, E11).** Host chrome and
   module headers both render close; draggable panel undermines click-outside.
5. **Stale backend deploy (E12, E13).** `omnilink-port` is still v32; omnimedia
   (404) and omniboard (502) routes are not live. This is deploy/infra, not FE.
6. **Demo/simulated bleed + unsanitized errors (E14, E15).**

## 4. NOT a cause (ruled out from the pasted 8-point diagnosis)
- Modal host missing → FALSE (`OmniSpatialHost` mounted, `OmniDashShell.tsx:1620`).
- Intents never fire → FALSE (sidebar/header/ecosystem all call `invoke`; modals
  visibly open in the screenshots).
- Registry path `src/features/registry.ts` etc. → those are the **non-routed**
  `DashboardOverview` tree; the live route renders `OmniDashShell` (`App.tsx:68`).
- "AWAITING" gallery → intentional display-only empty state (PR #1511), not a bug.

## 4b. CLASSIFIED CATALOG (owner UI-### IDs = canonical; taxonomy-mapped)

Taxonomy: NAV_STATE · DEAD_CONTROL · RESPONSIVE_MOUNTING · LAYOUT_OVERFLOW ·
Z_INDEX_LAYERING · MODAL_CONTRACT · DRAG_SNAP · INTEGRATION_STATE · DATA_MODE ·
ACCESSIBILITY · REGRESSION_TEST_GAP.

| UI-ID | Failure | Taxonomy (primary + secondary) | Root cause (code evidence) | Sev | xref |
|---|---|---|---|---|---|
| UI-001 | Footer buttons do nothing | DEAD_CONTROL + NAV_STATE + REGRESSION_TEST_GAP | `mobileTab` set but never consumed by any surface — `OmniDashShell.tsx:1361,1616` | Blocker | E1 |
| UI-002 | Home always selected | NAV_STATE | active tab not derived from a route/surface; no controller switches content — `OmniMobileBottomNav.tsx:88` | Blocker | E2 |
| UI-003 | OmniBoard always selected | NAV_STATE | `activeNav` defaults to / resets to `'OmniBoard'`; only opens modals — `handleNav`, `onCancel:setActiveNav('OmniBoard')` | Blocker | E3 |
| UI-004 | Widgets missing on tablet/mobile | RESPONSIVE_MOUNTING | sidebar + both rails gated on `isDesktop`; drawer carries 3/5 — shell mounting branches | Blocker | E4 |
| UI-005 | No widget launcher/restorer | RESPONSIVE_MOUNTING + DEAD_CONTROL | no mobile widget-control contract; `DraggableWidget` renders only a DRAG badge — `DraggableWidget.tsx:310-349` | Blocker | E5 |
| UI-006 | Widgets cover OmniSlate | Z_INDEX_LAYERING + DRAG_SNAP | persisted `translate()` offsets + viewport-based collision overlap siblings — `DraggableWidget.tsx:199-251` | Blocker | E8 |
| UI-007 | Background scrolls with content | LAYOUT_OVERFLOW | blueprint grid `position:absolute inset:0` INSIDE `overflow:auto` canvas — `OmniDashShell.tsx:1460-1479` | Major | E9 |
| UI-008 | Snap/drop misaligns | DRAG_SNAP | transform offsets on flow layout; viewport-rect math drifts — `DraggableWidget.tsx:199-251` | Major | E7 |
| UI-009 | Click-outside doesn't close modal | MODAL_CONTRACT | draggable panel + `pointer-events-none` centering layer over backdrop — `OmniSpatialHost.tsx:289-344` | Major | E10 |
| UI-010 | Duplicate close buttons | MODAL_CONTRACT | host chrome X + module renders own header X via `onClose` — `OmniSpatialHost.tsx:336` + `ModuleRenderer.tsx:18` | Major | E11 |
| UI-011 | OmniMedia not playable | INTEGRATION_STATE + REGRESSION_TEST_GAP | backend `omnimedia-catalog` → 404; omnilink-port stuck v32 (FE honest-error IS live) | Blocker | E12 |
| UI-012 | Gateway unavailable | INTEGRATION_STATE | backend `omniboard-start` → 502 — live console | Blocker | E13 |
| UI-013 | Export/compliance not connected | INTEGRATION_STATE | AuditsModule action; same edge-stack gap / unwired backend — `modules/AuditsModule.tsx` | Blocker | (new) |
| UI-014 | Simulated labels in prod | DATA_MODE | demo mode active in prod drives "(Simulated)" — `isDemoMode`/`demoMode` | Major | E14 |
| UI-015 | Top nav clipped tablet/mobile | LAYOUT_OVERFLOW | header action buttons `flexShrink:0` + `whiteSpace:nowrap`, no wrap/overflow strategy — `OmniDashShell.tsx:522,578,593` (min-width:0 added in #post-1511 does NOT fix this) | Major | (new) |
| UI-016 | Bottom-nav icons lack behavior | DEAD_CONTROL + NAV_STATE | **labels ARE present** (`aria-label`, `aria-selected`, `role=tab` — `OmniMobileBottomNav.tsx:78-89`); real defect is no behavior wiring (= UI-001) | Major | E1 |
| UI-017 | Billing leaks raw SDK error | INTEGRATION_STATE + (error-honesty) | `BillingModule` shows "Edge Function returned a non-2xx" verbatim; only OmniMedia was sanitized in #1511 | Major | E15 |

### Correction to seed catalog
- **UI-016**: the bottom nav *does* carry semantic labels/roles (aria-label,
  aria-selected, role=tab). It is therefore **DEAD_CONTROL/NAV_STATE**, not an
  accessibility-label gap. Keyboard path exists; behavior does not.

### Taxonomy roll-up (where the work concentrates)
- NAV_STATE: UI-001, UI-002, UI-003, UI-016
- RESPONSIVE_MOUNTING: UI-004, UI-005
- MODAL_CONTRACT: UI-009, UI-010
- DRAG_SNAP / Z_INDEX_LAYERING: UI-006, UI-008
- LAYOUT_OVERFLOW: UI-007, UI-015
- INTEGRATION_STATE: UI-011, UI-012, UI-013, UI-017
- DATA_MODE: UI-014
- DEAD_CONTROL: UI-001, UI-005, UI-016
- REGRESSION_TEST_GAP: UI-001, UI-011 (and broadly — no test caught footer-dead)

## 5. Proposed repair order (for the NEXT pass, pending go-ahead)
P0 first: (a) navigation controller that both footer + sidebar drive and that
switches the rendered surface + active state; (b) mount sidebar/rails on
tablet/mobile (or a real equivalent) so no surface is lost; (c) backend redeploy
of `omnilink-port` (owner-gated). Then P1: modal dedupe + click-outside, widget
controls, Billing error honesty, demo-mode gating. Then P2: resize, snap/drop,
background scroll. Every item gated by browser evidence per acceptance standard.
