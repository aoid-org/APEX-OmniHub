# APEX OmniHub — Canonical Infrastructure & Architecture Map

> **Version:** 1.1.1 — 2026-03-15
> **Last updated:** 2026-03-15 — OmniDash Spatial Wiring fixes (WidgetShell, FloatingWindow, OmniSpatialHost, omniDashStore)
>
> **Purpose:** This is the first-stop map for both humans and agents. It documents the current repository build layout, runtime topology, and ownership boundaries as they exist now.
>
> **Read this first, then branch into module docs.**

## 1) TL;DR System Shape

APEX OmniHub is a **polyglot platform monorepo** with five primary execution planes:

1. **Frontend Control Plane** (React + Vite + TypeScript) in `src/`
2. **Edge/API Plane** (Supabase Edge Functions + Vercel Edge API) in `supabase/functions/` and `api/`
3. **Data Plane** (Supabase Postgres schema/migrations) in `supabase/migrations/`
4. **Workflow Plane** (Temporal Python orchestrator) in `orchestrator/`
5. **Infrastructure-as-Code Plane** (Terraform modules + env stacks) in `terraform/`

---

## 2) Canonical Repository Map (What lives where)

### Root-level high signal directories

- `src/` → main web app and UI runtime.
- `supabase/functions/` → serverless edge endpoints (22 directories).
- `supabase/migrations/` → Postgres schema evolution (51 SQL migrations).
- `orchestrator/` → Python Temporal workers/activities/workflows.
- `tests/` + `e2e/` → test suites across unit/integration/security/e2e domains.
- `.github/workflows/` → CI/CD and security workflows.
- `terraform/` → cloud modules (`vercel`, `cloudflare`, `upstash`) and env configs.
- `docs/` → architecture, infra, security, operations, quality, and audits.
- `apps/omnihub-site/` → separate marketing/site build target used by Vercel.

### Important support surfaces

- `api/cors.ts` + `api/middleware/rate-limiter.ts` → edge API utility surface.
- `edge/cors-proxy/` → worker-based CORS proxy implementation.
- `android/` + `ios/` → Capacitor mobile shells.
- `contracts/` + `scripts/hardhat/` → on-chain contract workflow.

---

## 3) Frontend Runtime Architecture (current implementation)

## 3.1 App bootstrap and providers

Entry:

- `src/main.tsx` mounts `App`.
- `src/App.tsx` composes global providers and route tree:
  - React Query
  - ErrorBoundary
  - BrowserRouter
  - Auth provider
  - Locale provider
  - Web3 provider
  - Global media dock (`GlobalMediaDock`)

Also initializes platform services:

- monitoring (`lib/monitoring`)
- security (`lib/security`)
- configuration logging (`lib/config`)
- lazy boot of PWA analytics, biometric auth, push notifications.

## 3.2 Route strategy (as implemented now)

`src/App.tsx` currently declares explicit route entries (not generated at runtime from a single registry for all app routes). It includes:

- public routes: `/privacy`, `/health`
- mobile-gated paid routes: `/translation`, `/agent`, `/settings`, `/omnitrace`
- mobile-gated dashboard routes: `/links`, `/files`, `/automations`, `/apex`, `/todos`, `/diagnostics`
- app pages under `/apps/*`
- fallback `*` → `NotFound`

## 3.3 OmniDash registry surface

`src/omnidash/uiRegistry.ts` defines OmniDash-specific registry objects:

- `HEADER_ACTIONS` (`connect-ai`, `persona`)
- `OMNIDASH_UI_REGISTRY.navItems` from `OMNIDASH_NAV_ITEMS`
- `OMNIDASH_UI_REGISTRY.routes` generated from nav items

`src/omnidash/types.ts` defines canonical nav list for OmniDash panels:

- `/omnidash`
- `/omnidash/pipeline`
- `/omnidash/kpis`
- `/omnidash/ops`
- `/omnidash/integrations`
- `/omnidash/events`
- `/omnidash/entities`
- `/omnidash/runs`
- `/omnidash/approvals`
- `/omnidash/workflows`

## 3.4 OmniDash Universal Modal Engine (v1.1.0 — 2026-03-13)

The APEX Universal Modal Engine provides a single, idempotent interaction surface for all OmniDash app triggers, connector auth flows, spatial app launches, and microfrontend integrations.

