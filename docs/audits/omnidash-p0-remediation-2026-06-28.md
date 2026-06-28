# OmniDash P0 Remediation — Evidence Report

**Mandate (Phase 2, this pass):** remediate against `docs/audits/omnidash-systemic-error-catalog-2026-06-28.md`. P0 only. No new broad audit.
**Branch:** `claude/omnidash-ui-ux-audit-i3ppne`
**Date:** 2026-06-28
**Scope:** UI-001, UI-002, UI-003, UI-004, UI-005, UI-006 (containment only), UI-011, UI-012, UI-013, UI-016.

---

## 1. Status per UI-ID

| UI-ID | Catalog failure | Result | Fix summary |
|---|---|---|---|
| UI-001 | Footer/bottom-nav buttons do nothing | **PASS** | `mobileTab` is now derived (`drawerView ?? canvasFocus`) and every tap routes through `handleMobileTabSelect`, which actually switches the rendered surface (canvas focus, drawer content, or module modal). |
| UI-002 | Home always selected | **PASS** | Active tab is derived from real state, not an independent local toggle. Verified: exactly one `role="tab"` has `aria-selected="true"` at all times (new test). |
| UI-003 | OmniBoard always selected | **PASS** | `DashboardNavSection` is now the real sidebar-widget-label union (was a disjoint placeholder union bridged by an unsafe cast). Default/reset value changed `'OmniBoard'` → `'Home'`; `handleNav`'s `onCancel` now resets to `'Home'` instead of hardcoding `'OmniBoard'`. Desktop sidebar and mobile Apps-drawer both call the same `invokeSidebarModule()` so `activeNav` reflects the real open module on both surfaces. |
| UI-004 | Widgets missing on tablet/mobile | **PASS** | Mobile/tablet "Insights" drawer now renders all 5 rail widgets (`SystemHealthRow`, `OmniTraceFeed`, `SentinelPanel`, `OmniSentryWidget`, `OmniMediaLaunchWidget`) — was 3/5. New "Apps" drawer gives tablet/mobile a path to every primary sidebar module (sidebar is still desktop-only, but its module set is now fully reachable via the drawer). |
| UI-005 | No widget launcher/restorer | **PASS (for nav reachability)** | Every primary desktop surface (sidebar modules + rail widgets) now has a mobile/tablet equivalent reachable from the bottom nav (Apps / Insights drawers). Per-widget resize/minimize/restore controls on `DraggableWidget` itself are unchanged — out of P0 scope per rule 10 (tracked as E5/E6, not blocking P0 acceptance, which is about surface reachability, not per-widget chrome). |
| UI-006 | Widgets cover OmniSlate | **PASS (containment fix applied)** | `widget_slate`'s `DraggableWidget` wrapper now has `zIndex: 1` (`OmniDashShell.tsx`, `OmniGridTop`). Siblings (`widget_agent`, `widget_eco`) keep the default `zIndex: auto`, so a persisted drag offset that visually overlaps OmniSlate's grid cell can no longer paint over it at rest. An actively-dragged widget still lifts to `zIndex: 999` during the drag gesture itself (unchanged, intentional visual feedback). Snap/collision math in `DraggableWidget.tsx`/`widgetLayout.ts` was **not** touched, per rule 9. |
| UI-011 | OmniMedia not playable (backend `omnimedia-catalog` 404) | **OWNER-GATED** | Frontend honest-error path already correct (confirmed in original audit). Root cause is a backend edge-function/deploy issue. No Supabase/Cloudflare deploy authority or MCP tooling is available in this sandbox. See §3 for exact owner verification commands. |
| UI-012 | Gateway unavailable (backend `omniboard-start` 502) | **OWNER-GATED** | Same as UI-011 — backend deploy state, not reachable/fixable from this sandbox. See §3. |
| UI-013 | Export/compliance not connected | **OWNER-GATED** | Traced the full path: `moduleData.json`'s `audits` entry → `ModuleShell.tsx`'s `handleAction` → `getModuleActionCapability('audits', actionId)` in `moduleActionCapabilities.ts`. Both `audits:export-audit` and `audits:run-compliance` are already explicitly `{ supported: false, copy: '...not connected to the reporting pipeline yet.' }`. This is the **correct, intentional** honest-error UX, not a defect — no frontend change applied. The gap is the backend reporting pipeline itself (owner-gated, same bucket as UI-011/UI-012/UI-018). |
| UI-016 | Bottom-nav icons lack behavior | **PASS** | Same fix as UI-001 (catalog cross-references E1). Labels/roles were already correct; behavior is now wired. |

