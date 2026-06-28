# OmniDash Systemic Error Catalog + Surface Map (AUDIT ONLY — NO FIXES)

**Mandate:** catalog every failure first. No code changes in this pass.
**Branch:** `claude/omnidash-ui-ux-audit-i3ppne` (audit recorded here; originating context referenced `followup/post-1511-omnidash-css-responsive-evidence`, base `main@1111caa`)
**Date:** 2026-06-28
**Live target:** https://apexomnihub.icu/omnidash
**Status:** Repo-truth reconciliation performed against the checked-out tree below. No fixes applied.

---

## 0. Evidence method & honest environment limits

- **Code audit:** full read access to the live tree (`apps/omnihub-site`).
- **Live browser test:** ATTEMPTED, BLOCKED. Chromium through the agent proxy returns `ERR_CONNECTION_CLOSED` for `apexomnihub.icu` (curl works via the CA bundle; the browser does not tunnel). Cannot drive the deployed site from this sandbox.
- **Local browser test:** the build gates `/omnidash` behind Supabase auth; with no test-user creds it redirects to `/auth`. Authenticated full-surface browser proof is not producible in this sandbox.
- **Console evidence:** taken from user-supplied DevTools screenshots of the live site (authoritative for the backend-failure items below; not independently re-verified live by this pass — see §6).
- **Repo-truth reconciliation (this pass):** every code-pointed finding below was re-read against the current checked-out tree on `claude/omnidash-ui-ux-audit-i3ppne`. Line numbers in the original report were taken from a slightly earlier revision and drift by roughly 20–60 lines in `OmniDashShell.tsx`; the underlying defects are confirmed present at the corrected locations noted in §6.

---

## 1. Surface map (what actually mounts per breakpoint)

`useViewport`: mobile ≤640 · tablet 641–1024 · desktop >1024. Rails render ONLY when `isDesktop`. Sidebar renders ONLY when `isDesktop`.

| Region | Desktop >1024 | Tablet 641–1024 | Mobile ≤640 |
|---|---|---|---|
| Top header (OmniSkills, search, org, Zero Trust, Connect AI, theme, bell, avatar) | ✅ full | ✅ (can crowd) | ✅ (crowds/clips) |
| Left sidebar module nav (OmniBoard, PhysiOmni, Audits, Links, Automations, Workflows, Files, Billing, Settings) | ✅ | ❌ UNMOUNTED | ❌ UNMOUNTED |
| Main canvas: KPI band, Agent, OmniSlate, Ecosystem, Integrated Apps Gallery, Observability | ✅ | ✅ (1-col) | ✅ (1-col) |
| Right rail: SystemHealthRow, OmniTraceFeed, OmniSentryWidget, SentinelPanel, OmniMediaLaunchWidget | ✅ all 5 | ❌ rail unmounted | ❌ rail unmounted |
| Mobile drawer (replaces rail) | n/a | ⚠️ only 3/5: SystemHealthRow, OmniTraceFeed, SentinelPanel | ⚠️ only 3/5 |
| Footer bar | ✅ | ✅ | ❌ hidden via CSS |
| Bottom nav (Home/Slate/Apps/Insights/More) | ❌ | ✅ (dead) | ✅ (dead) |
| OmniSpatialHost (modals), GlobalMediaDock | ✅ | ✅ | ✅ |

**Surface-map verdict:** on tablet & mobile the primary module navigation (sidebar) is entirely unmounted and its replacement (bottom nav) is non-functional, and 2 of 5 rail widgets (OmniSentry, OmniMediaLaunch) are dropped from the drawer. There is no path to OmniBoard/Billing/Settings/etc. on tablet or mobile.

---

## 2. Error catalog (each failure → root cause → evidence → severity)

