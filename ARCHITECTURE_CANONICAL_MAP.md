# APEX OmniHub — Canonical Infrastructure & Architecture Map

> **Version:** 1.1.1 — 2026-03-15
> **Last updated:** 2026-03-15 — OmniDash Spatial Wiring fixes (WidgetShell, FloatingWindow, OmniSpatialHost, omniDashStore)
>
> **Purpose:** This is the first-stop map for both humans and agents. It documents the current repository build layout, runtime topology, and ownership boundaries as they exist right now — not as designed, as shipped.
>
> **Read this first, then branch into module docs.**

---

## 1) TL;DR System Shape

APEX OmniHub is a **polyglot platform monorepo** with five primary execution planes:

1. **Frontend Control Plane** (React 19 + Vite 7 + TypeScript 5.8) in `apps/omnihub-site/`
2. **Edge/API Plane** (Supabase Edge Functions + Vercel Edge API) in `supabase/functions/` and `api/`
3. **Data Plane** (Supabase Postgres schema/migrations) in `supabase/migrations/`
4. **Workflow Plane** (Temporal Python orchestrator) in `orchestrator/`
5. **Infrastructure-as-Code Plane** (Terraform modules + env stacks) in `terraform/`

> **Deployment:** Production at `apexomnihub.icu` via Vercel. Project: `apex-omnihub` (team: `apexapps`). Build target: `apps/omnihub-site/`. Runtime: Node 24.x.

---

## 2) Canonical Repository Map

### Root-level high-signal directories

| Directory | Purpose |
|---|---|
| `apps/omnihub-site/` | Marketing site + OmniDash SPA — **sole Vercel build target** |
| `src/` | Legacy OmniDash UI layer + shared platform stores (283 total files, 250 TS/TSX) |
| `supabase/functions/` | Serverless edge endpoints (22 directories) |
| `supabase/migrations/` | Postgres schema evolution (**58 SQL migrations**) |
| `orchestrator/` | Python Temporal workers / activities / workflows |
| `tests/` + `e2e/` | Test suites — unit, integration, security, e2e (102 spec files) |
| `.github/workflows/` | CI/CD and security workflows (14 YAML files) |
| `terraform/` | Cloud modules (`vercel`, `cloudflare`, `upstash`) + env configs |
| `docs/` | Architecture, infra, security, operations, quality, audits |
| `api/` | Vercel edge API surface (`cors.ts`, `middleware/`) |
| `android/` + `ios/` | Capacitor mobile shells |
| `contracts/` | On-chain contract workflow (`scripts/hardhat/`) |
| `edge/cors-proxy/` | Cloudflare Worker CORS proxy |
| `sim/` | Chaos simulation suite |
| `apex-resilience/` | Resilience law + benchmark tests |

---

## 3) Frontend Runtime Architecture

### 3.1 Build entry point

The Vercel build deploys **`apps/omnihub-site/`** exclusively.

```
apps/omnihub-site/
├── src/
│   ├── App.tsx                    ← SPA router (BrowserRouter + React Router v7)
│   ├── main.tsx                   ← Vite entry
│   ├── pages/                     ← 28 page components
│   ├── components/                ← Shared UI + omnidash sub-components
│   │   ├── omnidash/              ← Spatial windowing system (see §3.4)
│   │   │   ├── WidgetShell.tsx    ← Draggable/resizable widget exoskeleton
│   │   │   ├── FloatingWindow.tsx ← PiP always-on-top windows
│   │   │   ├── OmniCanvas.tsx     ← Infinite canvas host
│   │   │   ├── OmniSpatialHost.tsx← Polymorphic modal renderer
│   │   │   ├── ModuleRenderer.tsx ← React.lazy() module resolver (9 modules)
│   │   │   └── modules/           ← 9 lazy-loaded module components
│   │   └── ui/                    ← shadcn/ui primitives
│   ├── providers/                 ← OmniDashProvider, OmniDashContext
│   ├── stores/                    ← omniDashStore, omniModalStore
│   ├── hooks/                     ← useOmniDashAction, useOmniModuleState, useAuth, etc.
│   ├── lib/                       ← supabase.ts, ZIndexManager.ts, motionPresets.ts, etc.
│   ├── styles/                    ← globals.css, theme.css, omnidash-layout.css, etc.
│   └── i18n/                      ← 7 locale JSONs (en-US, fr-FR, es-ES, de-DE, ja-JP, zh-CN, pt-BR)
├── dashboard/                     ← OmniDash shell + dedicated data layer
│   ├── OmniDashShell.tsx          ← Main shell component (1,474 lines)
│   ├── components/                ← 62 TS/TSX dashboard components
│   ├── hooks/                     ← useDashboardData, useLayoutPersistence, usePaneRegistration
│   ├── handlers/                  ← dashboardHandlers.ts
│   └── types/                     ← dashboard.types.ts (shared type definitions)
└── public/                        ← Static assets (icons, audio, screenshots)
```

