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
| UI-006 | Widgets cover OmniSlate | **CONTAINMENT ONLY — P2 OPEN, not a PASS** | `widget_slate`'s `DraggableWidget` wrapper now has `zIndex: 1` (`OmniDashShell.tsx`, `OmniGridTop`). Siblings (`widget_agent`, `widget_eco`) keep the default `zIndex: auto`, so a persisted drag offset that visually overlaps OmniSlate's grid cell can no longer paint over it at rest. An actively-dragged widget still lifts to `zIndex: 999` during the drag gesture itself (unchanged, intentional visual feedback). Snap/collision math in `DraggableWidget.tsx`/`widgetLayout.ts` was **not** touched, per rule 9 — **this PR does not fix drag/snap collision, it only stops the at-rest visual overlap from one specific widget pair. The underlying defect (no real collision/snap system preventing any widget from being dragged on top of any other) remains open and is explicitly deferred to P2, not closed by this pass.** |
| UI-011 | OmniMedia not playable (backend `omnimedia-catalog` 404) | **OWNER-GATED — likely already fixed, needs 1 secret confirmed** | Live read-only check (this pass, user-authorized) found the real route (`omnilink-port/omnimedia-catalog`) is already proxied in the deployed `omnilink-port` v32 source, by a fix that predates this catalog. Only open variable: whether `ORCHESTRATOR_URL` secret is set. See §3, Findings 1-4. |
| UI-012 | Gateway unavailable (backend `omniboard-start` 502) | **OWNER-GATED — likely already fixed, needs 1 secret confirmed** | Same finding as UI-011 — same proxy function, same `ORCHESTRATOR_URL` dependency. See §3. |
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

## 3. OWNER-GATED items — updated with live read-only verification (this pass)

The user supplied live Supabase project credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and a Supabase management token) mid-pass, with explicit authorization to use them. The following **read-only** checks were performed directly against the live project. Live authenticated *browser* validation (`apexomnihub.icu` itself) remained blocked — see §7 — this is a separate, narrower backend-API check.

**Finding 1 — `omnimedia-catalog` and `omniboard-start` are not standalone Edge Functions.** The original catalog's framing (treat them as deployable function slugs) was wrong. Repo-confirmed: the frontend calls `supabase.functions.invoke('omnilink-port/omnimedia-catalog', ...)` (`dashboard/lib/omniMediaCatalog.ts:102`) and `'omnilink-port/omniboard-start'` (`dashboard/components/OmniBoardWizard.tsx:102`) — both are **sub-routes proxied through the single `omnilink-port` function**, not independent functions. A direct `GET/POST https://<project>/functions/v1/omnimedia-catalog` (no `omnilink-port/` prefix) returns `404 {"code":"NOT_FOUND"}` — confirmed live — but that 404 is expected/irrelevant, since that was never the real call path.

**Finding 2 — `omnilink-port` itself is deployed and ACTIVE.** Live Supabase Management API (`GET /v1/projects/{ref}/functions`) confirms `omnilink-port` is `ACTIVE`, version 32, `updated_at` ≈ 2026-06-26 09:59:07 UTC.

**Finding 3 — the proxy routes for `omniboard-start`/`omnimedia-*` already exist in the deployed source, with a code comment naming this exact bug.** `supabase/functions/omnilink-port/index.ts:1449-1459` routes `omniboard-start`, `omniboard-next`, and any `omnimedia-*` path to dedicated handlers. The handler's own comment (`:1345-1346`) reads: *"The wizard calls omnilink-port/omniboard-start|omniboard-next; without this proxy those routes 404'd (surfacing as 'Edge Function returned a non-2xx status code')."* — i.e. a prior pass already diagnosed and fixed this exact defect. Git archaeology: this proxy code was introduced in commit `301aa8b` (2026-06-25, before the catalog's audit commit), which is an ancestor of `1f34fa2` ("fix(omnidash): harden production action surfaces", committer time 2026-06-26 09:58:25 UTC) — within 42 seconds of the function's live `updated_at` timestamp. **This strongly suggests v32, currently live, already contains the fix**, contingent on one runtime precondition (Finding 4).

**Finding 4 — the remaining open variable is the `ORCHESTRATOR_URL` secret.** `handleOmniBoardStart`/`handleOmniBoardNext` (`index.ts:1355,1381`) read `Deno.env.get('ORCHESTRATOR_URL')` and return a clean `503 connect_unavailable` (not a 502) if it's unset. Confirming whether this secret is configured requires either (a) listing the project's secret *names* via the Management API, or (b) invoking the live `omnilink-port/omniboard-start` route once with a real POST — both were declined by this session's auto-mode security classifier as out-of-scope of the user's generic "full live validation" authorization (production secret-store enumeration / production-write-capable endpoint invocation, respectively), since neither operation was named specifically. No code change was made or attempted here — this is a verification gap, not a defect.