| # | Symptom (user-reported) | Root cause | Evidence (file:line, repo-verified) | Layer | Sev |
|---|---|---|---|---|---|
| E1 | Footer/bottom-nav buttons do nothing | `mobileTab` is set by the bottom nav but no surface reads it; nothing switches on tab change | `OmniDashShell.tsx:1391` decl (`const [mobileTab, setMobileTab] = useState<MobileTab>("home")`), `:1646` passed to `<OmniMobileBottomNav activeTab={mobileTab} .../>`. Those are the *only* two references to `mobileTab` in the file — confirmed via full-file grep. | Navigation controller | P0 |
| E2 | Home stays selected regardless | Same as E1 — the active tab updates locally but no surface changes, so it reads as "stuck" | `OmniMobileBottomNav.tsx:82` (`const isActive = activeTab === tab.id`); component has no router/surface output, only `onClick={() => setActiveTab(tab.id)}` (`:91`) | Active-state model | P0 |
| E3 | OmniBoard permanently active | `activeNav` defaults to OmniBoard and `onCancel` resets to `'OmniBoard'`; it only opens modals, never reflects a real surface | `OmniDashShell.tsx:311-326` `handleNav` → `useOmniModal.getState().invoke(...)`, `onCancel: () => { setActiveNav('OmniBoard'); }` (`:325`) | Active-state model | P1 |
| E4 | Tablet/mobile lose major widgets | Sidebar + both rails are gated on `isDesktop`; drawer carries only 3/5 rail widgets | `OmniDashShell.tsx:1468` `{isDesktop && panelLayout === 'standard' && <OmniDashSidebar .../>}`; rail block `:1469-1487` also `isDesktop &&`; drawer block `:1630-1642` renders only `SystemHealthRow`, `OmniTraceFeed`, `SentinelPanel` — omits `OmniSentryWidget` and `OmniMediaLaunchWidget` | Conditional mounting | P0 |
| E5 | Widget controls inaccessible / not mounted | `DraggableWidget` renders drag affordance only — no per-widget settings/close/minimize/resize controls are mounted | `DraggableWidget.tsx` — full-file scan shows pointer/drag handlers (`handlePointerMove`, `handleDragInitiate`) and a drag-mode style/transform pipeline, but no settings/close/minimize control markup and no resize markup anywhere in the file | Widget mounting | P1 |
| E6 | No resize behavior | `DraggableWidget` implements drag only (long-press → translate); no resize handles exist anywhere | Same file — only `style.transform = 'translate(...)'` mutations (`:174`, `:225`, `:251`, `:282`); no width/height mutation or resize-handle elements | Widget mounting | P1 |
| E7 | Snap/drop misaligned | Positions stored as `transform: translate()` offsets layered on flex/grid flow; collision resolve uses viewport rects → drift vs flow layout | `DraggableWidget.tsx:200-225` `getBoundingClientRect()` per sibling → `resolveCollisions(...)` → `el.style.transform = 'translate(finalX, finalY)'` | Widget layout | P2 |
| E8 | OmniSlate obstructed by widgets | Dragged widgets persist transform offsets that can overlap siblings (incl. OmniSlate); collision avoidance is best-effort viewport math, not flow-aware | `DraggableWidget.tsx:234-251` (slate-specific `getBoundingClientRect()` check feeding the same transform-based placement) | Widget layout | P2 |
| E9 | Background scroll wrong | Blueprint grid is `position:absolute; inset:0` inside the `overflow:auto` canvas, so it scrolls with content instead of staying fixed behind it | `OmniDashShell.tsx:1490-1492` canvas `overflow:"auto"`; `:1499-1509` grid div `position:"absolute", inset:0, zIndex:0` nested inside that same scrolling container | Layout/overlap | P2 |
| E10 | Click-outside doesn't reliably close modal | Backdrop button does call `abortModal`, but the draggable `motion.div` (drag enabled) sits inside a `pointer-events-none` centering layer, and pointer-capture during a drag gesture can intercept/relocate events before they reach the backdrop, making dismissal inconsistent during/just-after a drag | `OmniSpatialHost.tsx:289-306` backdrop button at `z-[9000]` with `e.target === e.currentTarget` guard; `:311-328` centering wrapper `pointer-events-none` at `z-[9001]` containing draggable (`drag={!isMinimized}`) `motion.div` | Modal engine | P1 |
| E11 | Duplicate close buttons | Host chrome renders its own close `X` AND the module content also takes an `onClose` prop and may render its own header close | `OmniSpatialHost.tsx:333-338` host renders `Minimize` + `Close` (`X`) buttons in the dialog title bar; `ModuleRenderer.tsx:18,53-55,76` passes `onClose` straight through to every dynamically-loaded module component, which is free to render its own close affordance | Modal engine | P1 |
| E12 | OmniMedia not playable / "fix didn't work" | Frontend honest-error path is deployed, but backend `omnilink-port` → `omnimedia-catalog` returns 404 | **CONFIRMED LIVE** — user-supplied DevTools screenshot (2026-06-28, same session): `[omnimedia] omnimedia_catalog_failed: FunctionsHttpError: Edge Function returned a non-2xx status code` + `Failed to load resource … omnimedia-catalog:1 … status of 404`. Console evidence captured directly, not secondhand. | Backend deploy | P0 |
| E13 | Gateway/export/compliance disconnected | Same backend: `omnilink-port/omniboard-start` → 502 | **CONFIRMED LIVE** — same DevTools screenshot: `Failed to load resource … omniboard-start:1 … status of 502`. Matches the OmniBoard modal's own "integration gateway is unavailable" message shown in a separate screenshot from the same session. | Backend deploy | P0 |
| E14 | Simulated data in production UI | Demo mode is active in prod → "PRIMARY METRICS (SIMULATED)", "Zero Trust Active (Simulated)", KPIs "simulated" | `OmniDashShell.tsx:1395` `const isDemoMode = ops.demo;` — **root cause refined in §6**: this is a *different* flag than the one in `DemoModeContext`, and it is not production-locked. | Data provenance | P1 |
| E15 | Billing modal leaks raw SDK error | `BillingModule` surfaces the Supabase Functions error message verbatim | **CONFIRMED LIVE** — `BillingModule.tsx:46-50` returns `error.message` directly; user-supplied screenshot (2026-06-28) shows the Billing modal rendering the literal string `Edge Function returned a non-2xx status code` in a plain text field next to "Manage Plan"/"Billing Portal" buttons. | Error honesty | P1 |
| E16 | CSP blocks an inline `<script>` on page load | A `script-src 'self'` Content-Security-Policy directive (no `'unsafe-inline'`, no matching nonce/hash) is blocking an inline script the page itself tries to execute, and a "before install prompt" banner never shows because its handler depends on that blocked script | DevTools console (user-supplied screenshot, 2026-06-28): `Executing inline script violates the following Content Security Policy directive: script-src 'self' https://static.cloudflareinsights.com https://cdnjs.cloudflare.com. Either the 'unsafe-inline' keyword, a hash ('sha256-...'), or a nonce ('nonce-...') is required... The action has been blocked.` immediately followed by `Banner not shown: beforeinstallpromptevent.preventDefault() called. The page must call beforeinstallpromptevent.prompt() to show the banner.` Not yet traced to a specific source file in this pass — flagged for follow-up, not in the original report. | CSP / page bootstrap | P2 (new) |