---

## 2. Updated surface map

| Region | Desktop >1024 | Tablet 641–1024 | Mobile ≤640 |
|---|---|---|---|
| Top header | ✅ full | ✅ (unchanged — UI-015 clipping is P1, not touched) | ✅ (unchanged) |
| Left sidebar module nav | ✅ | ❌ unmounted, **but** reachable via bottom-nav "Apps" drawer (same `invokeSidebarModule` path, same `activeNav` state) | ❌ unmounted, reachable via "Apps" drawer |
| Main canvas (KPI band, Agent, OmniSlate, Ecosystem, gallery, observability) | ✅ | ✅ (1-col), OmniSlate has containment z-index fix | ✅ (1-col), same fix; bottom-nav "Slate" tab scrolls directly to `#widget_slate` |
| Right rail (5 widgets) | ✅ all 5 | ❌ rail unmounted, **but** all 5 now in "Insights" drawer (was 3/5) | same |
| Bottom nav (Home/Slate/Apps/Insights/More) | ❌ (desktop doesn't need it) | ✅ **live** — drives real surface switches | ✅ **live** |
| "More" drawer | n/a | ✅ working theme toggle + sign-out (new — previously this control set didn't exist on mobile) | ✅ |
| OmniSpatialHost (modals), GlobalMediaDock | ✅ | ✅ | ✅ |

**Surface-map verdict (updated):** tablet/mobile no longer lose access to any primary desktop surface. The sidebar's module set and all 5 rail widgets are reachable through the bottom nav's Apps/Insights drawers, and the active tab/nav state is single-sourced from real state rather than cosmetic local toggles.

---

## 3. OWNER-GATED items — exact verification commands

These require Supabase/Cloudflare deploy authority not available in this sandbox (no Supabase MCP server, no live browser tunnel to `apexomnihub.icu`).

**UI-011 / UI-012 (edge function deploy state — `omnimedia-catalog` 404, `omniboard-start` 502):**
```bash
# From a machine with the project's Supabase CLI auth/link configured:
supabase functions list                       # confirm omnimedia-catalog / omniboard-start are deployed
supabase functions logs omnimedia-catalog      # check for 404-causing runtime/route errors
supabase functions logs omniboard-start        # check for 502-causing crash/timeout
supabase functions deploy omnimedia-catalog    # redeploy if stale/missing
supabase functions deploy omniboard-start      # redeploy if stale/missing
```
Owner should re-open the live OmniMedia/OmniBoard modals in DevTools after redeploy and confirm the `omnimedia-catalog`/`omniboard-start` network calls return 2xx.

**UI-013 (audits export/compliance pipeline):** no frontend change needed. Owner action is to wire a real backend export/compliance endpoint, then flip `audits:export-audit` / `audits:run-compliance` in `apps/omnihub-site/dashboard/contracts/moduleActionCapabilities.ts` to `{ supported: true }` with an `onAction` handler once that endpoint exists.

---

## 4. Files changed

- `apps/omnihub-site/dashboard/types/dashboard.types.ts` — `DashboardNavSection` now matches real sidebar widget labels + `'Home'`; default `activeNav` → `'Home'`.
- `apps/omnihub-site/dashboard/components/OmniMobileBottomNav.tsx` — prop contract widened to a semantic `onSelect` callback (was a raw state setter).
- `apps/omnihub-site/dashboard/OmniDashShell.tsx` — shared `invokeSidebarModule()` surface controller; derived `mobileTab`; content-aware mobile drawer (Apps/Insights/More); OmniSlate containment z-index fix.
- `tests/omnidash/dashboard-types.spec.ts`, `tests/omnidash/use-layout-persistence.spec.tsx`, `tests/omnidash/omni-mobile-bottom-nav.spec.tsx` — updated for the `'Home'` default and `onSelect` prop rename.
- `tests/omnidash/omnidash-mobile-surface-controller.spec.tsx` — **new**, 6 tests against the real (non-stubbed) `OmniMobileBottomNav`/`OmniMobileDrawer` proving the P0 acceptance criteria.

## 5. Tests added/updated

- New: `tests/omnidash/omnidash-mobile-surface-controller.spec.tsx` (6 tests) — Apps drawer reachability, module-tap → modal + drawer close, Insights drawer carries all 5 widgets, exactly-one-active-tab invariant, working theme toggle, Home closes open drawer.
- Updated: 3 existing spec files (see §4) to match the corrected `'Home'` default and `onSelect` prop.

## 6. Validation matrix

| Layer | Method | Result |
|---|---|---|
| Type safety | `npx tsc -p apps/omnihub-site/tsconfig.json --noEmit` | 9 pre-existing, unrelated errors only (`GlobalMediaDock.tsx`, `main-ssg.tsx`, `useOmniDashAction.ts`); zero errors in any file touched this pass. |
| Unit/component tests | `npx vitest run tests/omnidash` | 72 files / 672 tests passed, 27 skipped, 16 todo, 0 failed. |
| Targeted re-run after UI-006 fix | `npx vitest run tests/omnidash/omnidash-mobile-surface-controller.spec.tsx tests/omnidash/omnidash-shell-coverage.spec.tsx` | 2 files / 13 tests passed. |
| Live authenticated browser | **NOT PERFORMED** | See §7 — honest statement of blocked validation, per the validation-honesty constraint. |

## 7. Blocked validations (stated plainly, per validation-honesty constraint)

- **No authenticated live-browser validation was performed against `apexomnihub.icu` in this pass.** Chromium through the agent proxy cannot reach `apexomnihub.icu` from this sandbox (confirmed in the original audit: `ERR_CONNECTION_CLOSED`), and no test-user Supabase credentials are available to authenticate a local build of `/omnidash` even if the network path worked.
- To complete authenticated browser validation, an owner needs to provide **either**: (a) a working browser-tunnel/proxy path from this sandbox to `apexomnihub.icu`, **or** (b) valid Supabase test-user credentials plus a local dev server with Supabase env vars configured, so `/omnidash` can be reached past the auth gate.
- All P0 results above are validated at the component/code level (real, non-stubbed `OmniMobileBottomNav`/`OmniMobileDrawer`/`OmniDashShell` rendered under Vitest + Testing Library, plus full-file `git diff` review) — not via a live authenticated browser session.

## 8. Final verdict

**PASS at the code/component validation level** for all in-scope P0 items (UI-001, UI-002, UI-003, UI-004, UI-005, UI-006, UI-016).
**OWNER-GATED** for UI-011, UI-012, UI-013 (backend deploy/pipeline, outside this sandbox's authority — exact commands in §3).
**Live authenticated browser validation remains outstanding** — blocked per §7, not claimed as done.

Acceptance criteria re-check: mobile/tablet navigation is no longer cosmetic (real surface switches, tests prove it); every primary surface is reachable (sidebar modules + all 5 rail widgets, via Apps/Insights drawers); active state is correct (single derived source, exactly-one-active-tab test passes); core desktop surfaces are not lost below 1024px (all present via drawers); backend P0 items are explicitly OWNER-GATED with verification commands provided.
