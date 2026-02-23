<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
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

## Related UI pages

- `apps/omnihub-site/src/pages/Orchestrator.tsx`
- `apps/omnihub-site/src/pages/Home.tsx` (capability grid)