---

## 3. Systemic root causes (the spine, grouped)

1. **No navigation controller / surface router** (E1, E2, E3). Both nav surfaces (footer `mobileTab`, sidebar `activeNav`) set state that no renderer consumes to switch the visible surface. Navigation is cosmetic.
2. **Breakpoint-gated unmounting** (E4). Sidebar + rails are `isDesktop`-only with an incomplete drawer fallback → tablet/mobile lose primary nav and 2 widgets.
3. **Widget mounting lacks controls + resize** (E5, E6, E7, E8). `DraggableWidget` is drag-only; no controls, no resize, transform-vs-flow drift.
4. **Modal engine duplication + inconsistent dismiss** (E10, E11). Host chrome and module headers can both render close; the draggable panel can undermine click-outside during/just-after a drag gesture.
5. **Stale backend deploy** (E12, E13) — reported live-console evidence, not re-verified in this pass; flag for live re-check before treating as confirmed.
6. **Demo/simulated bleed + unsanitized errors** (E14, E15).

---

## 4. NOT a cause (ruled out from the pasted 8-point diagnosis)

- Modal host missing → **FALSE** (`OmniSpatialHost` is mounted, `OmniDashShell.tsx` imports and renders it).
- Intents never fire → **FALSE** (sidebar/header/ecosystem all call `invoke`; `handleNav` demonstrably calls `useOmniModal.getState().invoke(...)`).
- Registry path `src/features/registry.ts` etc. → those are a non-routed tree; the live `/omnidash` route renders `OmniDashShell`.
- "AWAITING" gallery → intentional display-only empty state (prior PR), not a bug.