`apps/omnihub-site/src/App.tsx` re-exports from `apps/omnihub-site/src/App.tsx` directly — root `src/App.tsx` is a one-line re-export shim pointing to this file.

### 3.2 Routing (as implemented — verified against `src/App.tsx` at HEAD)

All routing is SPA with `BrowserRouter` + React Router v7. The route table is a static `appRoutes` array — no runtime registry.

#### Public routes (no auth guard)

| Path | Component |
|---|---|
| `/` | `HomePage` |
| `/launch` | `OnboardingWizard` |
| `/auth` | `LoginPage` |
| `/login` | `LoginPage` |
| `/story` | `FounderStory` |
| `/privacy` | `PrivacyPage` |
| `/terms` | `TermsPage` |
| `/tech-specs` | `TechSpecsPage` |
| `/request-access` | `RequestAccessPage` |
| `/advanced-analytics` | `AdvancedAnalyticsPage` |
| `/ai-automation` | `AiAutomationPage` |
| `/fortress` | `FortressPage` |
| `/maestro` | `MaestroPage` |
| `/man-mode` | `ManModePage` |
| `/omniport` | `OmniPortPage` |
| `/orchestrator` | `OrchestratorPage` |
| `/smart-integrations` | `SmartIntegrationsPage` |
| `/tri-force` | `TriForcePage` |
| `/demo` + `/demo.html` | `DemoPage` |
| `*` | `ComingSoonPage` |

#### Protected routes (auth guard via `ProtectedRoute`)

| Path | Component | Provider |
|---|---|---|
| `/omnidash` | `OmniDashShell` | `OmniDashProvider` ✅ |
| `/dashboard` | `OmniDashShell` | ❌ Missing `OmniDashProvider` — **known open bug** |

> ⚠️ **BUG-02 (Open):** `/dashboard` route is neither wrapped in `ProtectedRoute` nor `OmniDashProvider`. The canonical dashboard entry point is `/omnidash`. Fix: wrap `/dashboard` identically to `/omnidash` or remove it.

#### Vercel rewrites (clean URL → HTML file, from `vercel.json`)

Selected SPA pages have additional HTML entry points (`login.html`, `demo.html`, etc.) for Vercel rewrite targets. The catch-all `/(.*) → /index.html` handles SPA navigation.

### 3.3 OmniDash Shell Architecture

`dashboard/OmniDashShell.tsx` is the unified 1,474-line shell component. It does not use CSS class names from `omnidash-layout.css` — all styles are inline using the `T` design token object. The CSS file contains a parallel design token system that is currently disconnected from the shell.

#### OmniDash navigation (verified against `NAV` array in `OmniDashShell.tsx`)

| Label | Module Key | Icon Index |
|---|---|---|
| OmniBoard | *(main canvas — no modal)* | 0 |
| PhysiOmni | `physiomni` | 5 |
| Audits | `audits` | 1 |
| Links | `links` | 4 |
| Automations | `automations` | 7 |
| Workflows | `workflows` | 6 |
| Files | `files` | 8 |
| Billing | `billing` | 3 |
| Settings | `settings` | 2 |

> ⚠️ **BUG-01 (Open):** `DashboardNavSection` type in `dashboard/types/dashboard.types.ts` lists `Today | Pipeline | KPIs | Events | Ops | Runs | Integrations` — none of which match the actual NAV labels above. A force-cast `nav as DashboardNavSection` suppresses the TypeScript error. The type must be updated to match the live nav labels.

#### OmniDash data layer

`useDashboardData()` fetches four Supabase tables: `omnidash_settings`, `omnidash_kpi_daily`, `omnidash_incidents`, `memory_health_stats`. 

> ⚠️ **BUG-05 (Open):** No migrations exist for these four tables. All queries return empty on a fresh Supabase project.  
> ⚠️ **BUG-06 (Open):** `OmniDashShell` calls `useDashboardData()` but discards the return value — fetched data never reaches any panel component.

