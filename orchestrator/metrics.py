"""
Prometheus metrics for APEX Orchestrator.

Exposes idempotency hit-rate counters and a /metrics HTTP endpoint
for Prometheus scraping. Integrates with Temporal workers.

Usage:
    from metrics import idempotency_hits, idempotency_misses, start_metrics_server
"""

import logging
from threading import Thread

from prometheus_client import Counter, Gauge, start_http_server

logger = logging.getLogger(__name__)

# ── Idempotency Counters ────────────────────────────────────────────────────

idempotency_hits = Counter(
    "idempotency_hits_total",
    "Total idempotency cache/replay hits (duplicate request correctly deduplicated)",
    ["workflow", "activity"],
)

idempotency_misses = Counter(
    "idempotency_misses_total",
    "Total idempotency misses (new unique request processed)",
    ["workflow", "activity"],
)

# ── Operational Gauges ──────────────────────────────────────────────────────

active_workflows = Gauge(
    "apex_active_workflows",
    "Currently active Temporal workflows",
)

# ── Server ──────────────────────────────────────────────────────────────────

_metrics_started = False


def start_metrics_server(port: int = 9090) -> None:
    """Start Prometheus metrics HTTP server on a background thread (idempotent)."""
    global _metrics_started
    if _metrics_started:
        return
    _metrics_started = True

    def _serve() -> None:
        start_http_server(port)
        logger.info(f"Prometheus metrics server listening on :{port}/metrics")

    t = Thread(target=_serve, daemon=True)
    t.start()