---

## 4b. Classified catalog (owner UI-### IDs = canonical; taxonomy-mapped)

Taxonomy: `NAV_STATE` · `DEAD_CONTROL` · `RESPONSIVE_MOUNTING` · `LAYOUT_OVERFLOW` · `Z_INDEX_LAYERING` · `MODAL_CONTRACT` · `DRAG_SNAP` · `INTEGRATION_STATE` · `DATA_MODE` · `ACCESSIBILITY` · `REGRESSION_TEST_GAP`.

| UI-ID | Failure | Taxonomy | Root cause (repo-verified) | Sev | xref |
|---|---|---|---|---|---|
| UI-001 | Footer buttons do nothing | DEAD_CONTROL + NAV_STATE + REGRESSION_TEST_GAP | `mobileTab` set but never consumed by any surface — `OmniDashShell.tsx:1391,1646` | Blocker | E1 |
| UI-002 | Home always selected | NAV_STATE | active tab not derived from a route/surface; no controller switches content — `OmniMobileBottomNav.tsx:82-91` | Blocker | E2 |
| UI-003 | OmniBoard always selected | NAV_STATE | `activeNav` defaults to / resets to `'OmniBoard'`; only opens modals — `OmniDashShell.tsx:311-326` | Blocker | E3 |
| UI-004 | Widgets missing on tablet/mobile | RESPONSIVE_MOUNTING | sidebar + both rails gated on `isDesktop`; drawer carries 3/5 — `OmniDashShell.tsx:1468-1487,1630-1642` | Blocker | E4 |
| UI-005 | No widget launcher/restorer | RESPONSIVE_MOUNTING + DEAD_CONTROL | no mobile widget-control contract; `DraggableWidget` has no settings/close/restore markup | Blocker | E5 |
| UI-006 | Widgets cover OmniSlate | Z_INDEX_LAYERING + DRAG_SNAP | persisted `translate()` offsets + viewport-based collision overlap siblings — `DraggableWidget.tsx:200-251` | Blocker | E8 |
| UI-007 | Background scrolls with content | LAYOUT_OVERFLOW | blueprint grid `position:absolute inset:0` inside `overflow:auto` canvas — `OmniDashShell.tsx:1490-1509` | Major | E9 |
| UI-008 | Snap/drop misaligns | DRAG_SNAP | transform offsets on flow layout; viewport-rect math drifts — `DraggableWidget.tsx:200-251` | Major | E7 |
| UI-009 | Click-outside doesn't close modal | MODAL_CONTRACT | draggable panel + `pointer-events-none` centering layer over backdrop — `OmniSpatialHost.tsx:289-328` | Major | E10 |
| UI-010 | Duplicate close buttons | MODAL_CONTRACT | host chrome `X` + module renders own header via `onClose` — `OmniSpatialHost.tsx:333-338` + `ModuleRenderer.tsx:18,53-76` | Major | E11 |
| UI-011 | OmniMedia not playable | INTEGRATION_STATE + REGRESSION_TEST_GAP | backend `omnimedia-catalog` reported 404; `omnilink-port` reported stuck at an old version (live-console only — **UNVERIFIED-LIVE** in this pass) | Blocker | E12 |
| UI-012 | Gateway unavailable | INTEGRATION_STATE | backend `omniboard-start` reported 502 (live-console only — **UNVERIFIED-LIVE** in this pass) | Blocker | E13 |
| UI-013 | Export/compliance not connected | INTEGRATION_STATE | `AuditsModule.tsx` renders static baseline tiles (`AUDIT_CATEGORIES`) with no action wired to a backend export/compliance call in the reviewed file | Blocker | (new) |
| UI-014 | Simulated labels in prod | DATA_MODE | `ops.demo` (defaults `true`, not production-locked) drives `(Simulated)` labels — see §6 correction | Major | E14 |
| UI-015 | Top nav clipped tablet/mobile | LAYOUT_OVERFLOW | header action buttons use `flexShrink:0` + `whiteSpace:"nowrap"` repeatedly with no wrap/overflow strategy — `OmniDashShell.tsx:481,492,496,521,529,533,577,592` | Major | (new) |
| UI-016 | Bottom-nav icons lack behavior | DEAD_CONTROL + NAV_STATE | labels ARE present (`aria-label`, `aria-selected`, `role="tab"` — `OmniMobileBottomNav.tsx:78-89`); real defect is no behavior wiring (= UI-001) | Major | E1 |
| UI-017 | Billing leaks raw SDK error | INTEGRATION_STATE + (error-honesty) | `BillingModule.tsx:46-50` returns `error.message` verbatim; OmniMedia uses a sanitized path elsewhere | Major | E15 |
| UI-018 | Workflows engine not connected | INTEGRATION_STATE | Workflows module renders honest "not connected to the workflow engine yet" with `0 running`/`0 pending`, live-screenshot confirmed 2026-06-28; same bucket as UI-013/UI-011/UI-012/UI-017 | Major | E12/E13 (new, §7) |
| UI-019 | CSP blocks inline `<script>` on load | (new — not yet in taxonomy) | `script-src 'self'` policy has no `'unsafe-inline'`/hash/nonce for an inline script the page executes on load; install-prompt banner suppressed as a side effect | Minor | E16 |
| UI-020 | `omnimedia-catalog` fetched eagerly on unrelated modal opens | INTEGRATION_STATE + REGRESSION_TEST_GAP | live console shows the same `omnimedia-catalog` 404 firing on both a Workflows-modal open and an OmniBoard-modal open, in two separate captures — suggests a shared/global fetch path, not OmniMedia-module-scoped lazy load; call site not yet traced in this pass | Major | (new, §7) |

