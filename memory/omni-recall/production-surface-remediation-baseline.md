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

## Current Integrated Apps route

- `OmniDashShell.tsx:1313-1400` IntegratedAppsWidget: 4 "Awaiting" placeholder slots + hardcoded
  `INTEGRATIONS` SaaS array (Salesforce/Slack/QuickBooks/etc.); connect → toast
  `"Integration {id} setup requires administrator privileges."` (`:1340`) = dead-end. No
  Third-Party vs Connected-APEX split; no `connector_sessions` reference in dashboard. → Phase 4.

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

- `DraggableWidget.tsx:1-300` uses Framer-Motion drag (`useMotionValue` x/y, `motion.div` drag
  props :131-134) as placement owner — **contract forbids** Framer-Motion as the placement gesture
  owner. Pointer handlers exist (:208-216). Collision via `findFreePosition()` (:71-121, square
  shells up to 800px). Persists per-widget key `omni_widget_pos_${id}` (:148,:276-278);
  `useLayoutPersistence.ts:137-141` resets those keys. Contract requires pointer-capture
  one-gesture placement + `omnidash_layout_v2:{userId}:{breakpoint}`. → Phase 10 (rewrite).

## Current modal host behavior

- `OmniSpatialHost.tsx` owns chrome: `role="dialog"` (:302), `aria-modal` (:303), focus trap
  (:166-209), single labeled Close (:319), minimize button (:316), dock chip restore/close
  (:340-361). **Divergence:** Escape (:154-161) and backdrop click (:279-288) **minimize**, not
  **close** — contract requires ordinary modals to **close** on Esc/backdrop (minimize = explicit
  button only). `omnidash-modal-contract.spec.ts` does not exist. → Phase 2.

## Current language / i18n exposure

- Language switcher already visible: `Layout.tsx` desktop (`:252`) + mobile (`:283`); handler
  `handleLanguageChange()` → `i18n.changeLanguage()` + `localStorage.setItem('apex_locale', …)`
  (`:51`). `i18n/locales.ts:1-85` defines 9 locales (en-US default, incl. RTL ar). Largely
  contract-compliant. Gap: OmniDash dashboard strings are hardcoded English. → Phase 11 (verify +
  evidence; minor).

## Current responsive behavior

- Layout switcher renders desktop + mobile variants (above). Full per-surface multi-viewport
  validation not yet established for changed surfaces. UNCERTAIN:[viewport hook coverage across
  all dashboard modules — to measure at Phase 17].

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

## Current accepted findings and code-wiring status

- `accepted-findings.md` lists only **APEX-1202** (k6 perf, `p99 < 800ms`, SOFT/main-only,
  ACCEPTED-DEFERRED). **APEX-2011** (Links fallback) referenced only in `AGENTS.md:831-834`, not in
  the registry. No machine-readable evidence artifact. → Phase 14 (code-wire + register).

## Current CI / runtime gate behavior

- `ci-runtime-gates.yml:457-463` k6 step runs **inline `k6 run loadtest.js`**, NOT the repo-owned
  `perf:k6:smoke` (`package.json:111` → `node scripts/ci/perf-k6-smoke.mjs`). No
  `continue-on-error`, no branch-scope guard on the step, no upload of
  `artifacts/production-validation/performance-summary.json`. This is a contract automatic-NO-GO
  (CI bypasses repo-owned script; no machine-readable artifact). → Phase 14/15.
- `artifacts/production-validation/` directory does not exist (only `build-artifacts/`).

## Current Supabase env classification

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

## UNCERTAIN (resolve at owning phase)

- Exact current drag-layout helper module path (no `dashboard/lib/*.ts`) — Phase 10.
- `dashboard/contracts/apexApps.ts` contents/role vs new `apex-apps-mcp` — Phase 3.
- Viewport-hook coverage across all modules — Phase 17.
- Deployed staging URL + live edge env presence — Phases 5/18.
