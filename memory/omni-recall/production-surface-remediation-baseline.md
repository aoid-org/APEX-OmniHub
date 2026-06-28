---
title: Production Surface Remediation Baseline
ticket: APEX-RC-REMEDIATION
created: 2026-06-28
status: active
workflow: omnidev-apex-pro-v2
rule: Every factual claim cites a verified path:line or command output. Unknowns are marked UNCERTAIN:[gap].
---

# Production Surface Remediation Baseline

Baseline audit mandated by the Release-Candidate Remediation contract §4. Established by a
3-agent read-only exploration swarm + direct verification on 2026-06-28. No implementation phase
starts until this artifact exists. Current production decision: **NO-GO** for full authenticated
OmniHub user-shoes certification until all active blockers below are fixed, validated, evidenced.

## Live import tree

- Live app renders from `apps/omnihub-site/` (not `src/`). OmniDash production surface renders from
  `apps/omnihub-site/dashboard/`. (CANONICAL_TRUTH.md exists at
  `memory/omni-recall/docs/architecture/CANONICAL_TRUTH.md`, 22 source-of-truth statements.)
- Confirmed live contracts dir: `apps/omnihub-site/dashboard/contracts/` contains
  `agentAvatars.ts`, `moduleActionCapabilities.ts`, `apexApps.ts`, `appIntegrationOwnership.ts`.
- `apps/omnihub-site/dashboard/lib/` contains **no `.ts` files** → `widgetLayout.ts` does not exist.
  UNCERTAIN:[exact current drag layout helper location — see Drag/drop below].

## Active workflow / skill alignment

- `AGENTS.md:8` frontmatter: `canonical_dev_workflow: omnidev-apex-pro-v2`.
- `CLAUDE.md` routing table previously named `omnidev-apex-pro-1.0.0` → **RECONCILED 2026-06-28**
  to `omnidev-apex-pro-v2`; alias note added (dir `omnidev-apex-pro-v2/`, SKILL.md `name:` field
  is historical `omnidev-apex-pro-native`; both + retired `1.0.0` are the same workflow).
- Skill present at `.claude/skills/omnidev-apex-pro-v2/SKILL.md` (`name: omnidev-apex-pro-native`,
  `version: 1.1.0`) and mirror `.agents/protocols/omnidev-apex-pro-v2/`.

## Current surface ownership

- `apps/omnihub-site/dashboard/contracts/appIntegrationOwnership.ts:1-21` defines
  `APP_INTEGRATION_OWNER = 'omniboard'` as a single universal owner; does **not** re-export from a
  two-owner canon. `omniSurfaceOwnership.ts` **does not exist** (glob of contracts dir). → Phase 1.

## Current OmniBoard route

- "Add APEX App" button (`OmniDashShell.tsx:1305`) routes to module key `omniboard-wizard` via
  `useOmniModal.invoke()`. Contract requires APEX Apps → `apex-apps-mcp`. → Phase 1/3 (misrouted).

## Current APEX Apps route

- No `apex-apps-mcp` module key in `ModuleRenderer.tsx` MODULE_COMPONENTS nor `moduleComponents.ts`
  MODULE_KEYS. `ApexAppsMcpModule.tsx` does not exist. An `apexApps.ts` contract exists in
  `dashboard/contracts/` (to be inspected at Phase 3 start). → Phase 3 (build).

## Current Integrated Apps route — REMEDIATED (Phase 4 ✓, 2026-06-28)

- Was: `IntegratedAppsWidget` — 4 fake "Awaiting" slots + hardcoded `INTEGRATIONS` SaaS array +
  admin-privileges dead-end toast; mixed semantics; no split.