**Revised owner action for UI-011/UI-012:**
```bash
# Quickest path — read-only, in the Supabase dashboard, no CLI needed:
# Project Settings → Edge Functions → Secrets → confirm ORCHESTRATOR_URL is present and points
# at a live orchestrator host.

# Or via CLI, if you want this session to finish the check, re-authorize specifically:
#   "invoke omnilink-port/omniboard-start and omnilink-port/omnimedia-catalog directly"
# and/or
#   "list (not read values of) this Supabase project's function secrets"
# — the classifier will allow it once the exact operation is named.
supabase secrets list                                   # confirm ORCHESTRATOR_URL is set (names only)
supabase functions logs omnilink-port                    # check for 5xx/timeout when ORCHESTRATOR_URL is hit
```
If `ORCHESTRATOR_URL` is already set: UI-011/UI-012 are likely **already resolved** by the prior `301aa8b`/`1f34fa2` deploy and only need a live DevTools re-check to close out. If it is **not** set: that single missing secret is the entire remaining root cause — no further code work is implicated.

**UI-013** is unaffected by this finding (separate module, separate path) — see §1, still OWNER-GATED on the reporting-pipeline backend, no live check possible without a similarly-scoped, explicitly-named authorization.

**UI-013 (audits export/compliance pipeline):** no frontend change needed. Owner action is to wire a real backend export/compliance endpoint, then flip `audits:export-audit` / `audits:run-compliance` in `apps/omnihub-site/dashboard/contracts/moduleActionCapabilities.ts` to `{ supported: true }` with an `onAction` handler once that endpoint exists.

---

## 4. Files changed

