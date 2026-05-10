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
- ``llm_plan_attempts_total`` – incremented for each planner model attempt.
- ``llm_plan_outcomes_total`` – bounded planner outcomes
  (primary_success, fallback_success, all_failed, non_retryable_block, unknown).

Usage
-----
::

    from metrics import (
        record_hit,
        record_miss,
        record_llm_plan_attempt,
        record_llm_plan_outcome,
    )
    record_hit("agent_saga")
    record_miss("agent_saga")
    record_llm_plan_attempt("agent_saga")
    record_llm_plan_outcome("primary_success", "agent_saga")
"""

from __future__ import annotations

from typing import Any

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

llm_plan_attempts = Counter(
    "llm_plan_attempts_total",
    "Total LLM plan generation attempts across primary and fallback models",
    ["workflow_type"],
)

llm_plan_outcomes = Counter(
    "llm_plan_outcomes_total",
    "LLM plan generation outcomes",
    ["workflow_type", "outcome"],
)


# ── Helper Functions ─────────────────────────────────────────────────


def record_hit(workflow_type: str = "agent_saga") -> None:
    """Increment the idempotency-hit counter."""
    idempotency_hits.labels(workflow_type=workflow_type).inc()


def record_miss(workflow_type: str = "agent_saga") -> None:
    """Increment the idempotency-miss counter."""
    idempotency_misses.labels(workflow_type=workflow_type).inc()


def record_llm_plan_attempt(workflow_type: str = "agent_saga") -> None:
    """Increment the LLM plan-attempt counter."""
    llm_plan_attempts.labels(workflow_type=workflow_type).inc()


def record_llm_plan_outcome(outcome: str, workflow_type: str = "agent_saga") -> None:
    """
    Increment the bounded LLM outcome counter.

    Valid outcomes are intentionally finite to keep Prometheus cardinality low.
    Unknown values are normalized to ``unknown``.
    """
    allowed_outcomes = {
        "primary_success",
        "fallback_success",
        "all_failed",
        "non_retryable_block",
    }
    normalized_outcome = outcome if outcome in allowed_outcomes else "unknown"
    llm_plan_outcomes.labels(workflow_type=workflow_type, outcome=normalized_outcome).inc()


def get_metrics_app() -> Any:
    """Return an ASGI app that serves ``/metrics`` in Prometheus format."""
    return make_asgi_app()


def start_metrics_server(port: int = 9090) -> None:
    """Start a Prometheus metrics HTTP server in a background daemon thread.

    Called by the Temporal worker (main.py) to expose ``/metrics`` without
    requiring a full ASGI stack.  Uses prometheus_client's built-in WSGI
    server which internally daemonizes its thread, so the caller does not need
    to manage the lifecycle — the server stops when the process exits.

    Args:
        port: TCP port to listen on (default 9090, overridable via METRICS_PORT).
    """
    import logging
    import threading

    from prometheus_client import start_http_server

    _logger = logging.getLogger(__name__)

    def _serve() -> None:
        start_http_server(port)

    thread = threading.Thread(target=_serve, daemon=True, name="prometheus-metrics-server")
    thread.start()
    _logger.info("Prometheus metrics server started on port %d", port)