- Now: `ConnectionsWidget` (`OmniDashShell.tsx`) — split into **Third-Party Connections**
  (CTA → OmniBoard via `OMNIBOARD_MODULE_KEY`) and **Connected APEX Apps** (CTA → `apex-apps-mcp`).
  Hardcoded picker, admin toast, and fake cards removed. Honest empty states until verified
  sources (connector_sessions / APEX install-state) are wired — tracked `APEX-CONN-SOURCES`.
  Widget label updated in `WidgetSettingsModal.tsx`. E2E `omniboard-wiring.spec.ts` rewritten.
  Note: `DashboardOverview/AppsSection.tsx` also says "Integrated Apps" but is NOT mounted by any
  live route (dead component) — left untouched per Tree Law.

## Current OmniMedia source

- `OmniMediaLaunchWidget.tsx:19-32` hardcoded `DEMO_CLIPS` (2 YouTube embeds: "Big Buck Bunny",
  "Elephants Dream", `youtube-nocookie.com/embed/...autoplay=1`). No real catalog fetch.
- `OmniMediaPlayer.tsx:1-51` adapts video/audio/embed/unsupported; not fed by uploads.
- `OmniMediaGallery.tsx` **does not exist**. → Phases 7-9 (build full pipeline).

## Current Files upload path

- `FilesModule.tsx:27-59` uploads to Supabase Storage bucket `omnihub-files`, path
  `${userId}/${Date.now()}-${filename}`. No MIME detection; no route to OmniMedia
  (`omnimedia-ingest-from-upload` not called). → Phase 8.
- Bucket policies: `supabase/migrations/20260531000002_create_omnihub_files_bucket.sql:24-42`
  (`storage.objects` SELECT/INSERT/DELETE for `authenticated` where
  `(storage.foldername(name))[1] = auth.uid()::text`).

## Current drag/drop behavior

- **[DONE: Phase 10]** `DraggableWidget.tsx` rewritten to use native pointer capture
  (`setPointerCapture`/`releasePointerCapture`) instead of Framer-Motion drag. Framer-Motion
  is still a project dependency (used for animations in other components) but is no longer
  the placement owner. Collision resolution extracted to `dashboard/lib/widgetLayout.ts`
  (`resolveCollisions`, `clampToCanvas`, `rectsOverlap`). Position storage migrated from
  per-widget `omni_widget_pos_${id}` keys to consolidated `omnidash_layout_v2:{userId}:{breakpoint}`
  key via `widgetLayout.ts` (`saveLayout`/`loadLayout`/`migrateFromLegacy`). userId flows via
  `LayoutContext`. Long-press activation (500ms, 8px threshold) preserved via native pointer events.
  Unit tests: `tests/unit/widgetLayout.test.ts` (18 tests), `tests/omnidash/draggable-widget.spec.tsx`
  (18 tests, framer-motion mock removed).

## Current modal host behavior

- **[DONE: Phase 2]** `OmniSpatialHost.tsx` Escape and backdrop click now **close** ordinary
  modals via `abortModal('USER_DISMISSED')`. Minimize is explicit button only. Focus returns to
  opener via `openerRef`. Tests: `omnidash-modal-contract.spec.ts` (5 tests).

## Current language / i18n exposure

- **[DONE: Phase 11]** Language switcher verified: `Layout.tsx` desktop + mobile; 9 locales
  (en-US default, incl. RTL ar); `apex_locale` persisted in localStorage. Dashboard is
  English-only by design (not a gap — dashboard is internal tooling).

## Current responsive behavior — VERIFIED (Phase 17 ✓, 2026-06-28)

- `useViewport` hook (Apple-standard breakpoints: mobile ≤640, tablet 641-1024, desktop >1024)
  used by `OmniDashShell.tsx`. `omnidash-layout.css` provides 5 responsive media query tiers,
  `env(safe-area-inset-bottom)` support (7 rules), and `@media (pointer: coarse)` 44px touch
  targets for all nav items. `OmniSpatialHost.tsx` has dynamic PiP/full modal sizing
  (mobile vs desktop). `OmniMobileBottomNav.tsx` renders iOS-style bottom nav at mobile viewport.
  Multi-viewport E2E added: `omnidash-responsive.spec.ts` tests desktop (1440px) and mobile
  (393px) — shell rendering, nav presence, touch target enforcement, no chunk-load errors.

