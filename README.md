# Universal Synchronized Orchestrator

```
 █████╗ ██████╗ ███████╗██╗  ██╗  ██████╗ ███╗   ███╗███╗   ██╗██╗██╗  ██╗██╗   ██╗██████╗
██╔══██╗██╔══██╗██╔════╝╚██╗██╔╝ ██╔═══██╗████╗ ████║████╗  ██║██║██║  ██║██║   ██║██╔══██╗
███████║██████╔╝█████╗   ╚███╔╝  ██║   ██║██╔████╔██║██╔██╗ ██║██║███████║██║   ██║██████╔╝
██╔══██║██╔═══╝ ██╔══╝   ██╔██╗  ██║   ██║██║╚██╔╝██║██║╚██╗██║██║██╔══██║██║   ██║██╔══██╗
██║  ██║██║     ███████╗██╔╝ ██╗ ╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║██║  ██║╚██████╔╝██████╔╝
╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝
```

**INTELLIGENCE DESIGNED.**
**_Directable • Accountable • Dependable_**

**Version:** 1.6.0 | **Release Date:** 2026-05-08

[![CI Runtime Gates](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/ci-runtime-gates.yml/badge.svg)](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/ci-runtime-gates.yml)

---

## 🚦 Start Here (Canonical Map)

**Before touching code, read the canonical architecture map:**

- [ARCHITECTURE_CANONICAL_MAP.md](./docs/architecture/ARCHITECTURE_CANONICAL_MAP.md)
- [Production Certification Status (Current)](./docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md)

---

## Overview

APEX OmniHub is the first **Universal Sync Orchestrator** for **governed execution** across ALL modern stacks, AI apps, legacy enterprise systems, and Web3 infrastructure. Think "Anti-OS", it is a "USO": one place to connect fragmented systems, translate universally, enforce policy, and produce an audit trail you can defend.

The platform relies on a "Holy Trinity" architecture:

1.  **OmniHub**: The Universal Sync Orchestrator (Logic & Policy).
2.  **OmniLink**: The Secure Gateway (Connectivity).
3.  **OmniPort**: The Multimodal Normalizer (Input/Output).

> OmniHub's job is simple: **translate intent into deterministic execution**, without lock-in, without chaos, and without silent failure.

---

## Platform Statistics (Repository Snapshot 2026-04-04)

| Metric                                           | Value                                             |
| ------------------------------------------------ | ------------------------------------------------- |
| **Source Files (`src/`)**                        | 283 total files                                   |
| **TypeScript/TSX (`src/`)**                      | 250 files                                         |
| **React Components (`src/`)**                    | 85 `.tsx` component files                         |
| **Page Routes (`src/pages/`)**                   | 33 page files                                     |
| **Edge Functions (`supabase/functions/`)**       | 22 function directories                           |
| **Database Migrations (`supabase/migrations/`)** | 61 SQL migration files                            |
| **CI/CD Workflows (`.github/workflows/`)**       | 14 workflow files                                 |
| **Test Specs (`tests/` + `e2e/` + `sim/`)**     | 157 test specs (`*.test.ts`, `*.spec.ts`)         |
| **Custom Hooks (`src/`)**                        | 17 hook files matching `use*.ts*`                 |
| **Orchestrator (Python)**                        | 83 files (Temporal workers, activities, security) |

---

## What OmniHub Is (and Is Not)

✅ **Is:** A secure orchestration layer + universal translation engine that standardizes execution, policy enforcement, and auditability across your entire stack.

---

## Core Pillars

### 1) Tri-Force Protocol (Governed Autonomy)

A three-tier agent architecture designed to keep unsafe reasoning from reaching production:

| Layer        | Role                             | Implementation             |
| ------------ | -------------------------------- | -------------------------- |
| **Guardian** | Policy & safety evaluation       | `orchestrator/security/`   |
| **Planner**  | Deterministic planning           | `orchestrator/workflows/`  |
| **Executor** | Tool execution with audit trails | `orchestrator/activities/` |

### 2) Orchestrator (Durable Workflows)