### State Layer

| Module           | Path                           | Role                                              |
| ---------------- | ------------------------------ | ------------------------------------------------- |
| `omniModalStore` | `src/stores/omniModalStore.ts` | Global modal lifecycle (Zustand + Zod validation) |
| `omniBoardStore` | `src/stores/omniBoardStore.ts` | Connector hydration state post-auth (Zustand) — exports `OmniBoardConnectorRecord`, `ConnectorStatus`, `hydrateConnector`, `setConnectorStatus` |

### Interaction Layer

| Module              | Path                                                         | Role                                                                  |
| ------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `useOmniDashAction` | `src/omnidash/useOmniDashAction.ts`                          | Universal intent dispatcher — formats user action → `OmniModalConfig` |
| `OmniSpatialHost`   | `apps/omnihub-site/dashboard/components/OmniSpatialHost.tsx` | Polymorphic renderer (dialog / spatial / sandbox)                     |
| `OmniAppShell`      | `apps/omnihub-site/src/lib/OmniAppShell.ts`                  | Shadow DOM custom element for microfrontend CSS/JS isolation          |

### Intent Resolution Rules (deterministic, no branches)

1. `dashboardStatus === 'Partial'` → `type: 'oauth'` (authorization required)
2. `contextData.appType` ∈ `{media, editor, terminal}` → `renderMode: 'spatial'` (GPU canvas)
3. `contextData.entryUrl` present → `type: 'microfrontend'` (Shadow DOM sandbox)
4. Live SPA with no contextData signals → `navigate(routePath)` (no modal)

### Zero-Config OAuth Contract

- Client sends intent to `supabase.functions.invoke('omnilink-agent')`.
- Edge function orchestrates provider handshake server-side.
- Client receives sanitized session descriptor (no raw credentials ever reach the browser).
- `sanitizeBackendPayload()` strips any key matching `/^(secret|token|key|password|credential|private|bearer)/i`.
- Hydrates `omniBoardStore` with `OmniBoardConnectorRecord` on success.

### Non-Reactive Dispatch Pattern

All modal invocations use `useOmniModal.getState().invoke()` — not the reactive `useOmniModal()` hook — to prevent the caller component from re-rendering on modal open/close.

---

## 3.5 OmniDash Shell Data Layer (v1.0.0 — 2026-03-13)

The `apps/omnihub-site/dashboard/` directory contains the OmniDashShell and its dedicated data layer. All files use site-local `@/lib/supabase` to avoid cross-layer `@/` alias conflicts with root `src/`.

### Dashboard Layer File Map

| Path | Role |
| ---- | ---- |
| `dashboard/OmniDashShell.tsx` | Main shell component — wired to `useLayoutPersistence` + `useDashboardData` |
| `dashboard/types/dashboard.types.ts` | Shared types: `DashboardNavSection`, `OmniDashOpsState`, `KpiSummary`, `PaneDescriptor`, `PersistedLayoutState` |
| `dashboard/hooks/useLayoutPersistence.ts` | Persists `activeNav`, `isDark`, `ops` to `localStorage` (key: `omnidash:layout:v1`) |
| `dashboard/hooks/useDashboardData.ts` | Fetches settings, KPI, incidents, memory health from Supabase via site-local client |
| `dashboard/hooks/usePaneRegistration.ts` | Registers panes with `omniDashStore` (OmniCanvas) — `openPane`, `closePane`, `focusPane`, `useAutoPane` |
| `dashboard/handlers/dashboardHandlers.ts` | Action handlers: `handleToggleDemoMode`, `handleToggleFreezeMode`, `handleReportIncident`, `handleUpsertKpi` |

### Asset Pipeline

All brand assets are imported as ES modules from `src/assets/omnidash/` via relative path `../../../src/assets/omnidash/` from the dashboard directory. No base64 embedding — assets are code-split by Vite into `dist/assets/png/`.

---

## 4) API / Edge Architecture

## 4.1 Supabase Edge Functions (22 function directories)

Current directories under `supabase/functions/`:

