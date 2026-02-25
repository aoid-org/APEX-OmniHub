"""
APEX Orchestrator — Idempotency Monitoring.

Exposes Prometheus counters for cache-hit / cache-miss events so that
the orchestrator's idempotency-key replay rate can be tracked, alerted,
and graphed in Grafana.

Counters
--------
- ``idempotency_hits_total``  – incremented on semantic-cache hit or
  idempotency-key replay.
- ``idempotency_misses_total`` – incremented on cache miss (new plan
  generated).

Usage
-----
::

    from metrics import record_hit, record_miss
    record_hit("agent_saga")
    record_miss("agent_saga")
"""

from __future__ import annotations

from prometheus_client import Counter, make_asgi_app

# ── Prometheus Counters ──────────────────────────────────────────────

idempotency_hits = Counter(
    "idempotency_hits_total",
    "Semantic-cache / idempotency-key replay hits",
    ["workflow_type"],
)

idempotency_misses = Counter(
    "idempotency_misses_total",
    "Semantic-cache / idempotency-key misses (new plan generated)",
    ["workflow_type"],
)


# ── Helper Functions ─────────────────────────────────────────────────


def record_hit(workflow_type: str = "agent_saga") -> None:
    """Increment the idempotency-hit counter."""
    idempotency_hits.labels(workflow_type=workflow_type).inc()


def record_miss(workflow_type: str = "agent_saga") -> None:
    """Increment the idempotency-miss counter."""
    idempotency_misses.labels(workflow_type=workflow_type).inc()


def get_metrics_app():
    """Return an ASGI app that serves ``/metrics`` in Prometheus format."""
    return make_asgi_app()
