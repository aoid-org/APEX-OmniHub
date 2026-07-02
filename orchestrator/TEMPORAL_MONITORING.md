---
version: 2.0.0
last_audited: 2026-07-02
status: verified
---

# Temporal Worker Health Monitoring

> **Correction (2026-07-02, AUDIT_2026-07.md M1):** v1 of this document specified a
> `scripts/monitor/temporal-health.ts` heartbeat script that **does not exist in this
> repository and never shipped**. This rewrite documents only monitoring that actually
> exists, with paths.

## What actually monitors the worker today

| Signal | Where | Evidence |
|---|---|---|
| API liveness | `GET /health` on the orchestrator API | `orchestrator/server.py` (`/health` route) |
| Permanent workflow failure alerts | DLQ alert activity: structured ERROR log + Prometheus counter + optional Slack webhook (`SLACK_ALERT_WEBHOOK_URL`) | `orchestrator/activities/dlq_alert.py`, tested by `tests/test_dlq_alert.py` |
| Prometheus metrics | Idempotency hit/miss and semantic-cache lookup/store counters, served by the metrics ASGI app | `orchestrator/metrics.py` |
| Run/event recording | OmniTrace activities persist run lifecycle to the DB | `orchestrator/activities/omnitrace_activities.py`, `orchestrator/observability/omnitrace.py` |
| Temporal Cloud console | Namespace `apex-omnihub-temporal.i7ero` (ca-central-1) — workflow/worker visibility is Temporal Cloud's own UI | `orchestrator/README.md` runtime note |

## Operational procedures

Incident playbooks, worker OOM diagnosis, env-var reference, and smoke tests live in
the canonical ops documents — not here:

- `docs/APEX_AGENT_OPERATIONS.md` (anti-drift source of truth; CI-guarded)
- `docs/operations/APEX_AGENT_RUNBOOK.md` (incident playbook, §6 worker memory)

If a dedicated heartbeat probe is ever built, it must land in `scripts/` with a test,
and this document must link the real path — never the reverse.
