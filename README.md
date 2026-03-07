# APEX OmniHub

```
 █████╗ ██████╗ ███████╗██╗  ██╗  ██████╗ ███╗   ███╗███╗   ██╗██╗██╗  ██╗██╗   ██╗██████╗
██╔══██╗██╔══██╗██╔════╝╚██╗██╔╝ ██╔═══██╗████╗ ████║████╗  ██║██║██║  ██║██║   ██║██╔══██╗
███████║██████╔╝█████╗   ╚███╔╝  ██║   ██║██╔████╔██║██╔██╗ ██║██║███████║██║   ██║██████╔╝
██╔══██║██╔═══╝ ██╔══╝   ██╔██╗  ██║   ██║██║╚██╔╝██║██║╚██╗██║██║██╔══██║██║   ██║██╔══██╗
██║  ██║██║     ███████╗██╔╝ ██╗ ╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║██║  ██║╚██████╔╝██████╔╝
╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝
```

**INTELLIGENCE DESIGNED.**
_Directable • Accountable • Dependable_

**Version:** 1.2.1 | **Release Date:** 2026-02-20

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Security](https://img.shields.io/badge/security-zero--trust-blue)]()
[![SonarQube](https://img.shields.io/badge/sonarqube-A-success)]()
[![Tests](https://img.shields.io/badge/tests-597%20pass-brightgreen)]()
[![Armageddon](https://img.shields.io/badge/armageddon-L7%20CERTIFIED-gold)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## Overview

APEX OmniHub is the enterprise **AI orchestration control plane** for **governed execution** across ALL modern stacks, AI apps, legacy enterprise systems, and Web3 infrastructure. Think "control tower": one place to connect, translate, enforce policy, and produce an audit trail you can defend.

The platform relies on a "Holy Trinity" architecture:

1.  **OmniHub**: The Central Control Plane (Logic & Policy).
2.  **OmniLink**: The Secure Gateway (Connectivity).
3.  **OmniPort**: The Multimodal Normalizer (Input/Output).

> OmniHub's job is simple: **translate intent into deterministic execution**, without lock-in, without chaos, and without silent failure.

---

## Platform Statistics (Verified)

| Metric                  | Value                                     |
| ----------------------- | ----------------------------------------- |
| **Source Files**        | 234+ TypeScript/React files               |
| **React Components**    | 28+ production components                 |
| **Edge Functions**      | 18 Supabase serverless functions          |
| **Database Migrations** | 35 versioned SQL schemas                  |
| **CI/CD Pipelines**     | 10 GitHub Actions workflows               |
| **Test Files**          | 59 test specifications                    |
| **Integration Modules** | 4 (Maestro, OmniLink, OmniPort, Supabase) |

---

## What OmniHub Is (and Is Not)

✅ **Is:** A secure orchestration layer + universal translation engine that standardizes execution, policy enforcement, and auditability across your entire stack.

❌ **Is not:** "Just a connector library" or "another iPaaS." OmniHub is designed to be _operationally credible_ (SRE-ready), _compliance-friendly_, and _portable_.

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
- Human approval gates (**MAN Mode** — `supabase/migrations/20260108120000_man_mode.sql`)

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

### 5) Web3-Native Identity (Optional)

- SIWE (Sign-In with Ethereum) — `supabase/functions/web3-verify/`
- NFT verification — `supabase/functions/verify-nft/`
- Multi-chain support (`20260101000000_create_web3_verification.sql`)
- Chain transaction logging (`20260109120000_create_chain_tx_log.sql`)

---

## Edge Functions (18 Deployed)

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

## Repository Layout

```
/src                 — OmniDash UI (234 files, 28 components)
/supabase/migrations — Database schema (35 versioned migrations)
/supabase/functions  — Edge functions (18 serverless endpoints)
/orchestrator        — Temporal workers (Python, 55 files)
/apps/omnihub-site   — Marketing site (Vite)
/tests               — Test suite (59 specifications)
/.github/workflows   — CI/CD pipelines (10 workflows)
```

---

## Quick Start (Local)

### Prerequisites

- Node.js **18+** (20+ recommended)
- Python 3.10+
- Docker & Docker Compose

### 1) Install dependencies

```bash
bun install
```

### 2) Run OmniDash (main UI)

```bash
bun run dev
```

### 3) Run the Orchestrator (Temporal)

```bash
cd orchestrator
pip install -r requirements.txt
python -m main
```

### 4) Docker (production compose)

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## CI / Quality Gates

Run these before any PR:

```bash
bun run lint       # ESLint
bun run typecheck  # TypeScript strict mode
bun test           # Vitest suite
bun run build      # Production build
```

### CI/CD Pipelines (8 Workflows)

| Workflow                | Trigger         | Purpose                      |
| ----------------------- | --------------- | ---------------------------- |
| `ci-runtime-gates`      | PR/Push         | Build, test, lint, typecheck |
| `cd-staging`            | Push to develop | Staging deployment           |
| `deploy-web3-functions` | Push to main    | Edge function deployment     |
| `secret-scanning`       | PR              | Security scanning            |
| `chaos-simulation-ci`   | Scheduled       | Resilience testing           |
| `sonarqube-analysis`    | PR              | Code quality audit           |

---

## Documentation

Full documentation is available in the [`docs/`](./docs/) directory.

| Document                                                                                | Description          |
| --------------------------------------------------------------------------------------- | -------------------- |
| [Executive Architecture Summary](./docs/architecture/EXECUTIVE_ARCHITECTURE_SUMMARY.md) | System design        |
| [Launch Readiness](./docs/project-status/LAUNCH_READINESS_v1.0.0.md)                    | Deployment checklist |
| [orchestrator/README](./orchestrator/README.md)                                         | Temporal setup       |
| [orchestrator/MAN_MODE](./orchestrator/MAN_MODE.md)                                     | Human-in-the-loop    |
| [orchestrator/ARCHITECTURE](./orchestrator/ARCHITECTURE.md)                             | Backend design       |

---

## Contributing (APEX Standard)

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Write tests for your changes
4. Run full gates: `bun test && bun run lint && bun run typecheck && bun run build`
5. Submit a PR

### Non-Negotiables

- **No vendor lock-in** — portable adapters, clean interfaces
- **Single-port integration** — no scattered API calls
- **Idempotent operations** — safe to re-run, easy rollback
- **No secrets in code** — env/config only
- **Observable behavior** — health checks, structured logs

---

## 📄 Documentation

**Proprietary** — © 2026 APEX Business Systems Ltd.

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