### Correction to seed catalog (carried forward)

UI-016: the bottom nav does carry semantic labels/roles (`aria-label`, `aria-selected`, `role="tab"`). It is therefore `DEAD_CONTROL`/`NAV_STATE`, not an accessibility-label gap. Keyboard/AT path exists; behavior does not.

### Taxonomy roll-up (where the work concentrates)

- **NAV_STATE:** UI-001, UI-002, UI-003, UI-016
- **RESPONSIVE_MOUNTING:** UI-004, UI-005
- **MODAL_CONTRACT:** UI-009, UI-010
- **DRAG_SNAP / Z_INDEX_LAYERING:** UI-006, UI-008
- **LAYOUT_OVERFLOW:** UI-007, UI-015
- **INTEGRATION_STATE:** UI-011, UI-012, UI-013, UI-017
- **DATA_MODE:** UI-014
- **DEAD_CONTROL:** UI-001, UI-005, UI-016
- **REGRESSION_TEST_GAP:** UI-001, UI-011 (and broadly — no test caught footer-dead)

---

## 5. Proposed repair order (for the NEXT pass, pending go-ahead)

**P0 first:** (a) navigation controller that both footer + sidebar drive and that switches the rendered surface + active state; (b) mount sidebar/rails on tablet/mobile (or a real equivalent) so no surface is lost; (c) backend redeploy of `omnilink-port` (owner-gated, contingent on live re-verification — see §6).
**Then P1:** modal dedupe + click-outside hardening, widget controls, Billing error honesty, demo-mode gating (fix the actual flag — `ops.demo` / `DEFAULT_OPS_STATE`, not `DemoModeContext`).
**Then P2:** resize, snap/drop, background scroll.

