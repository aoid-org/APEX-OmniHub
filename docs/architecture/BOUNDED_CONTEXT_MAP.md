# Bounded-Context Engineering Map

> **Version:** 1.0.0
> **Status:** Canonical
> **Purpose:** Provides a practical mapping of operational domains, handoff boundaries, and canonical directories for contributors.

## 1. Frontend Control Plane
- **Purpose:** Primary user interface, auth routing, OmniDash layout, and client-side logic.
- **Primary Directories:**
  - `apps/omnihub-site/` (Core application React tree)
  - `src/` (Root package shim and shared UI state)
- **Primary Entrypoints:** `apps/omnihub-site/src/main.tsx`, `src/App.tsx`
- **Expected Quality Gates:** `npm run lint`, `npm run typecheck`, `npm run check:react`, `npm run build`
- **Handoff Boundaries:** Calls out to Edge Functions via Supabase Client; relies on edge for sensitive logic.
- **Canonical Docs:** `docs/architecture/frontend-map.md`, `docs/architecture/CANONICAL_TRUTH.md`

## 2. Edge / API Plane
- **Purpose:** Serverless execution layer for secure logic, CORS proxies, external API orchestration, and OmniBridge integrations.
- **Primary Directories:**
  - `supabase/functions/` (Edge functions)
  - `functions/api/omnibridge/` (Cloudflare Pages Functions for ingest/sync)
- **Primary Entrypoints:** `index.ts` inside each edge function folder.
- **Expected Quality Gates:** `tsc --noEmit` and Deno-compatible ES module checks.
- **Handoff Boundaries:** Translates HTTP requests into Temporal Workflows or direct database actions via Supabase RPC.
- **Canonical Docs:** `docs/platform/OMNIPORT_API_REFERENCE.md`

## 3. Data / Migrations Plane
- **Purpose:** Persistent state, Row Level Security (RLS) enforcement, schema definition, and stored procedures.
- **Primary Directories:**
  - `supabase/migrations/` (Version-controlled SQL)
- **Primary Entrypoints:** Sequential `.sql` migration files applied via `supabase db push`.
- **Expected Quality Gates:** Migration drift checks, RLS Posture Gate in CI, DB schema validation in Armageddon Suite.
- **Handoff Boundaries:** Serves as the single source of truth for durable state. No direct mutation except via Edge Functions or Orchestrator actions.
- **Canonical Docs:** `docs/infrastructure/SUPABASE_SETUP.md`

## 4. Workflow (Temporal) Orchestrator Plane
- **Purpose:** Python-based state machine for durable, idempotent workflows and compensations.
- **Primary Directories:**
  - `orchestrator/` (Temporal Python worker and API)
- **Primary Entrypoints:** `orchestrator/main.py` (worker), `orchestrator/server.py` (API interface)
- **Expected Quality Gates:** `npm run lint:py` (Ruff), `npm run test:py` (Pytest).
- **Handoff Boundaries:** Dispatched from Edge Functions; executes Python activities that communicate with external APIs and Data Plane.
- **Canonical Docs:** `orchestrator/README.md`, `orchestrator/ARCHITECTURE.md`

## 5. Web3 / Contracts Plane
- **Purpose:** Blockchain identity (SIWE) and smart contracts (NFT verification).
- **Primary Directories:**
  - `contracts/` (Hardhat configurations)
  - `supabase/functions/verify-nft/`
- **Primary Entrypoints:** `hardhat.config.cts`, deployment scripts in `scripts/hardhat/deploy.ts`.
- **Expected Quality Gates:** `npm run hardhat:test`, `npm run hardhat:compile`.
- **Handoff Boundaries:** Provides authenticated wallet addresses to Edge Plane to establish session or grant permissions.
- **Canonical Docs:** `docs/guides/WEB3_VERIFICATION_RUNBOOK.md`

## 6. Infrastructure / IaC Plane
- **Purpose:** Declarative cloud resource provisioning.
- **Primary Directories:**
  - `terraform/`
- **Primary Entrypoints:** `main.tf` files within modules.
- **Expected Quality Gates:** Terraform Expression Drift Gate (`npm run test:infra:coverage`).
- **Handoff Boundaries:** Provisions resources that other planes use (e.g. Cloudflare configurations, rate limits).
- **Canonical Docs:** `docs/infrastructure/PRODUCTION_DEPLOYMENT_GUIDE.md`

## 7. Mobile Wrapper Plane
- **Purpose:** Native app bridging using Capacitor.
- **Primary Directories:**
  - `ios/`
  - `android/`
- **Primary Entrypoints:** Capacitor sync scripts.
- **Expected Quality Gates:** Mobile Build Verification (runs in CI via `cap sync`).
- **Handoff Boundaries:** Wraps the Frontend Control Plane in a Webview, bridging physical device APIs (biometrics, push).
- **Canonical Docs:** `docs/guides/NATIVE_PUSH_SETUP.md`
