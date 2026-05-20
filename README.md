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

**Release line:** 1.6.3 (target) | **package.json version:** 1.6.0 | **Changeset for 1.6.1 pending** | **Release Date:** 2026-05-11 | **Docs audit:** 2026-05-20

[![CI Runtime Gates](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/ci-runtime-gates.yml/badge.svg)](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/ci-runtime-gates.yml)
[![Production Readiness Gate](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/production-readiness.yml/badge.svg)](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/production-readiness.yml)
[![Orchestrator CI](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/orchestrator-ci.yml/badge.svg)](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/orchestrator-ci.yml)
[![Security Regression Guard](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/security-regression-guard.yml/badge.svg)](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/security-regression-guard.yml)
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## 🚦 Start Here (Canonical Map)

**Before touching code, read the canonical architecture map:**

- [DOCUMENTATION_RELEASE_INDEX.md](./docs/DOCUMENTATION_RELEASE_INDEX.md) — current maps, READMEs, status, audits, and runbooks
- [ARCHITECTURE_CANONICAL_MAP.md](./docs/architecture/ARCHITECTURE_CANONICAL_MAP.md)
- **[Production Certification Status](./docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md)** (Current Production Authority)
- [CI Status Policy](./docs/project-status/CI_STATUS_POLICY.md)

---

## Overview

APEX OmniHub is the first **Universal Sync Orchestrator** for **governed execution** across ALL modern stacks, AI apps, legacy enterprise systems, and Web3 infrastructure. Think "Anti-OS", it is a "USO": one place to connect fragmented systems, translate universally, enforce policy, and produce an audit trail you can defend.

The platform relies on a "Holy Trinity" architecture:

1.  **OmniHub**: The Universal Sync Orchestrator (Logic & Policy).
2.  **OmniLink**: The Secure Gateway (Connectivity).
3.  **OmniPort**: The Multimodal Normalizer (Input/Output).

> OmniHub's job is simple: **translate intent into deterministic execution**, without lock-in, without chaos, and without silent failure.

---

## Platform Statistics (Repository Snapshot 2026-05-16)

| Metric                                           | Value                                             |
| ------------------------------------------------ | ------------------------------------------------- |
| **Source Files (`src/`)**                        | 346 total files                                   |
| **TypeScript/TSX (`src/`)**                      | 311 files                                         |
| **React Components (`src/`)**                    | 94 `.tsx` component files                         |
| **Page Routes (`src/pages/`)**                   | 0 page files; routes live under app/domain folders |
| **Edge Functions (`supabase/functions/`)**       | 27 function directories                           |
| **Database Migrations (`supabase/migrations/`)** | 74 SQL migration files                            |
| **CI/CD Workflows (`.github/workflows/`)**       | 21 workflow files                                 |
| **Test Specs (`tests/` + `e2e/` + `sim/`)**     | 229 spec/test source files; latest pass counts are recorded in certification status |
| **Custom Hooks (`src/`)**                        | 21 hook files matching `use*.ts*`                 |
| **Orchestrator (Python)**                        | 95 files (Temporal workers, activities, security) |

---

## What OmniHub Is (and Is Not)

✅ **Is:** A secure orchestration layer + universal translation engine that standardizes execution, policy enforcement, and auditability across your entire stack.

---

## Core Pillars

### 1) Tri-Force Protocol (Governed Autonomy)

A 3-tier agent architecture designed to keep unsafe reasoning from reaching production:

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

- **Edge CORS Proxy**: **[LEGACY]** Vercel Edge Function (`api/cors.ts`) — historical only, superseded by Cloudflare Pages Worker (`edge/cors-proxy/edge-cors-proxy.js`). Retained for reference; Cloudflare-first topology is canonical.
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

APEX OmniHub requires **Node.js 22+** (Node 22 LTS recommended; Node 24 also supported; supported range `>=22 <25`). **npm** is the authoritative package manager for CI, releases, and the canonical lockfile (`package-lock.json`). Use `npm ci` for clean installs in CI. bun is optional for local development — `bun install` or `bun run` may be used for speed, but `bun.lock` is not relied on by CI. Both `bun.lock` (local bun users) and `package-lock.json` (CI canonical; required by `npm audit`) are committed. Python 3.11+ is required for orchestrator services. See CLAUDE.md §2 for the full policy.

## Repository Layout

```
/src                 - Core frontend/domain source tree (346 files)
/dashboard/OmniDashShell.tsx  -  Unified dashboard Shell / layout
/apps/omnihub-site/dashboard/components/  -  Panels/widgets: (Today, Pipeline, KPIs, Ops, etc.)
/src/omnidash/uiRegistry.ts  -   UI registry wiring


/supabase/migrations - Database schema (74 versioned SQL migrations)
/supabase/functions  - Edge functions (27 serverless endpoints)
/orchestrator        - Temporal workers and orchestration services (95 Python files)
/tests               - Automated test suite
/.github/workflows   - CI/CD workflows (21 workflow files)
```

---

## Quick Start (Local)

### Prerequisites

- Node.js **22+** (Node 22 LTS recommended; Node 24 also supported; range `>=22 <25`)
- Python **3.11+**
- Docker & Docker Compose

### Full Stack — One Command (Recommended)

```bash
cp .env.example .env.local  # Fill in your Supabase credentials
docker compose -f docker-compose.dev.yml up
```

This starts: Frontend (port 8080) + Temporal worker + Temporal UI (port 8233) + Redis.
Supabase runs in the cloud — point `.env.local` to your Supabase project. Browser builds require `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY` or legacy `VITE_SUPABASE_ANON_KEY`; CI/production builds fail closed when they are missing. For local UI-only work without Supabase, set `APEX_ALLOW_MISSING_SUPABASE_CONFIG=true`.

### Manual Setup (alternative)

#### 1) Install dependencies

```bash
npm ci
# or, for local dev speed: bun install
```

#### 2) Run OmniDash (main UI)

```bash
npm run dev
# or, for local dev speed: bun run dev
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

### Deployment Targets

| Slot | URL | Notes |
|---|---|---|
| Production | https://apexomnihub.icu | Cloudflare Pages — canonical production |
| Shadow | https://apex-omnihub-shadow.pages.dev | Shadow slot provisioned 2026-05-20 |

---

## CI / Quality Gates

Run these before any PR:

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript strict mode
npm run test       # Vitest suite
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
| [Production Certification Status](./docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md) | Current certification authority |
| [Documentation Release Index](./docs/DOCUMENTATION_RELEASE_INDEX.md)                  | Current docs map, READMEs, status, audits, runbooks |
| [Testing Evidence & Armageddon Reports](./docs/testing/README.md)                    | Validation history    |
| [PR Triage Report](./docs/ops/PR_TRIAGE.md)                                      | Open PR resolution matrix |
| [OPS Runbooks](./docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md)                               | Operations procedures |
| [Supabase Setup](./docs/infrastructure/SUPABASE_SETUP.md)                               | Database config guide |
| [orchestrator/README](./orchestrator/README.md)                                         | Temporal setup        |
| [orchestrator/MAN_MODE](./orchestrator/MAN_MODE.md)                                     | Manual Approval Node     |
| [orchestrator/ARCHITECTURE](./orchestrator/ARCHITECTURE.md)                             | Backend design        |

---

## Contributing (APEX Standard)

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Write tests for your changes
4. Run full gates: `npm run test && npm run lint && npm run typecheck && npm run build`
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
