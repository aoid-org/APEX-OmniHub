"""Tests for server.py — FastAPI routes."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# Mock slowapi + metrics before importing server.py
class _RateLimitExceededError(Exception):
    pass


sys.modules["slowapi"] = MagicMock(
    _rate_limit_exceeded_handler=MagicMock(),
)
sys.modules["slowapi.errors"] = MagicMock(
    RateLimitExceeded=_RateLimitExceededError,
)
sys.modules["slowapi.util"] = MagicMock()
sys.modules["metrics"] = MagicMock(
    get_metrics_app=MagicMock(return_value=MagicMock()),
)

from fastapi.testclient import TestClient  # noqa: E402

from server import app  # noqa: E402

client = TestClient(app)


@pytest.fixture()
def _clean_middleware() -> None:
    """Strip middleware so TestClient can hit routes directly."""
    app.user_middleware.clear()
    app.middleware_stack = app.build_middleware_stack()


@pytest.fixture()
def mock_temporal() -> AsyncMock:
    mock_client = AsyncMock()
    handle = MagicMock(id="wf-mock")
    mock_client.start_workflow = AsyncMock(return_value=handle)
    return mock_client


@pytest.mark.usefixtures("_clean_middleware")
class TestHealthCheck:
    def test_ok(self) -> None:
        assert client.get("/health").status_code == 200


@pytest.mark.usefixtures("_clean_middleware")
class TestGoals:
    def test_success(self, mock_temporal: AsyncMock) -> None:
        with patch("server.Client.connect", new_callable=AsyncMock, return_value=mock_temporal):
            r = client.post(
                "/api/v1/goals",
                json={
                    "user_id": "u1",
                    "user_intent": "hello",
                    "trace_id": "t1",
                },
            )
        assert r.status_code == 200
        assert r.json()["status"] == "started"

    def test_failure(self, mock_temporal: AsyncMock) -> None:
        mock_temporal.start_workflow.side_effect = Exception("boom")
        with patch("server.Client.connect", new_callable=AsyncMock, return_value=mock_temporal):
            r = client.post(
                "/api/v1/goals",
                json={
                    "user_id": "u1",
                    "user_intent": "hello",
                    "trace_id": "t1",
                },
            )
        assert r.status_code == 500