**Temporal.io**-backed orchestration for workflows that survive restarts:

- Event sourcing + deterministic replay
- Saga-style compensation patterns
- Idempotent task execution
- Manual Approval Node gates (**MAN Mode** - `supabase/migrations/20260108120000_man_mode.sql`)

### 3) Fortress Protocol (Security & Compliance)

Security is not "a feature." OmniHub enforces:

- **Armageddon Test Suite**: Continuous chaos engineering and red-teaming engine.
- **Zero-trust device registry** (`20251218000001_create_device_registry_table.sql`)
- **Audit logging** (`20251218000000_create_audit_logs_table.sql`)
- **Emergency controls** (`20260103000000_create_emergency_controls.sql`)
- **OMEGA security hardening** (`20260125000001_enable_omega_security.sql`)

### 4) OmniLink & OmniPort (Connectivity & Normalization)

The "Trinity" connectivity layer:

- **OmniLink**: The Secure Gateway for universal connectivity (`20260111000000_omnilink_universal_port.sql`).
- **OmniPort**: The Multimodal Normalizer for standardized I/O and DLQ (`20260124000000_omniport_dlq.sql`).
- **OmniTrace**: Full replay & tracing capability (`20260125000000_omnitrace_replay.sql`).

### 5) Edge Compute Layer (Media & CORS)

Client-side infrastructure for deterministic media delivery:

- **Edge CORS Proxy**: (Historical) (Historical) Vercel Edge Function (`api/cors.ts`) — superseded by Cloudflare Pages Worker (`edge/cors-proxy/edge-cors-proxy.js`).
- **LRU Media Cache**: 250 MB ceiling with localStorage ledger eviction (`lib/media/EdgeCacheController.ts`).
- **Cloudflare Worker**: Stateless CORS proxy at `edge/cors-proxy/edge-cors-proxy.js` for production CDN.
- **Fail-Safe Design**: Every cache miss gracefully degrades to proxy URL — zero silent failures.

### 6) Web3-Native Identity (Optional)

- SIWE (Sign-In with Ethereum) - `supabase/functions/web3-verify/`
- NFT verification - `supabase/functions/verify-nft/`
- Multi-chain support (`20260101000000_create_web3_verification.sql`)
- Chain transaction logging (`20260109120000_create_chain_tx_log.sql`)

---

## Edge Functions (22 Directories in Repository)

| Function                 | Purpose                    |
| ------------------------ | -------------------------- |
| `apex-assistant`         | AI conversation handler    |
| `apex-voice`             | Real-time voice processing |
| `omnilink-agent`         | Agent orchestration        |
| `omnilink-port`          | Universal connector        |
| `trigger-workflow`       | Temporal dispatch          |
| `verify-nft`             | NFT ownership check        |
| `web3-verify`            | SIWE authentication        |
| `send-push-notification` | Mobile push delivery       |
| `lovable-healthcheck`    | Integration health         |
| `execute-automation`     | Workflow execution         |

---

### Runtime and release authority

APEX OmniHub now treats Node 24 as the canonical CI/runtime target, with Node 22 as the minimum supported version. The authoritative release path is npm-based: `npm ci` and `npm run ...`. Bun remains optional for local convenience only; `package-lock.json` is the release lockfile and `bun.lock` is retained for parity evidence, not CI authority. See `docs/runtime/ENTERPRISE_CONTROL_PLANE.md`.

## Repository Layout

```
/src                 - OmniDash UI (277 files)
/dashboard/OmniDashShell.tsx  -  Unified dashboard Shell / layout
/apps/omnihub-site/dashboard/components/  -  Panels/widgets: (Today, Pipeline, KPIs, Ops, etc.)
/src/omnidash/uiRegistry.ts  -   UI registry wiring

/supabase/migrations - Database schema (50+ versioned SQL migrations)
/supabase/functions  - Edge functions (22 serverless endpoints)
/orchestrator        - Temporal workers and orchestration services (83 files)
/tests               - Automated test suite (115 files)
/.github/workflows   - CI/CD workflows (12 pipelines)
```