Every item gated by browser evidence per acceptance standard. **No code changes were made in this pass.**

---

## 6. Repo-truth reconciliation notes (this pass)

Findings added on top of the original report after re-reading the current checked-out tree (`claude/omnidash-ui-ux-audit-i3ppne`):

- **CONFIRMED, line drift only:** the original report's `OmniDashShell.tsx` line numbers (e.g. `:1361`, `:1616`, `:1460-1479`, `:522,578,593`) are offset by roughly 20–60 lines from the current tree (current: `:1391`, `:1646`, `:1490-1509`, `:481-592`). The underlying defects described at each location are present at the corrected line numbers cited in §2/§4b above. This is consistent with the file having been edited between when the original audit was produced and the current commit; it is not evidence the findings are stale.
- **NEW — root-cause refinement for E14/UI-014 (demo-mode bleed):** there are **two independent demo-mode mechanisms** in this codebase, not one:
  1. `DemoModeContext.tsx` — `defaults = { demoMode: false, ... }`, and explicitly force-locks `demoMode` to `false` whenever `IS_PRODUCTION_BUILD` is true (both on read and on `setDemoMode`). This one is correctly hardened against prod leakage.
  2. `dashboard.types.ts` `DEFAULT_OPS_STATE = { demo: true, autoPilot: false, guardian: true, live: false }`, consumed in `OmniDashShell.tsx:1395` as `const isDemoMode = ops.demo;`. This flag **defaults to `true`** and is **not** gated by `IS_PRODUCTION_BUILD` anywhere in the reviewed code path — it is persisted per-user via `useLayoutPersistence` (localStorage), so a fresh session/user starts in simulated mode and `(Simulated)` labels and "PRIMARY METRICS (SIMULATED)" render in production by default until a user manually clears it.
  This means the fix for UI-014 is not "the demo toggle is broken" — it's that `ops.demo` (`OmniDashOpsState`) needs the same production lock that `DemoModeContext.demoMode` already has, or needs to default to `false`.