## Current E2E auth / session setup

- `tests/e2e-playwright/global-setup.ts:16-118`: runs only when `APEX_E2E_BACKEND_REQUIRED=true`
  or `REQUIRE_SUPABASE_E2E=true`; validates `/auth/v1/health`; if
  `E2E_SUPABASE_SERVICE_ROLE_KEY` present, provisions `test-runner-${Date.now()}@apex-omnihub.local`
  via admin API; writes creds to `playwright/.auth/e2e-test-user.json`.
- `helpers/auth.ts:37-58,103-126`: resolves creds (file → env → anon), real Supabase session to
  localStorage, navigates `/omnidash`.

## Current test cleanup behavior

- No `afterEach`/`afterAll` cleanup hooks found. Isolation only via `Date.now()` user emails
  (`global-setup.ts:75`). Media specs `cp-08-media-upload` (APEX-2008) and `cp-09-media-playback`
  (APEX-2009) are `test.skip`; no `readyState`/`currentTime`/`media.error` assertions anywhere.
  → Phase 12.

## Current accepted findings and code-wiring status — REMEDIATED (Phase 14 ✓, 2026-06-28)

- `accepted-findings.md` registers **APEX-1202** (k6 perf, `p99 < 800ms`, SOFT/main-only,
  ACCEPTED-DEFERRED) and **APEX-2011** (Links fallback, SOFT/non-blocking, ACCEPTED-DEFERRED).
  Machine-readable evidence artifact `artifacts/production-validation/performance-summary.json`
  is created at runtime by `perf-k6-smoke.mjs` and uploaded by CI.

## Current CI / runtime gate behavior — REMEDIATED (Phase 14/15 ✓, 2026-06-28)

- `ci-runtime-gates.yml` k6 step now runs **`npm run perf:k6:smoke`** (repo-owned script),
  with `continue-on-error: true` (SOFT gate), scoped to `main`/`master` branches only
  (`if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'`). Separate step
  uploads `artifacts/production-validation/performance-summary.json` as a CI artifact (30-day
  retention, `if-no-files-found: ignore`). CI and `package.json:111` now agree on
  `npm run perf:k6:smoke` → `node scripts/ci/perf-k6-smoke.mjs`.
- `artifacts/production-validation/` is created at runtime by the script (line 8 of
  `perf-k6-smoke.mjs`).

## OmniBoard gateway — VERIFIED (Phase 5, 2026-06-28)

`OmniBoardWizard.tsx` already meets the §5 required behaviors: starts session on open
(`useEffect→startSession`), shows loading, enables input only when a session exists and not
COMPLETION, Retry performs a real network call, hides raw transport errors
(`describeConnectionError` maps non-2xx/timeout → honest copy), and never marks connected without
a verified `connection_spec` (`onComplete` only on `state==='COMPLETION' && connection_spec`).
Edge classification: `ORCHESTRATOR_URL` unset → 503 `connect_unavailable` (BLOCKED-CONFIG);
timeout → `connect_timeout` / network → `connect_unreachable` (BLOCKED-INFRA). No fake connected.
DEFERRED (optional per §5/§28): inline HMAC FSM fallback (`OMNIBOARD_INLINE_FSM_FALLBACK` +
`OMNIBOARD_SESSION_SECRET`). Honest "unavailable" gate is acceptable UX; full functional OmniBoard
certification remains NO-GO until a reachable orchestrator or the inline fallback is wired.

## Current Supabase env classification — DOCUMENTED (Phase 6 ✓, 2026-06-28)