---

## Quick Start (Local)

### Prerequisites

- Node.js **20.19+** or **22.12+** (required by Vite 7; Node 18 reached EOL April 2025)
- Python 3.10+
- Docker & Docker Compose

### Full Stack — One Command (Recommended)

```bash
cp .env.example .env.local  # Fill in your Supabase credentials
docker compose -f docker-compose.dev.yml up
```

This starts: Frontend (port 8080) + Temporal worker + Temporal UI (port 8233) + Redis.
Supabase runs in the cloud — point `.env.local` to your Supabase project.

### Manual Setup (alternative)

#### 1) Install dependencies

```bash
npm ci
```

#### 2) Run OmniDash (main UI)

```bash
npm run dev
```

#### 3) Run the Orchestrator (Temporal)

```bash
cd orchestrator
pip install -r requirements.txt
python -m main
```

### Docker (production compose)

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## CI / Quality Gates

Run these before any PR:

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript strict mode
npm test           # Vitest suite
npm run build      # Production build
```

### CI/CD Pipelines (Selected Workflows)

| Workflow                | Trigger         | Purpose                      |
| ----------------------- | --------------- | ---------------------------- |
| `ci-runtime-gates`      | PR/Push         | Build, test, lint, typecheck |
| `cd-staging`            | Push to develop | Staging deployment           |
| `deploy-web3-functions` | Push to main    | Edge function deployment     |
| `secret-scanning`       | PR              | Security scanning            |
| `chaos-simulation-ci`   | Scheduled       | Resilience testing           |
| `sonarqube-analysis`    | PR              | Code quality audit           |
| `guardrail-alert`       | CI failure      | Guardrail violation alerting |

---

## Documentation

Full documentation is available in the [`docs/`](./docs/) directory.

| Document                                                                                | Description           |
| --------------------------------------------------------------------------------------- | --------------------- |
| [Release Notes v1.6.0](./docs/releases/RELEASE_NOTES_v1.6.0.md)                 | What is new in v1.6.0 |
| [Executive Architecture Summary](./docs/architecture/EXECUTIVE_ARCHITECTURE_SUMMARY.md) | System design         |
| [Launch Readiness](./docs/project-status/LAUNCH_READINESS_v1.0.0.md)                    | Deployment checklist  |
| [Testing Evidence & Armageddon Reports](./docs/testing/README.md)                    | Validation history    |
| [PR Triage Report](./docs/ops/PR_TRIAGE.md)                                      | Open PR resolution matrix |
| [OPS Runbooks](./OPS_RUNBOOKS.md)                                                       | Operations procedures |
| [Supabase Setup](./SUPABASE_SETUP.md)                                                   | Database config guide |
| [orchestrator/README](./orchestrator/README.md)                                         | Temporal setup        |
| [orchestrator/MAN_MODE](./orchestrator/MAN_MODE.md)                                     | Manual Approval Node     |
| [orchestrator/ARCHITECTURE](./orchestrator/ARCHITECTURE.md)                             | Backend design        |

---

## Contributing (APEX Standard)

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Write tests for your changes
4. Run full gates: `npm test && npm run lint && npm run typecheck && npm run build`
5. Submit a PR

### Non-Negotiables

- **No vendor lock-in** - portable adapters, clean interfaces
- **Single-port integration** - no scattered API calls
- **Idempotent operations** - safe to re-run, easy rollback
- **No secrets in code** - env/config only
- **Observable behavior** - health checks, structured logs

---

## 📄 Documentation

**Proprietary** - © 2026 APEX Business Systems Ltd.

---

```
 █████╗ ██████╗ ███████╗██╗  ██╗
██╔══██╗██╔══██╗██╔════╝╚██╗██╔╝
███████║██████╔╝█████╗   ╚███╔╝
██╔══██║██╔═══╝ ██╔══╝   ██╔██╗
██║  ██║██║     ███████╗██╔╝ ██╗
╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝
Intelligence Designed. Engineering the Impossible.
```
