<!-- APEX_DOC_STAMP: VERSION=v8.1-EDGE-COMPUTE | LAST_UPDATED=2026-03-01 -->
# OmniDash (Founder/Sales Dashboard)

## Setup
- Ensure Supabase env vars are configured (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Apply migrations: `supabase db push` (or deploy via your CI pipeline).
- Set feature flag to enable internally: `OMNIDASH_ENABLED=1` (or `VITE_OMNIDASH_ENABLED=1`). Keep it OFF by default.
- Bootstrap admin via `claim_admin_access(secret)` — see `docs/guides/admin-secret-setup.md`.

## Enabling
- Turn on `OMNIDASH_ENABLED` only for internal admins until stability is confirmed. Access is role-gated to `admin` via `public.user_roles` (DB-only, no env allowlist).

## Acceptance Criteria (v1)
- With `OMNIDASH_ENABLED=1` and admin user:
  - `/omnidash`, `/omnidash/pipeline`, `/omnidash/kpis`, `/omnidash/ops` load without errors.
  - Demo Mode redacts names/PII and buckets $ values.
  - Pipeline enforces Next touch unless stage = Lost; “Next touch due” list shows overdue items.
  - KPI table supports add/edit for today; values render on the table.
  - Pages show health timestamp and load quickly (<2s on typical connection).
- With `OMNIDASH_ENABLED=0`: OmniDash routes are inaccessible (404/redirect) without impacting other routes.

## Testing
- Unit: `vitest run tests/omnidash/redaction.spec.ts`.
- Smoke: `vitest run tests/omnidash/route.spec.tsx`.
- Lint/typecheck/build: `npm run lint && npm run build`.

## Manual QA (10-minute checklist)
- Enable flag (`OMNIDASH_ENABLED=1`), login as admin.
- Visit `/omnidash`:
  - Add 3 items, trigger Next Action button, start/stop Power Block, press Restart Ritual (list reduces to 3).
- `/omnidash/pipeline`: create deal with stage ≠ Lost without Next touch (should error), then with date (should save). Verify Next touch due card shows when date is today/past.
- Toggle Demo Mode ON: names redacted, amounts bucketed, PII removed in notes.
- `/omnidash/kpis`: update today’s values, see table reflect numbers (or buckets when demo).
- `/omnidash/ops`: log Sev-1 incident; verify freeze switch note reflects setting.
- Turn flag OFF, confirm `/omnidash` is inaccessible while other routes still work.

## Rollback
- Set `OMNIDASH_ENABLED=0` and redeploy.

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

## OmniMedia Engine (v1.3.8)

Media playback and caching subsystem integrated into the OmniDash UI.

### Components
- **OmniMediaPlayer** (`src/components/omnidash/media/OmniMediaPlayer.tsx`) — Adaptive renderer for audio, video, and embed types.
- **ClientComputeNode** (`src/components/omnidash/media/ClientComputeNode.tsx`) — Web Audio API graph compute for audio processing.
- **GlobalMediaDock** (`src/components/omnidash/media/GlobalMediaDock.tsx`) — Persistent media player dock UI.
- **UniversalModalEngine** (`src/components/omnidash/media/UniversalModalEngine.tsx`) — Schema-driven modal renderer (OAuth, form, selection, confirmation).

### State Management (Zustand)
- **`useOmniMedia`** (`src/stores/omniMediaStore.ts`) — Media playback state with single-stream enforcement and blob URL memory safety.
- **`useOmniModal`** (`src/stores/omniModalStore.ts`) — Modal lifecycle with Zod boundary validation and deterministic teardown.

### Edge Cache Integration
- **LRU Cache Governor** (`lib/media/EdgeCacheController.ts`) — 250 MB ceiling, Cache API + localStorage ledger.
- **CORS Proxy** — Dual-layer: Vercel Edge (`api/cors.ts`) + Cloudflare Worker (`edge/cors-proxy/edge-cors-proxy.js`).