- `apps/omnihub-site/dashboard/types/dashboard.types.ts` — `DashboardNavSection` now matches real sidebar widget labels + `'Home'`; default `activeNav` → `'Home'`.
- `apps/omnihub-site/dashboard/components/OmniMobileBottomNav.tsx` — prop contract widened to a semantic `onSelect` callback (was a raw state setter).
- `apps/omnihub-site/dashboard/OmniDashShell.tsx` — shared `invokeSidebarModule()` surface controller; derived `mobileTab`; content-aware mobile drawer (Apps/Insights/More); OmniSlate containment z-index fix.
- `apps/omnihub-site/dashboard/components/OmniMobileDrawer.tsx` — removed a stray `aria-hidden="true"` on the drawer overlay's parent, which was marking the open drawer's own DOM subtree hidden from assistive tech while it was the active, visible surface.
- `apps/omnihub-site/src/styles/omnidash-layout.css` — fixed a real-browser-only bug (invisible to jsdom/Testing Library) found during this pass's manual preview validation: the drawer overlay (`z-index: 9500`, `inset: 0`) painted and hit-tested above the bottom nav (`z-index: 9000`), so the nav was geometrically unreachable while any drawer was open — a user could only close the open drawer, never switch directly to a different bottom-nav tab. Fix: nav `z-index` raised to `9600`; overlay's `inset: 0` replaced with an explicit `bottom: calc(56px + env(safe-area-inset-bottom, 0px))` carve-out so it stops above the nav; `.omni-drawer`'s `max-height` changed from `dvh` to `%` units (`85%`/`90%` mobile override) so the sheet's height resolves against the now-shorter overlay parent instead of the full device viewport (which would otherwise let it overflow back down behind the nav regardless of the overlay's own inset). See §9 for verification detail.
- `tests/omnidash/dashboard-types.spec.ts`, `tests/omnidash/use-layout-persistence.spec.tsx`, `tests/omnidash/omni-mobile-bottom-nav.spec.tsx` — updated for the `'Home'` default and `onSelect` prop rename.
- `tests/omnidash/omnidash-mobile-surface-controller.spec.tsx` — **new**, 6 tests against the real (non-stubbed) `OmniMobileBottomNav`/`OmniMobileDrawer` proving the P0 acceptance criteria; the Apps-drawer-reachability test was strengthened this pass (see §5) to assert against the real 9-module contract instead of a 2-item stand-in pair.

## 5. Tests added/updated

- New: `tests/omnidash/omnidash-mobile-surface-controller.spec.tsx` (6 tests) — Apps drawer reachability, module-tap → modal + drawer close, Insights drawer carries all 5 widgets, exactly-one-active-tab invariant, working theme toggle, Home closes open drawer.
- Updated: 3 existing spec files (see §4) to match the corrected `'Home'` default and `onSelect` prop.
- Strengthened this pass: the Apps-drawer-reachability test previously only proved 2 of the 9 real sidebar modules were reachable (`OmniBoard`/`Audits`), because `vitest.config.ts` aliases `@/contracts/omnidash-sidebar-widgets` to an intentionally empty stub for unit tests, and the test had hand-listed only those 2 labels rather than asserting against the real contract. It now redirects the alias to the real module's actual exports via `vi.mock(..., () => vi.importActual(...))` and asserts every label in the real `OMNIDASH_SIDEBAR_WIDGETS` (all 9 modules: OmniBoard, PhysiOmni, Audits, Links, Automations, Workflows, Files, Billing, Settings) renders in the Apps drawer — closing the gap between "tested" and "real" module coverage without hand-duplicating the canonical list.

## 6. Validation matrix

| Layer | Method | Result |
|---|---|---|
| Type safety | `npx tsc -p apps/omnihub-site/tsconfig.json --noEmit` | 9 pre-existing, unrelated errors only (`GlobalMediaDock.tsx`, `main-ssg.tsx`, `useOmniDashAction.ts`); zero errors in any file touched this pass. |
| Unit/component tests | `npx vitest run tests/omnidash` | 72 files / 672 tests passed, 27 skipped, 16 todo, 0 failed. |
| Targeted re-run after UI-006 fix | `npx vitest run tests/omnidash/omnidash-mobile-surface-controller.spec.tsx tests/omnidash/omnidash-shell-coverage.spec.tsx` | 2 files / 13 tests passed. |
| Manual preview validation (local, real browser, this pass) | Playwright/Chromium against a local, credential-free harness mounting the real `OmniDashShell` (bypassing `ProtectedRoute`), at mobile (390×844) and tablet (820×1180) viewports — see §9. | All checks passed on both viewports; surfaced and fixed the nav-occlusion bug above. |
| Live authenticated browser against `apexomnihub.icu` | **NOT PERFORMED** | See §7 — honest statement of blocked validation, per the validation-honesty constraint. This is distinct from the local manual preview validation in §9, which **was** performed this pass. |

## 7. Blocked validations (stated plainly, per validation-honesty constraint)

- **No authenticated live-browser validation was performed against `apexomnihub.icu` in this pass.** Chromium through the agent proxy cannot reach `apexomnihub.icu` from this sandbox (confirmed in the original audit: `ERR_CONNECTION_CLOSED`), and no test-user Supabase credentials are available to authenticate a local build of `/omnidash` even if the network path worked.
- To complete authenticated browser validation, an owner needs to provide **either**: (a) a working browser-tunnel/proxy path from this sandbox to `apexomnihub.icu`, **or** (b) valid Supabase test-user credentials plus a local dev server with Supabase env vars configured, so `/omnidash` can be reached past the auth gate.
- This pass closed part of that gap differently: rather than reaching the live, auth-gated production URL, a local, credential-free preview harness was built that mounts the real, unmocked `OmniDashShell` component tree directly (skipping `ProtectedRoute`), giving genuine real-Chromium validation of layout/CSS/interaction behavior — see §9. This is **not** equivalent to live-production validation (no real auth, no real backend data, no production CDN/edge config) but it is strictly stronger than the jsdom-only unit-test validation in §6, and it is how the nav-occlusion bug below was actually found — that bug was invisible to jsdom because `fireEvent.click()` dispatches directly to the target node regardless of CSS stacking, while a real browser enforces actual hit-testing.
- All P0 results above are validated at the component/code level (real, non-stubbed `OmniMobileBottomNav`/`OmniMobileDrawer`/`OmniDashShell` rendered under Vitest + Testing Library, plus full-file `git diff` review) and, this pass, additionally at the local real-browser level (§9) — not via a live authenticated browser session against production.
- **`ORCHESTRATOR_URL` (backend Supabase Edge Function secret) could not be checked from this sandbox in this pass** — no live Supabase credentials/CLI/Management-API access were available this session (distinct from the prior pass documented in §3, which had temporary owner-supplied credentials). The owner action in §3/§5 (Supabase dashboard → Project Settings → Edge Functions → Secrets, or `supabase secrets list`) is unchanged and still outstanding. OmniMedia/Gateway (UI-011/UI-012) are **not** claimed fixed here — they remain OWNER-GATED exactly as in §3, pending that one secret confirmation plus a live route re-check.

## 9. Manual preview validation (this pass) and the nav-occlusion fix

A local, credential-free Playwright harness (temporary, not committed — `OmniDashShell` mounted directly via a throwaway `preview-entry.tsx`/`preview-omnidash.html` pair, since `/omnidash` is gated by `ProtectedRoute` and no live Supabase credentials were available this pass) was used to manually validate, in real Chromium at mobile (390×844) and tablet (820×1180) viewports:

- Home tab (default active) ✅
- Slate tab (switches and activates) ✅
- Apps drawer (all 9 real sidebar modules render with icons — OmniBoard, PhysiOmni, Audits, Links, Automations, Workflows, Files, Billing, Settings) ✅
- Module open from Apps (tapping a module closes the drawer and opens its modal) ✅
- Insights drawer (all 5 rail widgets) ✅
- More drawer ✅
- Exactly one active tab at all times (`role="tab"][aria-selected="true"]` count === 1) on both viewports ✅
- Drawer close via Home tap ✅
- Overlay `aria-hidden` attribute is `null` (not `"true"`) while a drawer is open, confirming the §4 accessibility fix holds in a real browser, not just in a jsdom assertion ✅

**New finding, fixed this pass (not on the original catalog, surfaced directly by the above validation):** while validating "exactly one active tab," switching directly from one open drawer (e.g. Insights) to a *different* bottom-nav tab (e.g. More) — without first closing the open drawer — failed in real Chromium with a pointer-events-interception error. Root cause: the drawer overlay's `z-index` (9500) was higher than the bottom nav's (9000) and used `inset: 0`, so the overlay's backdrop geometrically covered the entire nav strip whenever a drawer was open; a real browser's hit-testing correctly refused the click, where jsdom's `fireEvent.click()` would not have caught this (it dispatches directly to the target node, bypassing CSS stacking). This means a user could open a drawer and then close it, but not tap directly across to a sibling tab — a real degradation of the "bottom nav always works" P0 acceptance criterion that the existing unit-test suite could not have caught. Fixed via the three `omnidash-layout.css` changes in §4; re-verified via `getComputedStyle()` introspection (overlay `bottom: 56px`, nav `z-index: 9600` with no geometric overlap with the drawer) and via a controlled `git stash`-based A/B test confirming the original, unfixed CSS reproduced the exact failure. Re-ran the full manual validation pass above after the fix — all checks passed on both viewports with no regressions.

## 10. Final verdict

**PASS at the code/component validation level, additionally confirmed in a real local browser this pass (§9),** for: UI-001, UI-002, UI-003, UI-004, UI-005, UI-016.
**CONTAINMENT ONLY, P2 OPEN — not a PASS** for UI-006: the at-rest OmniSlate/widget overlap is suppressed, but the underlying drag/snap collision system is unchanged and remains a real, open defect deferred to P2 (see §1).
**OWNER-GATED, narrowed** for UI-011/UI-012: live read-only checks (a prior pass, with temporary owner-supplied credentials) found the routing fix already deployed in `omnilink-port` v32; only the `ORCHESTRATOR_URL` secret needs owner confirmation (§3, §7) — this is a one-line settings check, not a code or redeploy task. **Not claimed fixed** in this pass; no live credentials were available this session to advance that check further.
**OWNER-GATED, unchanged** for UI-013 (separate backend pipeline, no live check attempted).
**Live authenticated *browser* validation against `apexomnihub.icu` remains outstanding** — blocked at the network/proxy layer (§7), independent of credentials; not claimed as done. A local, credential-free real-browser validation pass (§9) was performed instead and is documented as a distinct, narrower form of evidence.
**One new defect found and fixed this pass** (§9): the bottom nav was unreachable while any drawer was open, due to a CSS z-index/viewport-unit bug invisible to the jsdom-based unit-test suite. Fixed in `omnidash-layout.css` and verified in a real browser.

Acceptance criteria re-check: mobile/tablet navigation is no longer cosmetic (real surface switches, tests prove it, and this pass's real-browser validation confirms it including the previously-unreachable-nav-while-drawer-open case); every primary surface is reachable (sidebar modules + all 5 rail widgets, via Apps/Insights drawers, now confirmed in a real browser at mobile/tablet sizes); active state is correct (single derived source, exactly-one-active-tab test passes, confirmed live); core desktop surfaces are not lost below 1024px (all present via drawers); backend P0 items are explicitly OWNER-GATED with verification commands provided, with no overclaiming of OmniMedia/Gateway fix status; UI-006 is explicitly left open for P2, not closed by this pass's containment fix.