- **CONFIRMED:** `OmniSpatialHost.tsx` backdrop/centering/drag structure matches the report almost exactly (z-index values, `pointer-events-none` wrapper, `drag={!isMinimized}` on the panel).
- **CONFIRMED:** `ModuleRenderer.tsx` passes `onClose` to every lazy-loaded module unconditionally — duplicate-close-button risk is real and systemic (any module author can render their own close affordance on top of host chrome's).
- **CONFIRMED:** `DraggableWidget.tsx` contains no resize logic and no settings/close/minimize controls anywhere in its 350 lines — only pointer-drag + collision-resolve + transform mutation.
- **CONFIRMED:** `BillingModule.tsx` returns `error.message` (raw Supabase Functions SDK error) directly to the UI on failure — no sanitization layer, unlike the OmniMedia honest-error path referenced in the original report.
- **PARTIALLY CONFIRMED — `AuditsModule.tsx`:** the module renders static baseline tiles (`AUDIT_CATEGORIES`) and does not, in the file reviewed, wire an export/compliance action to a backend call. This supports UI-013's `INTEGRATION_STATE` classification but was not independently load-bearing-tested against a live backend.
- **UNVERIFIED-LIVE (carried as-is):** E12/E13/UI-011/UI-012's specific backend symptoms (`omnimedia-catalog` 404, `omniboard-start` 502, `omnilink-port` pinned at `v32`) rest entirely on user-supplied DevTools screenshots. This sandbox has no live browser tunnel to `apexomnihub.icu` and no confirmed live Supabase project binding, so these were not independently re-checked in this pass. They should be re-verified directly against the live project (e.g. `supabase functions list` / edge function deployment log) before being treated as still-current in any remediation pass.

**No fixes were applied in this pass, per mandate.**

---

## 7. Live screenshot corroboration (2026-06-28, same session)

The user supplied **five** DevTools/browser screenshots of the live `apexomnihub.icu/omnidash` session (authenticated), captured directly in this session, not secondhand. They upgrade several items above from "reported"/"unverified-live" to **CONFIRMED LIVE**:

1. **OmniBoard modal — duplicate close controls, live.** The dialog shows a `Minimize`/`X` pair from host chrome in the top-right of the outer panel, and a *second*, independent `X` next to the "OMNIBOARD — APP INTEGRATION" sub-header rendered by the module content itself. Directly confirms E11/UI-010 (`OmniSpatialHost.tsx` host close + `ModuleRenderer.tsx`-delegated module close, both live simultaneously). The modal body also shows the honest-error message "OmniBoard could not complete the connection — the integration gateway is unavailable right now." with a "Retry Connection" action — this part is working as intended (honest failure state, not a bug).
2. **Billing modal — raw SDK error, live.** Confirms E15/UI-017 verbatim: the field below the active subscription ID literally reads `Edge Function returned a non-2xx status code`.
3. **Mobile/narrow viewport — simulated metrics banner, live.** "PRIMARY METRICS (SIMULATED)" renders above FLOWBills Paid/Demos/Days to Cash/Ops Sev-1, all reading `0`, confirming E14/UI-014 and the `ops.demo` default-true root cause in §6.
4. **Workflows modal + DevTools console (first capture).** "WORKFLOW PIPELINE VIEW" / "Workflow actions are not connected to the workflow engine yet." with `0 running`, `0 pending`, and `Create Workflow`/`Trigger Run` buttons — honest-error messaging, correct pattern, but shows the `INTEGRATION_STATE` gap extends beyond Audits/Billing/OmniMedia/OmniBoard to Workflows too (logged as **UI-018** above). The console panel open alongside it shows: a CSP violation blocking an inline `<script>` (`script-src 'self' …`, no `'unsafe-inline'`/hash/nonce — logged as E16/UI-019), followed by `beforeinstallpromptevent` banner suppression, then `omnimedia-catalog:1 … status of 404` / `[omnimedia] omnimedia_catalog_failed: FunctionsHttpError` (twice), `omniboard-start:1 … status of 502`, and two `[OmniModal] Modal aborted: USER_DISMISSED` lines, plus `[SW] OmniLink PWA service worker v4 loaded with push & sync support`.
5. **OmniBoard modal + DevTools console (second capture, filtered view).** Same dialog as item 1, with the console re-opened and filtered (issue counter shows 3/2/1). It reproduces the *same* error set as item 4 — `[SW] OmniLink PWA service worker v4 loaded`, the CSP violation, `omnimedia-catalog:1 … 404`, `[omnimedia] omnimedia_catalog_failed`, `[OmniModal] Modal aborted: USER_DISMISSED`, and `omniboard-start:1 … 502`.

**New observation from comparing captures 4 and 5:** the `omnimedia-catalog` 404 and the CSP violation fire on **both** the Workflows modal open and the OmniBoard modal open — not only when OmniMedia itself is opened. That points to `omnimedia-catalog` being fetched eagerly from a shared/global path (e.g. a top-level prefetch, `GlobalMediaDock`, or app bootstrap) rather than being scoped to the OmniMedia module's own lazy-load. Logging as **UI-020: `omnimedia-catalog` fetched eagerly on unrelated modal opens** (`INTEGRATION_STATE` + `REGRESSION_TEST_GAP`) for the next pass — worth confirming which call site triggers it before any fix is attempted.

No code changes were made in response to this evidence — it is folded into the catalog above as corroboration only, per the audit-only mandate.