#### Layout persistence

`useLayoutPersistence` persists `activeNav`, `isDark`, `ops` to `localStorage` under key `omnidash:layout:v1`. Separate FOUC prevention in `index.html` reads `"theme"` key — these two systems are not synchronized.

### 3.4 OmniDash Spatial Windowing System

The spatial system lives in `src/components/omnidash/` and manages draggable widgets and floating PiP windows on an infinite canvas.

#### Layer map and z-index hierarchy

```
Document body (global stacking context)
│
├── OmniCanvas                              position: relative
│   └── transform layer (pan/zoom)         creates isolated stacking context
│       └── WidgetShell × N                z-index: 100–10,000  (ZIndexManager)
│
├── FloatingWindow × N                     position: fixed   z-index: Z_FLOATING = 15,000
│
├── Radix Dialog backdrop (Tailwind)        position: fixed   z-index: 9,000  (z-[9000])
├── Radix DialogContent (Tailwind)          position: fixed   z-index: 9,001  (z-[9001])
│
└── #omni-portal-root                       (OmniSpatialHost spatial + sandbox modes)
    └── Spatial / Sandbox overlays          position: fixed   z-index: Z_MODAL = 20,000
```

**Key fact:** OmniCanvas applies `transform: translate/scale` to its inner layer, creating an isolated CSS stacking context. Widget z-indexes (100–10,000) compete only within that context and never conflict with portal-mounted elements.

#### Spatial system files

| File | Role |
|---|---|
| `OmniCanvas.tsx` | Infinite canvas host — maps Zustand store → `WidgetShell` + `FloatingWindow` |
| `WidgetShell.tsx` | Draggable/resizable exoskeleton. Renders `ModuleRenderer` for content. |
| `FloatingWindow.tsx` | PiP window at `Z_FLOATING`. Renders `ModuleRenderer` for content. |
| `OmniSpatialHost.tsx` | Polymorphic modal renderer (dialog / spatial / sandbox). Portal-mounts to `#omni-portal-root`. |
| `ModuleRenderer.tsx` | `React.lazy()` resolver. Maps string key → lazy-loaded module component. Named export. |
| `moduleComponents.ts` | `hasModuleComponent()` validator. Separate from renderer to satisfy react-refresh rules. |
| `WidgetShell.tsx` | **⚠️ FIX-01:** Currently renders `{widget.component}` as a string. Must call `<ModuleRenderer>`. |
| `FloatingWindow.tsx` | **⚠️ FIX-02:** Currently renders `{config.component}` as a string. Must call `<ModuleRenderer>`. |

#### ZIndexManager

`src/lib/ZIndexManager.ts` exports:
- `Z_FLOATING = 15,000` — reserved for PiP windows
- `Z_MODAL = 20,000` — reserved for modal overlays (spatial/sandbox)
- `class ZIndexManager` — bring-to-front with compaction at ceiling 10,000

#### Registered modules (9 total, all lazy-loaded)

`omniskills` · `physiomni` · `audits` · `links` · `automations` · `workflows` · `files` · `billing` · `settings`

All modules accept `{ onClose: () => void }` and use `ModuleShell` as their loading/error wrapper.

### 3.5 OmniDash Modal System

#### State layer

| Module | Path | Role |
|---|---|---|
| `omniModalStore` | `src/stores/omniModalStore.ts` | Global modal lifecycle (Zustand + Zod boundary validation). Single-modal. |
| `omniDashStore` | `src/stores/omniDashStore.ts` | Spatial canvas state — widget positions, sizes, z-indexes, floating windows. |
| `OmniDashContext` | `src/providers/OmniDashContext.ts` | Context value: `widgetCount`, `hasFloatingWindows`, `zManager`. |
| `OmniDashProvider` | `src/providers/OmniDashProvider.tsx` | Mounts above `/omnidash` route. Required for `OmniDashContext` consumers. |

#### Modal invoke pattern

All modal invocations use `invoke()` from `useOmniModal()`. The store validates the config with Zod at the boundary and sanitizes `contextData`/`schema` via `structuredClone`. 

`resolveRenderMode()` deterministically maps `(type, contextData.appType)` → `dialog | spatial | sandbox`.

#### `OmniSpatialHost` render modes

