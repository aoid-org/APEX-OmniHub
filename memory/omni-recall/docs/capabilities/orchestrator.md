---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-05-20 -->
# Orchestrator

**Central command for workflows**

---

## What this is in the repository

The Orchestrator capability is implemented as a dedicated Python service in the `orchestrator/` directory. It uses Temporal workflows and a saga-based compensation model to execute multi-step plans with deterministic replay.

This page documents the concrete modules and behaviors present in the codebase.

---

## Execution model

**Workflow engine**

- Temporal workflows are defined in `orchestrator/workflows/agent_saga.py`.
- The workflow explicitly documents event sourcing, saga compensation, and deterministic execution constraints (no network or LLM calls inside the workflow; those must be activities).
- DAG execution is supported for independent steps via topological ordering and `asyncio.gather`.

**Compensation model**

- `SagaContext` tracks compensation steps and executes them in LIFO order on rollback.
- Compensation execution is best-effort with logging and does not block rollback if a step fails.

**Files**
- `orchestrator/workflows/agent_saga.py`

---

## Data contracts

- The orchestrator imports typed event models from `orchestrator/models/events.py` to represent workflow events and their evolution.
- Idempotency keys for MAN Mode escalation are built using `orchestrator/models/man_mode.py`.

**Files**
- `orchestrator/models/events.py`
- `orchestrator/models/man_mode.py`

---

## Local development assets

- `orchestrator/docker-compose.yml` provides the local stack for Temporal and Redis.
- `orchestrator/main.py` is the CLI entry point for running a worker or submitting workflows.

---

## Production deployment & browser wiring (verified 2026-06-20)

- **Hosting:** Render, not Cloudflare. Two services, both `rootDir: orchestrator`, Docker, branch `main`, region Ohio:
  - `apex-orchestrator-api` (`srv-d8qpsi7avr4c73dmb4ig`) — web service, `python main.py api`, public URL `https://apex-orchestrator-api.onrender.com`.
  - `apex-orchestrator-worker` — background worker, `python main.py worker`.
- **Front-end → orchestrator:** the OmniBoard wizard (`apps/omnihub-site/dashboard/components/OmniBoardWizard.tsx`, `.../modules/OmniBoardModule.tsx`) reads `import.meta.env.VITE_ORCHESTRATOR_URL`, which Vite **inlines at build time** (= `https://apex-orchestrator-api.onrender.com`). Production builds ship via GitHub Actions `wrangler pages deploy` (direct upload), which runs **no Cloudflare build** — so the CF Pages dashboard var is ignored and the value is wired into the build env of `release.yml` and `deploy-production-cf-direct.yml`. Unset at build time → empty string → wizard falls into its "contact your admin" error branch.
- **CORS:** `orchestrator/server.py` reads `CORS_ALLOWED_ORIGINS` (default `https://apexomnihub.icu,https://www.apexomnihub.icu`); now set **explicitly** on `apex-orchestrator-api` to pin the allowlist. `allow_credentials=true`; preflight verified GO for both apex origins, rejected for unknown origins.
- Canonical operations references: `docs/operations/APEX_AGENT_RUNBOOK.md` §3.2–3.3, `docs/APEX_AGENT_OPERATIONS.md` §3.

## Related UI pages

- `apps/omnihub-site/src/pages/Orchestrator.tsx`
- `apps/omnihub-site/src/pages/Home.tsx` (capability grid)
