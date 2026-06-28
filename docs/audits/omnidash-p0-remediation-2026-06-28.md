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
**OWNER-GATED, narrowed** for UI-011/UI-012: live read-only checks (this pass) found the routing fix already deployed in `omnilink-port` v32; only the `ORCHESTRATOR_URL` secret needs owner confirmation (§3) — this is a one-line settings check, not a code or redeploy task.
**OWNER-GATED, unchanged** for UI-013 (separate backend pipeline, no live check attempted).
**Live authenticated *browser* validation against `apexomnihub.icu` remains outstanding** — blocked at the network/proxy layer (§7), independent of credentials; not claimed as done.

Acceptance criteria re-check: mobile/tablet navigation is no longer cosmetic (real surface switches, tests prove it); every primary surface is reachable (sidebar modules + all 5 rail widgets, via Apps/Insights drawers); active state is correct (single derived source, exactly-one-active-tab test passes); core desktop surfaces are not lost below 1024px (all present via drawers); backend P0 items are explicitly OWNER-GATED with verification commands provided.
