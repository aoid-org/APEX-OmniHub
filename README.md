---
version: 1.3.3
last_audited: 2026-06-26
status: verified
---

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

**Release line:** 1.8.2 | **package.json version:** 1.8.2 | **App package:** 1.3.10 | **Docs audit:** 2026-06-26

[![CI Runtime Gates](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/ci-runtime-gates.yml/badge.svg)](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/ci-runtime-gates.yml)
[![Orchestrator CI](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/orchestrator-ci.yml/badge.svg)](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/orchestrator-ci.yml)
[![Security Regression Guard](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/security-regression-guard.yml/badge.svg)](https://github.com/apexbusiness-systems/APEX-OmniHub/actions/workflows/security-regression-guard.yml)
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## 🚦 Start Here (Canonical Map)

**Before touching code, read the canonical architecture map:**

- [CURRENT_PLATFORM_STATE_2026_06_25.md](./memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_25.md) — current branch/head assessment, recent git history, drift controls, and repo facts
- [DOCUMENTATION_RELEASE_INDEX.md](./memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md) — current maps, READMEs, status, audits, and runbooks
- [ARCHITECTURE_CANONICAL_MAP.md](./memory/omni-recall/docs/architecture/ARCHITECTURE_CANONICAL_MAP.md)
- **[Production Certification Status](./memory/omni-recall/docs/project-status/release-validation-summary.json)** (Current Production Authority)
- [CI Status Policy](./memory/omni-recall/docs/project-status/CI_STATUS_POLICY.md)

---

## Overview

APEX OmniHub is the first **Universal Sync Orchestrator** for **governed execution** across ALL modern stacks, AI apps, legacy enterprise systems, and Web3 infrastructure. Think "Anti-OS", it is a "USO": one place to connect fragmented systems, translate universally, enforce policy, and produce an audit trail you can defend.

The platform relies on a "Holy Trinity" architecture:

1.  **OmniHub**: The Universal Sync Orchestrator (Logic & Policy).
2.  **OmniLink**: The Secure Gateway (Connectivity).
3.  **OmniPort**: The Multimodal Normalizer (Input/Output).

> OmniHub's job is simple: **translate intent into deterministic execution**, without lock-in, without chaos, and without silent failure.

---

## Platform Statistics (Repository Snapshot 2026-06-26, git-verified)

| Metric                                           | Value                                             |
| ------------------------------------------------ | ------------------------------------------------- |
| **Source Files (`src/`)**                        | 328 TypeScript/TSX files (234 `.ts` + 94 `.tsx`)  |
| **React Components (`src/`)**                    | 94 `.tsx` component files                         |
| **Page Routes (`src/pages/`)**                   | 0 page files; routes live under app/domain folders |
| **Edge Functions (`supabase/functions/`)**       | 33 directories (32 function dirs + `_shared`)     |
| **Database Migrations (`supabase/migrations/`)** | 100 `.sql` files (96 forward + 4 rollback under `migrations/rollback/`) |
| **CI/CD Workflows (`.github/workflows/`)**       | 20 workflow files                                 |
| **Test Specs (`tests/` + `e2e/` + `sim/` + app/orchestrator/package tests)** | 373+ spec/test source files; latest pass counts are recorded in certification status |
| **Custom Hooks (`src/` + app surfaces)**         | 23 hook files matching `use*.ts*` in `src/`       |
| **Orchestrator (Python)**                        | ~107 tracked files (Temporal workers, activities, security; excludes `__pycache__`) |

**Latest repo-history note:** `main` HEAD `e69dd934` — fix(ops-widgets-smoke): remove unused expect import after APEX-2021 skip. Previous session: PR #1488 "chore(cert): Production Hardening Sprint & Codebase Determinism" (`4c0d481`). Release line is **1.8.2** (`package.json`). **Releases are cut manually by the owner** (deliberate version bump via `changeset version` → `chore: version packages`); CI validates and `compliance.yml` attaches SBOM evidence attach-only (gated on the tag already existing — CI can never create a tag). CI does not decide or certify releases. Owner-approved certification: [`docs/release/owner-approved/PRODUCTION_CERTIFICATION_2026_06_24.md`](./docs/release/owner-approved/PRODUCTION_CERTIFICATION_2026_06_24.md). **Law: CI validates. Owner certifies.** Active dev branch: `claude/gallant-newton-5d57b0` — 2026-06-26 session: CLS fix (removed `content-visibility: auto` / `contain-intrinsic-size` from platform map host; was causing 100px layout jump for first-time visitors); WCAG AA contrast fix for `--omni-t3` tokens (light: `#64748b`→`#5e6c7e`, dark: `#475569`→`#7c8b9c`). Workflow count: **20**. Edge function dirs: **33** (32 + `_shared`). See [`CURRENT_PLATFORM_STATE_2026_06_25.md`](./memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_25.md) for the last full platform state assessment.

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

## Edge Functions (33 Directories in Repository, including `_shared`)

| Function                 | Purpose                    |
| ------------------------ | -------------------------- |
| `apex-assistant`         | AI handler (deprecated — returns 410, use apex-agent) |
| `apex-voice`             | Real-time voice processing |
| `apex-agent`             | APEX Agent — primary AI orchestration endpoint |
| `omnilink-port`          | Universal connector        |
| `trigger-workflow`       | Temporal dispatch          |
| `verify-nft`             | NFT ownership check        |
| `web3-verify`            | SIWE authentication        |
| `send-push-notification` | Mobile push delivery       |
| `ops-voice-health`       | Ops voice health check     |
| `execute-automation`     | Workflow execution         |

---


### Runtime and release authority

APEX OmniHub requires **Node.js 22+** (Node 22 LTS recommended; Node 24 also supported; supported range `>=22 <25`). **npm** is the authoritative package manager for CI, releases, and the canonical lockfile (`package-lock.json`). Use `npm ci` for clean installs in CI. bun is optional for local development — `bun install` or `bun run` may be used for speed, but `bun.lock` is not relied on by CI. Both `bun.lock` (local bun users) and `package-lock.json` (CI canonical; required by `npm audit`) are committed. Python 3.11+ is required for orchestrator services. See CLAUDE.md §2 for the full policy.

## Repository Layout

```
/src                 - Core frontend/domain source tree (328 files: 234 .ts + 94 .tsx)
/dashboard/OmniDashShell.tsx  -  Unified dashboard Shell / layout
/apps/omnihub-site/dashboard/components/  -  Panels/widgets: (Today, Pipeline, KPIs, Ops, etc.)
/src/omnidash/uiRegistry.ts  -   UI registry wiring

/supabase/migrations - Database schema (100 .sql files: 96 forward + 4 rollback)
/supabase/functions  - Edge functions (32 function directories + _shared = 33 total)
/orchestrator        - Temporal workers and orchestration services (~107 Python files)
/tests               - Automated test suite
/.github/workflows   - CI/CD workflows (20 workflow files)
```

---

## Canonical UI Boundaries & Widget Truth

To maintain strict architecture safety and prevent "widget drift" across the platform, the following product laws apply globally to OmniDash and must **never** be violated:

✅ **OmniBoard**: The **ONE AND ONLY** user-facing UI endpoint for third-party application integration and onboarding. It connects 3rd-party apps and AI models deterministically via the `apex-universal-sync-orchestrator`.
❌ **Links**: An independent widget **strictly** for collecting URLs to pass as context. It must **never** route to OmniBoard, and must **never** perform app integrations.
✅ **Module Boundaries**: All OmniDash sidebar modules must load as distinct modal overlays using the `useOmniModal` state store. No widget may silently mount another widget's FSM (e.g. Links cannot mount OmniBoardWizard).
✅ **Action Gating**: Action execution across modules is governed by a **module-keyed capability map** (`moduleActionCapabilities.ts`), keyed by `moduleKey + actionId` and covering both baseline and live action ids. Unsupported actions fail-closed at the UI shell with **module-specific copy** and never call `trigger-workflow` (PR #1441). Labels that arrive as raw ids or contain underscores are humanized (`create_workflow` → `Create Workflow`) without implying the action is wired.

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

| Workflow                        | Trigger         | Purpose                      |
| ------------------------------- | --------------- | ---------------------------- |
| `ci-runtime-gates`              | PR/Push         | Build, test, lint, typecheck |
| `cd-staging`                    | Push to develop | Staging deployment           |
| `deploy-web3-functions`         | Push to main    | Edge function deployment     |
| `secret-scanning`               | PR              | Security scanning            |
| `chaos-simulation-ci`           | Scheduled       | Resilience testing           |
| `alert-guard-rail-violation`    | CI failure      | Guardrail violation alerting |
| `integration`                   | Push to main/work/develop | Integration E2E harness |
| `security-regression-guard`     | PR/Push         | Security + dependency guards |
| `orchestrator-ci`               | Push            | Orchestrator Python test suite |

---

## Documentation

Full documentation is available in the [`docs/`](./memory/omni-recall/docs/) directory.

| Document                                                                                | Description           |
| --------------------------------------------------------------------------------------- | --------------------- |
| [Current Platform State](./memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_06_25.md)             | Current branch/head assessment and drift-control facts |
| [Release Notes v1.6.0](./memory/omni-recall/docs/releases/RELEASE_NOTES_v1.6.0.md)                 | Historical v1.6.0 release notes |
| [Executive Architecture Summary](./memory/omni-recall/docs/architecture/EXECUTIVE_ARCHITECTURE_SUMMARY.md) | System design         |
| [Production Certification Status](./memory/omni-recall/docs/project-status/release-validation-summary.json) | Current certification authority |
| [Documentation Release Index](./memory/omni-recall/docs/DOCUMENTATION_RELEASE_INDEX.md)                  | Current docs map, READMEs, status, audits, runbooks |
| [Testing Evidence & Armageddon Reports](./memory/omni-recall/docs/testing/README.md)                    | Validation history    |
| [PR Triage Report](./memory/omni-recall/docs/ops/PR_TRIAGE.md)                                      | Open PR resolution matrix |
| [OPS Runbooks](./memory/omni-recall/docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md)                               | Operations procedures |
| [Supabase Setup](./memory/omni-recall/docs/infrastructure/SUPABASE_SETUP.md)                               | Database config guide |
| [orchestrator/README](./orchestrator/README.md)                                         | Temporal setup        |
| [orchestrator/MAN_MODE](./orchestrator/MAN_MODE.md)                                     | Manual Approval Node     |
| [orchestrator/ARCHITECTURE](./orchestrator/ARCHITECTURE.md)                             | Backend design        |

---

## Canonical E2E Testing Truth (APEX Build Doctrine)

To prevent test rot, rogue agent edits, and signal inversion (e.g., masking product bugs to achieve green CI), the following rules apply to all E2E testing:

1. **Test Integrity over Green CI**: `test.fail()` is banned. A test suite must be green *and* provably able to go red against a real backend. Never skip a failing test just to pass a CI gate.
2. **Strict Skip/Fixme Vocabulary**: `test.skip()` and `test.fixme()` are only permitted if they carry a formal tracking ID (e.g., `BLOCKED(APEX-1xxx): <reason>`). Generic skips or "PARTIAL PASS" verdicts are banned.
3. **Identity-Tested Modals**: Modals cannot be asserted using generic locators (e.g., `[role="dialog"]`). They must use `assertModalIdentityAndIsolation` to prove rendering fidelity, isolation (no overlapping z-index issues), and portal-mount stability.
4. **No Real DB Mocks**: The E2E suite requires a live backend (e.g. `apex-omnihub-e2e`). Auth tests rely on genuine session acquisition (`signInWithSupabaseSession`), not UI bypasses.
5. **Idempotent Seed Harness**: CI setup uses an Admin client to dynamically seed tests (creating test users, files, and `workflows`), ensuring clean run-state separation and proper RLS/append-only audit verification. 
6. **Responsive Modal Traps**: Universal Modals (like BYOM) use `<sm` responsive overrides (e.g., `w-[calc(100%-2rem)] max-w-md mx-auto`) to avoid off-canvas rendering on mobile viewports like iPads.
7. **PWA Hydration Stability**: PWA install logic relies on `window.__deferredPWAEvent` capture in `index.html` to prevent `beforeinstallprompt` race conditions during React hydration.

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

---

# APEX Bible Governance

# APEX Bible Complete Package

Version: **1.1.0**
Canonical governance package for APEX-level builds.

> **Single nav:** see [`governance/INDEX.md`](governance/INDEX.md).
> **Doctrine:** see [`governance/doctrine/APEX_BUILD_DOCTRINE.md`](governance/doctrine/APEX_BUILD_DOCTRINE.md).

---

## What This Locks In

- canonical build doctrine (13 principles)
- architecture review gates + merge-rights policy
- RFC template + usage policy
- CI policy gates (with a working policy-check script, not placeholders)
- secret scanning (gitleaks), dependency vuln scan (osv-scanner), SAST (CodeQL)
- service tiers (T1–T4) with SLOs and error budgets
- data classification (P0–P4) + privacy SLAs
- FinOps tags + budget tiers + AI cost caps
- release management + API versioning + deprecation lifecycle
- supply-chain controls (SBOM, signing, vendor review)
- DR (RPO/RTO) + on-call SLAs + postmortem + runbook templates
- threat model template (STRIDE + AI-specific)
- incident disclosure SLAs (PIPEDA/GDPR-aware)
- AI governance: prompt, kill switch, evaluation policy
- engineering onboarding with two scored merge-rights exercises
- 100-point build rubric + per-category scoring guide

## Drop-In Install

Copy this package into the root of your repository:

```text
/.github
/governance
/CHANGELOG.md
/CONTRIBUTING.md
/LICENSE
/Makefile
/README.md
/SECURITY.md
/package_manifest.json
```

## Implementation Order (Day 1)

1. Commit [`governance/doctrine/APEX_BUILD_DOCTRINE.md`](governance/doctrine/APEX_BUILD_DOCTRINE.md).
2. Enable [`.github/workflows/apex-governance.yml`](.github/workflows/apex-governance.yml). Mark the `governance-gate` job as a **required status check** in branch protection.
3. Require PRs to use [`.github/pull_request_template.md`](.github/pull_request_template.md).
4. Add reviewers in [`.github/CODEOWNERS`](.github/CODEOWNERS) (adjust team handles to match your org).
5. Require architecture review before granting merge rights (see [`governance/architecture/MERGE_RIGHTS_POLICY.md`](governance/architecture/MERGE_RIGHTS_POLICY.md)).
6. Install [`governance/ai/AI_AGENT_SYSTEM_PROMPT.md`](governance/ai/AI_AGENT_SYSTEM_PROMPT.md) into all internal AI agents.
7. Run `make apex-policy` locally to confirm green.

## Implementation Order (Week 1)

8. Classify every data store per [`governance/data/DATA_CLASSIFICATION.md`](governance/data/DATA_CLASSIFICATION.md).
9. Tag every cloud resource per [`governance/finops/COST_BUDGET_POLICY.md`](governance/finops/COST_BUDGET_POLICY.md).
10. Assign each service a tier per [`governance/release/RELEASE_POLICY.md`](governance/release/RELEASE_POLICY.md).
11. Declare SLOs per [`governance/observability/SLO_POLICY.md`](governance/observability/SLO_POLICY.md).
12. Write runbooks for the top-5 alerts per T1/T2 service using [`governance/ops/RUNBOOK_TEMPLATE.md`](governance/ops/RUNBOOK_TEMPLATE.md).
13. Verify kill switches per [`governance/ai/AI_KILL_SWITCH.md`](governance/ai/AI_KILL_SWITCH.md) for every production AI feature.

## Mandatory Rule

No feature, AI-generated change, refactor, or infrastructure update may merge unless it preserves:

- user workflow clarity
- modularity
- idempotency
- observability
- rollback capability
- domain boundaries
- regression resistance
- overload resistance
- data classification compliance
- cost attribution
- AI kill-switch availability

## Local Commands

```sh
make apex-policy        # run policy check (human-readable)
make apex-policy-json   # run policy check (JSON report)
make apex-validate      # validate package structure + manifest
make apex-verify        # full local validation (policy + structure)
make apex-install       # print install instructions for a target repo
make apex-zip           # build distributable zip
```

## Versioning

This package follows SemVer. See [`CHANGELOG.md`](CHANGELOG.md).
Contribute via [`CONTRIBUTING.md`](CONTRIBUTING.md).
Report security issues per [`SECURITY.md`](SECURITY.md).
