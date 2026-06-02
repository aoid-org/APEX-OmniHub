<!-- APEX_DOC_STAMP: VERSION=v1.6.3 | LAST_UPDATED=2026-06-01 -->
> 2026-06-01 current-state note: active OmniDash shell authority is `apps/omnihub-site/dashboard/OmniDashShell.tsx`; see `docs/CURRENT_PLATFORM_STATE_2026_06_02.md`.

# Frontend Structure Map

## Vercel Reference Classification

LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical. Any Vercel commands, rollback paths, modules, or Edge Runtime references in this document are not current deployment proof unless separately labeled VERIFIED with active configuration evidence. See `docs/architecture/CANONICAL_TRUTH_MATRIX.md`.


This document maps the main frontend topology in `APEX-OmniHub`, with a visual artifact for quick onboarding and architecture reviews.

## Scope

The map focuses on the React/Vite application rooted under `apps/omnihub-site/` with `src/App.tsx` as the root shim, its route shell, feature domains, shared libraries, and quality/testing entry points.

## High-Level Topology

1. **Bootstrap & Shell**
   - `src/main.tsx` mounts the app and theme provider.
   - `src/App.tsx` composes core providers (error boundary, React Query, router, auth, web3) and route definitions.

2. **Route Surfaces**
   - Public pages (`/`, `/auth`, `/privacy`, `/health`)
   - Protected/mobile-gated pages (`/dashboard`, `/translation`, `/agent`, `/settings`, etc.)
   - Nested OmniDash route tree (`/omnidash/*`)
   - Standalone app pages (`/apps/*`, `/tech-specs`)

3. **Feature Domains under `src/`**
   - UI composition (`components`, `contexts`, `providers`, `hooks`)
   - OmniConnect pipeline (`omniconnect/*`)
   - Integrations (`integrations/*`)
   - Security & identity (`security`, `zero-trust`, `guardian`, `lib/web3`)
   - Edge compute & media (`lib/media`, `stores/omniMediaStore`, `stores/omniModalStore`)
   - Core/support modules (`core`, `api`, `stores`, `utils`, `armageddon`, `lib/*`)

4. **Edge Compute Layer (Root-level)**
   - Vercel Edge CORS proxy (`api/cors.ts`) — LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical.
   - LRU media cache governor (`lib/media/EdgeCacheController.ts`)
   - Cloudflare Worker proxy (`edge/cors-proxy/edge-cors-proxy.js`)

5. **Testing & Tooling Layer**
   - Vitest (`vitest.config.ts`) for broad frontend/unit/integration/simulation suites.
   - Playwright (`playwright.config.ts`) for runtime smoke/e2e.
   - Type/lint/build/security scripts in `package.json` + config files.


6. **OmniDash Sidebar Widget Rail**
   - Canonical contract: `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`
   - Renderer: `apps/omnihub-site/dashboard/OmniDashShell.tsx`
   - Tests: `tests/omnidash/omnidash-sidebar-widgets.contract.spec.ts` and `tests/omnidash/omnidash-layout-contract.spec.tsx`
   - Drift guard: `eslint.config.js` rejects local `NAV` and `NAV_MODULE_KEY` in `OmniDashShell.tsx`
   - Do not use `APP_REGISTRY` or `OMNIDASH_CONTRACT` as the left-sidebar source of truth.


## Visual Diagram Artifact

> **Note:** The SVG diagram (`frontend-structure-map.svg`) was removed in the Cloudflare-first topology migration (2026-05-20). The textual topology above is the current canonical reference. A regenerated diagram will be added in a future docs sprint.

## Maintenance Notes

- Update this map when `apps/omnihub-site/src/App.tsx` route groups or the OmniDash sidebar widget contract change materially.
- Update domain boxes if new top-level frontend subsystems are added under `src/`.
- Keep this file aligned with onboarding docs and architecture summaries.