- `_shared`
- `alchemy-webhook`
- `apex-assistant`
- `apex-voice`
- `byom-cockpit`
- `byom-proxy`
- `execute-automation`
- `generate-business-skills`
- `omni-runs`
- `omnilink-agent`
- `omnilink-eval`
- `omnilink-port`
- `omnilink-retry-scheduler`
- `ops-voice-health`
- `send-push-notification`
- `storage-upload-url`
- `supabase_healthcheck`
- `test-integration`
- `trigger-workflow`
- `verify-nft`
- `web3-nonce`
- `web3-verify`

`supabase/config.toml` currently governs provider auth and per-function JWT verification policy.

## 4.2 Vercel edge/API settings

`vercel.json` config currently sets:

- build target to `apps/omnihub-site`
- SPA-ish rewrites for selected public pages
- security and caching headers for all routes and static assets

---

## 5) Data Architecture (Supabase Postgres)

- Source of schema truth is **versioned SQL** in `supabase/migrations/`.
- Current repository contains **51 migration files**.
- Many platform capabilities (audit logs, zero trust, Omnilink, OmniTrace, web3, MAN mode, etc.) are represented there and should be traced via migration history rather than inferred from app code alone.

---

## 6) Workflow / Orchestration Architecture

`orchestrator/` is a dedicated Python service using Temporal patterns with:

- workflows (`orchestrator/workflows/`)
- activities (`orchestrator/activities/`)
- models (`orchestrator/models/`)
- infrastructure/cache modules (`orchestrator/infrastructure/`)
- security/policy modules (`orchestrator/security/`, `orchestrator/policies/`)
- orchestrator-specific tests (`orchestrator/tests/`)

It is run independently from the Vite frontend and integrates through API/event contracts.

---

## 7) Infrastructure & Deployment Topology

## 7.1 IaC structure

`terraform/` includes:

- `modules/vercel`
- `modules/cloudflare`
- `modules/upstash`
- `environments/staging`

This indicates a cloud split where web delivery, edge network, and data/queue/cache services can be provisioned via reusable modules.

## 7.2 CI/CD runtime controls

`.github/workflows/` currently includes 13 YAML workflows, including:

- `ci-runtime-gates.yml`
- `cd-staging.yml`
- `production-readiness.yml`
- `secret-scanning.yml`
- `security-regression-guard.yml`
- `orchestrator-ci.yml`
- chaos/compliance/guardrail workflows

---

## 8) Testing Architecture

Primary test surfaces:

- `tests/` (domain-partitioned suites: api, integration, security, omnidash, omnilink, etc.)
- `e2e/` and `tests/e2e-playwright/` (browser and end-to-end paths)
- `sim/` and `tests/worldwide-wildcard/` (simulation and wildcard stress surfaces)
- `apex-resilience/tests/` (resilience-specific law/benchmark tests)

NPM scripts in `package.json` define gate commands:

- `lint`, `typecheck`, `build`, `test`
- e2e, simulation, security, python/orchestrator, and hardhat-specific gates

---

## 9) Current Build Snapshot (from direct repository inspection)

- `src/` files: **221** (legacy OmniDash components purged)
- `apps/omnihub-site/dashboard/components/` files: **58** (consolidated)
- `src/pages/` files (max depth 2): **18**
- `src/components/**/*.tsx`: **42**
- `supabase/functions/` directories: **22**
- `supabase/migrations/*.sql`: **51**
- test spec files in `tests/` + `e2e/`: **99**
- GitHub workflow YAML files: **13**

> These values should be treated as a point-in-time map for this commit and can drift as the repo evolves.

---

## 10) Agent/Developer navigation order (recommended)

When entering this repo, follow this sequence:

1. `ARCHITECTURE_CANONICAL_MAP.md` (this file)
2. `README.md` (platform framing + quick start)
3. `docs/README.md` (domain-specific doc index)
4. `package.json` (execution/test command surface)
5. `src/App.tsx` + `src/omnidash/uiRegistry.ts` (runtime UI composition)
6. `supabase/config.toml` + `supabase/functions/` (edge/service contract layer)
7. `supabase/migrations/` (authoritative schema evolution)
8. `orchestrator/README.md` + service internals (workflow engine)
9. `.github/workflows/` + `terraform/` (delivery + infra)

---

## 11) Rule for future updates to this map

Any PR that changes one of the following must update this file in the same PR:

- top-level architecture boundaries (new/removed planes)
- route composition strategy
- edge function inventory
- migration count baseline (optional but preferred)
- CI workflow topology
- infrastructure module topology