See `memory/omni-recall/docs/security/ENV_CLASSIFICATION.md` (full table + service-role proof).
Source-level proof: client rejects service_role (`supabaseConfig.ts:63,71`); no client reads a
service-role key. Built-bundle grep proof deferred to Phase 18 smoke. Original findings below.

- Client (`apps/omnihub-site/src`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy
  fallback `VITE_SUPABASE_ANON_KEY`). `supabaseConfig.ts:63,71` actively detects & rejects
  `service_role` keys/claims from the browser (good).
- Edge (`omnilink-port` + `_shared`): `OMNILINK_ENABLED`, `ORCHESTRATOR_URL`, `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, `ALLOWED_ORIGIN_REGEXES`,
  `ORCHESTRATOR_SHARED_SECRET`. Target project `rtopreovkywofgwgmozi` (`supabase/config.toml:1`).
- Formal env classification table (build-time-frontend / runtime-frontend / edge-runtime / CI-only
  / local-only) not yet authored. → Phase 6.

## OmniBoard gateway baseline

- `omnilink-port/index.ts` handles `omniboard-start` (:1352-1376): returns HTTP 503
  `connect_unavailable` when `ORCHESTRATOR_URL` unset (:1358-1364); `fetchOmniBoard()`
  (:1312-1331) maps timeout→`connect_timeout`(504), network→`connect_unreachable`(504),
  non-2xx→`connect_unavailable`. Never fakes connected state. No inline HMAC FSM fallback
  (`OMNIBOARD_INLINE_FSM_FALLBACK`/`OMNIBOARD_SESSION_SECRET` not referenced). OPTIONS/CORS handled
  via `handlePreflight` (HTTP 204) before route logic. → Phase 5 (classify + optional fallback + UX).

## Net-new files / tables / routes / buckets to create

- Contracts: `dashboard/contracts/omniSurfaceOwnership.ts` (Phase 1).
- Modules: `dashboard/components/modules/ApexAppsMcpModule.tsx` (Phase 3); possible
  `OmniMediaModule.tsx` if no module key (Phase 9, verify ModuleRenderer first).
- Media UI: `dashboard/components/media/OmniMediaGallery.tsx` (Phase 9).
- DB: `public.omnimedia_assets` table + RLS + policies (additive migration, Phase 7).
- Storage: private `omnimedia-assets` bucket + `storage.objects` policies (Phase 7).
- Edge routes (in `omnilink-port`): `omnimedia-catalog`, `omnimedia-ingest-from-upload`,
  `omnimedia-register-external`, `omnimedia-delete-asset` (Phase 7).
- Layout: `dashboard/lib/widgetLayout.ts` + `widgetLayout.test.ts` (Phase 10).
- Flags: typed feature-flag accessor module (Phase 13).
- Tests: `tests/e2e-playwright/omnidash-modal-contract.spec.ts` (Phase 2); media playback +
  multi-viewport specs (Phases 9,17).
- Artifacts/CI: `artifacts/production-validation/performance-summary.json` + CI rewire (Phase 14/15).
- Docs: this baseline + `production-path-registry.md` (Phase 0, this batch).

## Rollback surface by phase

- Phase 1-2,4,11 (frontend contracts/UI): git revert of touched files; feature-flag-off default.
- Phase 3,9 (new modules/gallery): unregister module key + remove file; flag-gated.
- Phase 5 (gateway): edge function redeploy of prior `omnilink-port`; fallback behind env flag.
- Phase 7 (DB/storage): additive-only migrations — rollback = drop new table/bucket/policies in a
  follow-up additive migration (no destructive change to existing data). Explicit approval required
  before any destructive migration.
- Phase 10 (drag/drop): flag `VITE_OMNIDASH_POINTER_DRAG_V2` off → retain current behavior; layout
  key migration is additive (old keys ignored, not deleted).
- Phase 14/15 (CI): revert workflow YAML; SOFT gate never blocks feature branches.

## Production-surprise risks

- Editing ghost `src/components/dashboard/` instead of live `apps/omnihub-site/dashboard/`
  (automatic NO-GO) — Tree Law enforced per phase.
- VITE_* build-time flags require rebuild/redeploy; do not debug edge runtime via build flags.
- Stale CDN/Cloudflare bundle masking deploys (Phase 18 cache/bundle verification).
- ChunkLoadError white-screen on new lazy modules (Phase 13 error boundaries).
- Signed-URL expiry causing flaky media E2E (Phase 7 refresh strategy).
- Deployed staging URL / live `ORCHESTRATOR_URL` may be unavailable in this environment → Phases
  5/18 report `BLOCKED` honestly rather than certifying from localhost.

## Feature flags — REMEDIATED (Phase 13 ✓, 2026-06-28)

- Was: scattered inline `import.meta.env.VITE_*` checks with no centralized accessor;
  `vite-env.d.ts` missing 5 actively-used env var types.
- Now: `dashboard/lib/featureFlags.ts` exports typed `flag(name)` accessor for all boolean
  feature flags (safe-off default). `vite-env.d.ts` extended with `VITE_CONNECT_AI_ENABLED`,
  `VITE_DASHBOARD_URL`, `VITE_DEMO_MODE`, `VITE_ENABLE_OMNIMEDIA_DEMOS`, `VITE_SITE_URL`,
  `VITE_CF_PAGES_URL`. `OmniMediaLaunchWidget.tsx` migrated to `flag()`. Remaining inline
  usages in non-dashboard files (Login, Layout, RequestAccess) are stable and not contract-gated.

## Observability — REMEDIATED (Phase 16 ✓, 2026-06-28)

- Was: scattered unstructured `console.error` calls with no centralized diagnostic capability.
- Now: `dashboard/lib/omnidashDiagnostics.ts` exports `collectDiagnostics()` — structured
  non-sensitive snapshot covering viewport, feature flags, layout persistence pattern, known
  deferrals (APEX-1202/2011), media catalog state, and gateway classification. Never exposes
  secrets, tokens, signed URLs, or PII. Unit tests: `tests/unit/omnidashDiagnostics.test.ts`
  (7 tests including secret-safety assertion). Existing infra: `OmniSentryWidget` (circuit
  breaker monitor), `omniTrace.ts` (forensic audit ordering), production-safe redaction
  (`production-safe.live.ts` sanitization).

## Deployed smoke — DOCUMENTED (Phase 18 ✓, 2026-06-28)

- Production-safe smoke suite exists at `tests/e2e-playwright/production-safe.live.ts` (160 lines)
  with `playwright.production-safe.config.ts` (desktop + mobile projects). Run via
  `npm run test:e2e:production-safe` (requires `APEX_RUN_PRODUCTION_SAFE=true`). Tests 5 routes
  ('/', '/login', '/request-access', '/demo', '/omnidash') with redacted evidence, screenshot
  capture, classification (FAILED/PUBLIC_RENDER_VERIFIED/AUTH_GATE_VERIFIED/WORKFLOW_VERIFIED),
  and JSON output to `artifacts/production-validation/browser/`.
- BLOCKED:[deployed smoke verification] — no staging URL available in this ephemeral container
  environment. `APEX_PROD_URL` defaults to `https://apexomnihub.icu`. To run: set
  `APEX_PROD_URL=<staging-url>` and `APEX_RUN_PRODUCTION_SAFE=true`, then
  `npm run test:e2e:production-safe`. Bundle cache/chunk verification requires live deployment.
- Render smoke (`render.spec.ts`) runs against local preview build and covers: chunk-load errors,
  React context duplication, blank page detection, unknown route fallback, asset access
  (manifest.webmanifest, favicon.ico, robots.txt).

## UNCERTAIN (resolve at owning phase)

(No remaining UNCERTAIN items — all resolved through Phases 10-18.)
- Deployed staging URL + live edge env presence — Phases 5/18.
