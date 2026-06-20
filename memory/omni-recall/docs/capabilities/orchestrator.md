---
version: 1.1.0
last_audited: 2026-06-20
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

## Tool Registry (as of 2026-06-20)

Nine tools are registered in `orchestrator/activities/tool_registry.py`:

| Tool | Aliases |
|---|---|
| `search_database` | — |
| `create_record` | — |
| `delete_record` | — |
| `send_email` | — |
| `call_webhook` | `webhook` |
| `search_youtube` | — |
| `respond_to_user` | `answer`, `respond`, `reply`, `respond_directly` |
| `update_agent_run_completion` | — |
| `mint_pilot_session` | — |

`respond_to_user` was added 2026-06-19 as the canonical conversational tool (`default_lane="GREEN"`, `policy_tags=("conversational",)`).

## APEX Agent (live as of 2026-06-19)

The full end-to-end path is verified demo-ready:

```
OmniSlate UI → CF Pages Function /api/mcp/invoke
  → Supabase apex-agent edge function
    → Render apex-orchestrator-api
      → Temporal Cloud (ns apex-omnihub-temporal.i7ero, ca-central-1)
        → Render apex-orchestrator-worker
          → agent_runs (completed) → SSE → UI rendered LLM answer
```

Key runtime facts:
- `SEMANTIC_CACHE_ENABLED=false` — keeps 512 MB Render worker alive; `check_semantic_cache()` returns `None` (clean miss)
- `omni_policies` table live with 7 tailored APEX governance policies
- Operations reference: `docs/APEX_AGENT_OPERATIONS.md` (canonical, CI-enforced)
- Runbook: `docs/operations/APEX_AGENT_RUNBOOK.md`

## Related UI pages

- `apps/omnihub-site/src/pages/Orchestrator.tsx`
- `apps/omnihub-site/src/pages/Home.tsx` (capability grid)
