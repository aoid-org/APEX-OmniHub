---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v1.6.2 | LAST_UPDATED=2026-05-20 -->
# OmniDash (Founder/Sales Dashboard)

> **Current-state update (2026-06-01):** OmniDash is the always-on post-auth shell for `/omnidash`, `/omnidash/*`, `/dashboard`, and `/dashboard/*`. `OmniDashShell.tsx` is the shell authority. Older feature-flag instructions below are retained only where explicitly marked historical.

## Vercel Reference Classification

LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical. Any Vercel commands, rollback paths, modules, or Edge Runtime references in this document are not current deployment proof unless separately labeled VERIFIED with active configuration evidence. See `docs/architecture/CANONICAL_TRUTH_MATRIX.md`.



## OmniDash Left Sidebar Widget Rail Contract (v1.6.2 — 2026-05-12)

The OmniDash left sidebar is a **widget rail**, not the product app registry. Do not derive it from `APP_REGISTRY` or `OMNIDASH_CONTRACT`.

### Sidebar Source of Truth

| Surface | Canonical file | Purpose |
|---|---|---|
| Left sidebar widget rail | `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts` | Locked 9-widget sidebar order, labels, icon indexes, and modal module keys |
| Shell renderer | `apps/omnihub-site/dashboard/OmniDashShell.tsx` | Imports `OMNIDASH_SIDEBAR_WIDGETS`; must not define local `NAV` or `NAV_MODULE_KEY` |
| Product/platform registry | `packages/core/src/registry.ts` | Broader 14-app product registry; not a sidebar contract |
| OmniDash product contract | `src/contracts/omnidash.contract.ts` | Broader 14-app product contract derived from `APP_REGISTRY`; not a sidebar contract |

### Locked Sidebar Order

1. OmniBoard
2. PhysiOmni
3. Audits
4. Links
5. Automations
6. Workflows
7. Files
8. Billing
9. Settings

### Explicit Sidebar Exclusions

The following product/platform surfaces must **not** be added to the left sidebar unless the sidebar contract, tests, docs, and drift guards are intentionally changed together:

- OmniSkills
- Orchestrator
- Fortress
- OmniPort
- Maestro
- BYOM

> `OmniSkills` remains valid as a header utility/module access point. Its exclusion applies only to the left sidebar widget rail.

### Change Protocol

1. Write/update failing tests first in `tests/omnidash/omnidash-sidebar-widgets.contract.spec.ts`.
2. Update `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts` as the sole sidebar data source.
3. Keep `packages/core/src/registry.ts` and `src/contracts/omnidash.contract.ts` product-level unless the change is explicitly a product registry change.
4. Run:
   ```bash
   pnpm vitest run tests/omnidash/omnidash-sidebar-widgets.contract.spec.ts tests/omnidash/omnidash-layout-contract.spec.tsx tests/core/app-registry.spec.ts
   pnpm lint
   pnpm typecheck
   npx tsx scripts/omnidash-blast-radius.ts
   ```

## Module Action Boundaries & Gating

To prevent hallucinations and widget drift, backend actions across all OmniDash modules are strictly gated by a central capability map.

- **`moduleActionCapabilities.ts`**: This file is the absolute source of truth for which backend endpoints are allowed per module. Any unsupported action (like `manage_bundles` or an unauthorized `trigger_workflow`) will be structurally rejected by `OmniDashShell` and `handleModuleAction`, preventing broken UI states and phantom backend requests.
- **Module Modal Overlays**: All modules load via the `useOmniModal` state store. Modules do not share FSMs and cannot secretly mount other module FSMs.

## OmniBoard vs. Links (Canonical Definition)

- **OmniBoard**: The **ONE AND ONLY** user-facing UI endpoint for third-party application integration and onboarding. It connects apps via `apex-universal-sync-orchestrator`.
- **Links**: An independent widget **strictly** for collecting URLs to pass as context. It MUST NOT perform app integrations and MUST NOT open the `OmniBoardWizard` or any integration flows.