| Mode | Trigger | Renderer | z-index |
|---|---|---|---|
| `dialog` | `type ∈ {oauth, form, selection, confirmation, module}` | Radix Dialog | 9,001 |
| `spatial` | `contextData.appType ∈ {media, editor, terminal}` | Framer Motion canvas + PiP | Z_MODAL (20,000) |
| `sandbox` | `type = 'microfrontend'` | Shadow DOM `<omni-app-shell>` | Z_MODAL (20,000) |

---

## 4) Known Open Issues (as of 2026-03-15 audit)

These are source-verified bugs present in HEAD `fe4688a7`. Each has a prescribed fix.

| ID | Severity | File | Description |
|---|---|---|---|
| BUG-01 | 🔴 Critical | `dashboard/types/dashboard.types.ts` | `DashboardNavSection` type does not match actual NAV labels |
| BUG-02 | 🔴 Critical | `src/App.tsx:63` | `/dashboard` route is unprotected and missing `OmniDashProvider` |
| BUG-03 | 🔴 Critical | `dashboard/OmniDashShell.tsx:415,1209` | `spin` keyframe not defined — sign-out and scan spinners are broken |
| BUG-04 | 🔴 Critical | `dashboard/OmniDashShell.tsx:869` | OmniSlate AI uses `setTimeout` mock — not wired to any AI API |
| BUG-05 | 🔴 Critical | `dashboard/hooks/useDashboardData.ts` | 4 Supabase tables queried have no migrations |
| BUG-06 | 🔴 Critical | `dashboard/OmniDashShell.tsx:1345` | `useDashboardData()` return value discarded — fetched data never reaches panels |
| BUG-07 | 🟠 High | `dashboard/OmniDashShell.tsx:530` | Search bar is non-functional (no handler, no ⌘K binding) |
| FIX-01 | 🔴 Critical | `src/components/omnidash/WidgetShell.tsx` | Renders `widget.component` string instead of `<ModuleRenderer>` |
| FIX-02 | 🔴 Critical | `src/components/omnidash/FloatingWindow.tsx` | Renders `config.component` string instead of `<ModuleRenderer>` |
| FIX-03 | 🔴 Critical | `src/stores/omniDashStore.ts:214` | `openFloating()` crashes on SSR — bare `window.innerWidth` access |
| FIX-04 | 🟠 High | `src/components/omnidash/OmniSpatialHost.tsx:492,595` | `zIndex: 'var(...)' as unknown as number` — spatial/sandbox overlays have no effective z-index |

---

## 5) API / Edge Architecture

### 5.1 Supabase Edge Functions (22 directories)

| Function | Purpose |
|---|---|
| `_shared` | Shared utilities |
| `alchemy-webhook` | Blockchain webhook receiver |
| `apex-assistant` | AI conversation handler |
| `apex-voice` | Real-time voice processing |
| `byom-cockpit` | BYOM dashboard backend |
| `byom-proxy` | BYOM proxy handler |
| `execute-automation` | Workflow execution |
| `generate-business-skills` | AI skill generation |
| `omni-runs` | Run history and management |
| `omnilink-agent` | Agent orchestration + Zero-Config OAuth proxy |
| `omnilink-eval` | Agent evaluation |
| `omnilink-port` | Universal connector |
| `omnilink-retry-scheduler` | DLQ retry orchestration |
| `ops-voice-health` | Voice system health check |
| `send-push-notification` | Mobile push delivery |
| `storage-upload-url` | Signed upload URL generator |
| `supabase_healthcheck` | Integration health probe |
| `test-integration` | Integration test surface |
| `trigger-workflow` | Temporal dispatch |
| `verify-nft` | NFT ownership check |
| `web3-nonce` | SIWE nonce generation |
| `web3-verify` | SIWE authentication |

### 5.2 Vercel deployment config

`apps/omnihub-site/vercel.json`:
- Build: `npm run build` → `dist/`
- Framework: `vite`
- Rewrites: SPA catch-all `/(.*) → /index.html` (plus explicit HTML file rewrites for selected pages)
- Security headers: `X-Frame-Options: DENY`, `HSTS`, `X-Content-Type-Options`, `Permissions-Policy`, `CORP`, `COOP: unsafe-none`

---

## 6) Data Architecture

- Schema source of truth: `supabase/migrations/` — **58 versioned SQL migration files**
- Authentication: `PKCE` flow via Supabase Auth
- Client initialization: `apps/omnihub-site/src/lib/supabase.ts` (accepts both `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_ANON_KEY`)
- RLS is enabled on all user-facing tables
- `omnidash_settings`, `omnidash_kpi_daily`, `omnidash_incidents`, `memory_health_stats` — **missing migrations** (see BUG-05)

