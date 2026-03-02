<!-- APEX_DOC_STAMP: VERSION=v8.2-SEMANTIC-BRIDGE | LAST_UPDATED=2026-03-02 -->
# Frontend Structure Map

This document maps the main frontend topology in `APEX-OmniHub`, with a visual
artifact for quick onboarding and architecture reviews.

## Scope

The map focuses on the React/Vite application rooted under `src/`, its route
shell, feature domains, shared libraries, quality/testing entry points, and the
isolated `apps/omnihub-site/` Vercel marketing site.

## High-Level Topology

1. **Bootstrap & Shell**
   - `src/main.tsx` mounts the app and theme provider.
   - `src/App.tsx` composes core providers (error boundary, React Query, router,
     auth, web3) and route definitions.

2. **Route Surfaces**
   - Public pages (`/`, `/auth`, `/privacy`, `/health`)
   - Protected/mobile-gated pages (`/dashboard`, `/translation`, `/agent`,
     `/settings`, etc.)
   - Nested OmniDash route tree (`/omnidash/*`)
   - Standalone app pages (`/apps/*`, `/tech-specs`)

3. **Feature Domains under `src/`**
   - UI composition (`components`, `contexts`, `providers`, `hooks`)
   - OmniConnect pipeline (`omniconnect/*`) — including the Semantic Bridge:
     - `omniconnect/bridge/acl.ts` — BridgePayload Zod schema + ACL gateway
     - `omniconnect/translation/translator.ts` — Web3/ERP → BridgePayload
   - Integrations (`integrations/*`)
   - Security & identity (`security`, `zero-trust`, `guardian`, `lib/web3`)
   - Edge compute & media (`lib/media`, `stores/omniMediaStore`,
     `stores/omniModalStore` — includes `triggerMANMode`/`dismissMANMode`)
   - Core/support modules (`core/mcp`, `stores`, `utils`, `armageddon`,
     `lib/*`)

4. **apps/omnihub-site/ — Isolated Vercel Marketing Site**
   - Canonical routing environment for APEX OmniHub SO (Single Orchestrator).
   - **STRICTLY FORBIDDEN:** imports from `../../src/` or `../../../src/`.
   - `src/layouts/OmniDashLayout.tsx` — 3-column shell with Outlet for subroutes.
   - `src/pages/DashboardOverview.tsx` — canonical data view (permanent in layout).
     Includes `BridgeFSMPanel` — Supabase realtime bridge state renderer.
   - `src/components/omnidash/BridgeFSM.tsx` — exhaustive FSM renderer:
     PENDING_NETWORK → Spinner, PROCESSING → Progress, SETTLED → CheckCircle,
     RECONCILED → CheckCircle, MAN_MODE_LOCKDOWN → MANModeModal (unclosable).
   - `src/components/omnidash/useBridgeState.ts` — realtime bridge state hook.
   - `src/components/omnidash/bridge-types.ts` — isolated BridgePayload types.

5. **Edge Compute Layer (Root-level)**
   - Vercel Edge CORS proxy (`api/cors.ts`)
   - LRU media cache governor (`lib/media/EdgeCacheController.ts`)
   - Cloudflare Worker proxy (`edge/cors-proxy/edge-cors-proxy.js`)

6. **Testing & Tooling Layer**
   - Vitest (`vitest.config.ts`) for broad frontend/unit/integration/simulation suites.
   - Playwright (`playwright.config.ts`) for runtime smoke/e2e.
   - Chaos battery (`tests/omnidash/bridge-fsm.chaos.spec.tsx`) — 3 tests:
     Mid-Saga Severance, State Regression, Malicious Injection.
   - Type/lint/build/security scripts in `package.json` + config files.

## Visual Diagram Artifact

![APEX OmniHub frontend structure diagram](./frontend-structure-map.svg)

## Semantic Bridge FSM Contract

```
BridgeAction → UI Component
─────────────────────────────────────
PENDING_NETWORK  → <Spinner label="Awaiting network…" />
PROCESSING       → <Progress indeterminate />
SETTLED          → <CheckCircle label="Confirmed" />
RECONCILED       → <CheckCircle label="Reconciled — Δ $0.00" />
MAN_MODE_LOCKDOWN → <MANModeModal unclosable requiresAuth />
  dismissal: WebAuthn biometric OR 6-digit multi-sig only
```

## Maintenance Notes

- Update this map when `src/App.tsx` or `apps/omnihub-site/src/App.tsx` route
  groups change materially.
- Update domain boxes if new top-level frontend subsystems are added under `src/`
  or `apps/omnihub-site/src/`.
- **Never** import from `src/` into `apps/omnihub-site/` — plane boundary is
  inviolable.
- Keep this file aligned with `ARCHITECTURE_CANONICAL_MAP.md`,
  `apps/omnihub-site/FRONTEND_ARCHITECTURE_MAP.md`, and onboarding docs.