## Setup
- Ensure Supabase env vars are configured (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Apply migrations: `supabase db push` (or deploy via your CI pipeline).
- Current model: OmniDash is always mounted behind auth routes in `apps/omnihub-site/src/App.tsx`; do not use `OMNIDASH_ENABLED` as an active access-control source.
- Bootstrap admin via `claim_admin_access(secret)` — see `docs/guides/admin-secret-setup.md`.

## Enabling
- No feature flag is required for the current post-auth shell. Access is enforced by `ProtectedRoute` and role-aware module/admin gates where applicable.

## Acceptance Criteria (v1)
- With an authenticated user:
  - `/omnidash`, `/omnidash/pipeline`, `/omnidash/kpis`, `/omnidash/ops` load without errors.
  - Demo Mode redacts names/PII and buckets $ values.
  - Pipeline enforces Next touch unless stage = Lost; “Next touch due” list shows overdue items.
  - KPI table supports add/edit for today; values render on the table.
  - Pages show health timestamp and load quickly (<2s on typical connection).
- Unauthenticated users are redirected/protected by the auth boundary; do not test access by toggling `OMNIDASH_ENABLED`.

## Testing
- Unit: `vitest run tests/omnidash/redaction.spec.ts`.
- Smoke: `vitest run tests/omnidash/route.spec.tsx`.
- Lint/typecheck/build: `npm run lint && npm run build`.

## Manual QA (10-minute checklist)
- Login as an authenticated user with the role needed for the module under test.
- Visit `/omnidash`:
  - Add 3 items, trigger Next Action button, start/stop Power Block, press Restart Ritual (list reduces to 3).
- `/omnidash/pipeline`: create deal with stage ≠ Lost without Next touch (should error), then with date (should save). Verify Next touch due card shows when date is today/past.
- Toggle Demo Mode ON: names redacted, amounts bucketed, PII removed in notes.
- `/omnidash/kpis`: update today’s values, see table reflect numbers (or buckets when demo).
- `/omnidash/ops`: log Sev-1 incident; verify freeze switch note reflects setting.
- Logout or use an unauthenticated session, then confirm `/omnidash` is protected while public routes still work.

## Rollback
- Roll back the deployed artifact or route-level change through the release workflow; `OMNIDASH_ENABLED` is not the current rollback mechanism.

## 📊 Capabilities Snapshot (v1.0)
Based on `src/pages/OmniDash/Today.tsx` and database schema.

### Core Metrics Tracked
- **System Health**: Real-time uptime and error rate monitoring.
- **Revenue**: MRR, churn, and LTV calculations.
- **Pipeline**: Deal flow velocity and conversion rates.
- **Ops**: Incident tracking and rapid response controls.

### Visual Proof
> *[Placeholder for Dashboard Screenshot - Execute `npm run dev` to generate]*

### Integration Points
- **Data Access**: `src/omnidash/api.ts` (Typed API Layer)
- **Security**: Row Level Security (RLS) enabled on all widgets.
- **Edge Functions**: Secure invocation via `supabase/functions/execute-automation`.

## OmniMedia Engine (v1.4.2)

Media playback and caching subsystem integrated into the OmniDash UI.

### Components
- **OmniMediaPlayer** (`apps/omnihub-site/dashboard/components/media/OmniMediaPlayer.tsx`) — Adaptive renderer for audio, video, and embed types.
- **ClientComputeNode** (`apps/omnihub-site/dashboard/components/media/ClientComputeNode.tsx`) — Web Audio API graph compute for audio processing.
- **GlobalMediaDock** (`apps/omnihub-site/dashboard/components/media/GlobalMediaDock.tsx`) — Persistent media player dock UI.
- **UniversalModalEngine** (`apps/omnihub-site/dashboard/components/media/UniversalModalEngine.tsx`) — Schema-driven modal renderer (OAuth, form, selection, confirmation).

### State Management (Zustand)
- **`useOmniMedia`** (`src/stores/omniMediaStore.ts`) — Media playback state with single-stream enforcement and blob URL memory safety.
- **`useOmniModal`** (`src/stores/omniModalStore.ts`) — Modal lifecycle with Zod boundary validation and deterministic teardown.

### Edge Cache Integration
- **LRU Cache Governor** (`lib/media/EdgeCacheController.ts`) — 250 MB ceiling, Cache API + localStorage ledger.
- **CORS Proxy** — Cloudflare Worker (`edge/cors-proxy/edge-cors-proxy.js`) is canonical. Vercel Edge (`api/cors.ts`) is LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical.

