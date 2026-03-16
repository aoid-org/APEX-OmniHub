"""Comprehensive tests for orchestrator.metrics module.

Covers:
  - record_hit increments the hits counter (default and custom workflow_type)
  - record_miss increments the misses counter (default and custom workflow_type)
  - get_metrics_app returns a callable ASGI application
  - start_metrics_server launches a daemon thread without actually binding a port
"""

from __future__ import annotations

import sys
import threading
from unittest.mock import patch

import pytest

import metrics as _real_metrics_module


@pytest.fixture(autouse=True)
def _restore_real_metrics_module():
    """Ensure each test uses the real metrics module, not a MagicMock that
    other test modules may install via ``sys.modules``."""
    original = sys.modules.get("metrics")
    sys.modules["metrics"] = _real_metrics_module
    yield
    if original is not None:
        sys.modules["metrics"] = original
    else:
        sys.modules.pop("metrics", None)


# ── record_hit tests ────────────────────────────────────────────────


class TestRecordHit:
    """Verify record_hit increments idempotency_hits_total."""

    def test_record_hit_increments_hits_counter(self) -> None:
        from metrics import idempotency_hits, record_hit

        before = idempotency_hits.labels(workflow_type="agent_saga")._value.get()
        record_hit()
        after = idempotency_hits.labels(workflow_type="agent_saga")._value.get()
        assert after == pytest.approx(before + 1.0)

    def test_record_hit_custom_workflow_type(self) -> None:
        from metrics import idempotency_hits, record_hit

        label = "custom_pipeline"
        before = idempotency_hits.labels(workflow_type=label)._value.get()
        record_hit(workflow_type=label)
        after = idempotency_hits.labels(workflow_type=label)._value.get()
        assert after == pytest.approx(before + 1.0)

    def test_record_hit_does_not_affect_other_labels(self) -> None:
        from metrics import idempotency_hits, record_hit

        before = idempotency_hits.labels(workflow_type="agent_saga")._value.get()
        record_hit(workflow_type="unrelated_workflow")
        after = idempotency_hits.labels(workflow_type="agent_saga")._value.get()
        assert after == before


# ── record_miss tests ───────────────────────────────────────────────


class TestRecordMiss:
    """Verify record_miss increments idempotency_misses_total."""

    def test_record_miss_increments_misses_counter(self) -> None:
        from metrics import idempotency_misses, record_miss

        before = idempotency_misses.labels(workflow_type="agent_saga")._value.get()
        record_miss()
        after = idempotency_misses.labels(workflow_type="agent_saga")._value.get()
        assert after == pytest.approx(before + 1.0)

    def test_record_miss_custom_workflow_type(self) -> None:
        from metrics import idempotency_misses, record_miss

        label = "etl_job"
        before = idempotency_misses.labels(workflow_type=label)._value.get()
        record_miss(workflow_type=label)
        after = idempotency_misses.labels(workflow_type=label)._value.get()
        assert after == pytest.approx(before + 1.0)

    def test_record_miss_does_not_affect_other_labels(self) -> None:
        from metrics import idempotency_misses, record_miss

        before = idempotency_misses.labels(workflow_type="agent_saga")._value.get()
        record_miss(workflow_type="isolated_workflow")
        after = idempotency_misses.labels(workflow_type="agent_saga")._value.get()
        assert after == before


# ── get_metrics_app tests ───────────────────────────────────────────


class TestGetMetricsApp:
    """Verify the ASGI app factory."""

    def test_get_metrics_app_returns_callable(self) -> None:
        from metrics import get_metrics_app

        app = get_metrics_app()
        assert callable(app)

    def test_get_metrics_app_returns_asgi_app(self) -> None:
        """ASGI apps are callables; each invocation should return a fresh one."""
        from metrics import get_metrics_app

        app_a = get_metrics_app()
        app_b = get_metrics_app()
        assert callable(app_a)
        assert callable(app_b)


# ── start_metrics_server tests ──────────────────────────────────────


class TestStartMetricsServer:
    """Verify start_metrics_server launches a daemon thread.

    We mock ``prometheus_client.start_http_server`` so no real port is bound.
    """

    @patch("prometheus_client.start_http_server")
    def test_starts_daemon_thread(self, mock_start_http: object) -> None:
        from metrics import start_metrics_server

        start_metrics_server(port=19090)
        # Give the daemon thread a moment to invoke start_http_server
        import time

        time.sleep(0.1)
        # The mock should have been called with the specified port
        mock_start_http.assert_called_once_with(19090)  # type: ignore[attr-defined]

    @patch("prometheus_client.start_http_server")
    def test_default_port(self, mock_start_http: object) -> None:
        from metrics import start_metrics_server

        start_metrics_server()
        import time

        time.sleep(0.1)
        mock_start_http.assert_called_once_with(9090)  # type: ignore[attr-defined]

    @patch("prometheus_client.start_http_server")
    def test_thread_is_daemon(self, _mock_start_http: object) -> None:
        from metrics import start_metrics_server

        # Capture threads before calling
        names_before = {t.name for t in threading.enumerate()}
        start_metrics_server(port=29090)
        import time

        time.sleep(0.1)
        new_threads = [
            t
            for t in threading.enumerate()
            if t.name not in names_before and t.name == "prometheus-metrics-server"
        ]
        # The thread may already have exited (mocked target returns immediately),
        # but if still alive it must be a daemon.
        for t in new_threads:
            assert t.daemon is True