---

## 7) Workflow / Orchestration Architecture

`orchestrator/` is a dedicated Python service using Temporal patterns:

- `orchestrator/workflows/` — durable workflow definitions
- `orchestrator/activities/` — tool execution with audit trails
- `orchestrator/security/` — Guardian policy evaluation (Tri-Force layer 1)
- `orchestrator/models/` — domain models
- `orchestrator/infrastructure/` — cache / infrastructure modules
- `orchestrator/policies/` — policy definitions

Integrates with the frontend through API/event contracts via `trigger-workflow` edge function.

---

## 8) Infrastructure & Deployment Topology

### 8.1 IaC structure (`terraform/`)

- `modules/vercel` — web delivery
- `modules/cloudflare` — edge network / Worker deployment
- `modules/upstash` — Redis cache / queue
- `environments/staging` — staging environment stack

### 8.2 CI/CD (14 GitHub Actions workflows)

Selected workflows:

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci-runtime-gates.yml` | PR/Push | Build, test, lint, typecheck |
| `cd-staging.yml` | Push to develop | Staging deployment |
| `production-readiness.yml` | Push to main | Production gate |
| `secret-scanning.yml` | PR | TruffleHog + Gitleaks |
| `security-regression-guard.yml` | PR | Security regression |
| `orchestrator-ci.yml` | PR | Python orchestrator tests |
| `chaos-simulation-ci.yml` | Scheduled | Resilience testing |
| `sonarqube-analysis.yml` | PR | Code quality audit |

---

## 9) Testing Architecture

| Surface | Location | Count |
|---|---|---|
| Domain-partitioned unit/integration | `tests/` | ~80 specs |
| Browser E2E (Playwright) | `tests/visual/`, `tests/routes/`, `e2e/` | ~22 specs |
| Simulation / stress | `sim/`, `tests/worldwide-wildcard/` | — |
| Resilience laws / benchmarks | `apex-resilience/tests/` | — |
| **Total spec files** | `tests/` + `e2e/` | **102** |

Gate commands (from root `package.json`):

```bash
bun run lint          # ESLint (0 warnings gate)
bun run typecheck     # TypeScript strict (0 errors gate)
bun test              # Vitest suite
bun run build         # Vite production build
```

---

## 10) Current Build Snapshot (verified at HEAD `fe4688a7`, 2026-03-15)

| Metric | Value |
|---|---|
| `src/` total files | 283 |
| `src/` TypeScript/TSX | 250 |
| `apps/omnihub-site/src/` TS/TSX | 119 |
| `apps/omnihub-site/dashboard/` TS/TSX | 62 |
| `apps/omnihub-site/src/pages/` pages | 28 |
| Supabase edge function directories | 22 |
| Supabase migration SQL files | 58 |
| Test spec files (`tests/` + `e2e/`) | 102 |
| GitHub Actions workflow files | 14 |
| OmniDash registered modules | 9 |
| Registered SPA routes | 21 (+ `*` fallback) |

---

## 11) Agent/Developer Navigation Order

When entering this repository, follow this sequence:

1. `ARCHITECTURE_CANONICAL_MAP.md` ← **this file**
2. `README.md` — platform framing + quick start
3. `apps/omnihub-site/src/App.tsx` — live route table
4. `apps/omnihub-site/dashboard/OmniDashShell.tsx` — shell entry point
5. `apps/omnihub-site/src/stores/` — modal + spatial state
6. `supabase/config.toml` + `supabase/functions/` — edge/service contracts
7. `supabase/migrations/` — authoritative schema evolution
8. `orchestrator/README.md` — workflow engine
9. `.github/workflows/` + `terraform/` — delivery + infra

---

## 12) Update Rules

Any PR that modifies any of the following **must** update this file in the same commit:

- Top-level architecture boundaries (new or removed planes)
- Route table composition in `src/App.tsx`
- Edge function inventory (`supabase/functions/`)
- Migration count baseline
- Z-index hierarchy or `ZIndexManager` constants
- CI/CD workflow topology
- Registered OmniDash module inventory
- Infrastructure module topology

---

*APEX Business Systems Ltd. · Edmonton, AB, Canada*
*© 2026 — Proprietary. All rights reserved.*
*Audited at HEAD `fe4688a7` · 2026-03-15*
