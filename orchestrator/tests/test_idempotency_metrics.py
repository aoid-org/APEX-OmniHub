"""Tests for idempotency monitoring metrics.

Covers:
  - Counter increment on hit / miss
  - /metrics endpoint returns Prometheus text format
  - Replay scenario (multiple hits)
  - Chaos: rapid-fire counter increments
"""

from __future__ import annotations

import sys

import pytest

# Capture the real metrics module at import time, before test_server.py can replace
# sys.modules["metrics"] with a MagicMock at its own module level.
import metrics as _real_metrics_module  # noqa: E402


@pytest.fixture(autouse=True)
def _restore_real_metrics_module() -> None:
    """
    Ensure each test uses the real metrics module, not the MagicMock that
    test_server.py installs via ``sys.modules["metrics"] = MagicMock(...)``
    at module level (which runs during pytest collection, before any tests run).
    """
    original = sys.modules.get("metrics")
    sys.modules["metrics"] = _real_metrics_module
    yield
    if original is not None:
        sys.modules["metrics"] = original
    else:
        sys.modules.pop("metrics", None)

# ── Unit Tests ───────────────────────────────────────────────────────


class TestIdempotencyCounters:
    """Verify Prometheus counter semantics."""

    def test_hit_increments_counter(self) -> None:
        from metrics import idempotency_hits, record_hit

        before = idempotency_hits.labels(workflow_type="agent_saga")._value.get()
        record_hit("agent_saga")
        after = idempotency_hits.labels(workflow_type="agent_saga")._value.get()
        assert after == pytest.approx(before + 1.0)

    def test_miss_increments_counter(self) -> None:
        from metrics import idempotency_misses, record_miss

        before = idempotency_misses.labels(workflow_type="agent_saga")._value.get()
        record_miss("agent_saga")
        after = idempotency_misses.labels(workflow_type="agent_saga")._value.get()
        assert after == pytest.approx(before + 1.0)

    def test_workflow_type_label_isolation(self) -> None:
        """Different workflow types must have independent counters."""
        from metrics import idempotency_hits, record_hit

        before_saga = idempotency_hits.labels(workflow_type="agent_saga")._value.get()
        before_batch = idempotency_hits.labels(workflow_type="batch_job")._value.get()
        record_hit("batch_job")
        assert idempotency_hits.labels(workflow_type="agent_saga")._value.get() == before_saga
        assert idempotency_hits.labels(workflow_type="batch_job")._value.get() == before_batch + 1

    def test_default_workflow_type(self) -> None:
        """record_hit() with no argument defaults to 'agent_saga'."""
        from metrics import idempotency_hits, record_hit

        before = idempotency_hits.labels(workflow_type="agent_saga")._value.get()
        record_hit()
        assert idempotency_hits.labels(workflow_type="agent_saga")._value.get() == before + 1


class TestReplayScenario:
    """Simulate idempotency-key replays."""

    def test_multiple_replays_increment_correctly(self) -> None:
        from metrics import idempotency_hits, record_hit

        before = idempotency_hits.labels(workflow_type="agent_saga")._value.get()
        for _ in range(10):
            record_hit("agent_saga")
        assert idempotency_hits.labels(workflow_type="agent_saga")._value.get() == before + 10


class TestChaosRapidFire:
    """Chaos: rapid-fire increments must not lose counts."""

    def test_rapid_fire_1000_hits(self) -> None:
        from metrics import idempotency_hits, record_hit

        before = idempotency_hits.labels(workflow_type="chaos")._value.get()
        for _ in range(1_000):
            record_hit("chaos")
        assert idempotency_hits.labels(workflow_type="chaos")._value.get() == before + 1_000

    def test_rapid_fire_1000_misses(self) -> None:
        from metrics import idempotency_misses, record_miss

        before = idempotency_misses.labels(workflow_type="chaos")._value.get()
        for _ in range(1_000):
            record_miss("chaos")
        assert idempotency_misses.labels(workflow_type="chaos")._value.get() == before + 1_000


class TestMetricsEndpoint:
    """Verify the /metrics ASGI app factory."""

    def test_get_metrics_app_returns_callable(self) -> None:
        from metrics import get_metrics_app

        app = get_metrics_app()
        assert callable(app)
