import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# Mock slowapi to avoid ModuleNotFoundError and Starlette crash when running tests locally
class DummyRateLimitExceededError(Exception):
    pass


sys.modules["slowapi"] = MagicMock(_rate_limit_exceeded_handler=MagicMock())
sys.modules["slowapi.errors"] = MagicMock(RateLimitExceeded=DummyRateLimitExceededError)
sys.modules["slowapi.util"] = MagicMock()
# Do NOT mock the metrics module — it uses real prometheus_client which is available,
# and mocking it pollutes sys.modules for downstream tests (test_idempotency_metrics).

from fastapi.testclient import TestClient  # noqa: E402

from server import app  # noqa: E402

client = TestClient(app)


@pytest.fixture
def mock_temporal_client():
    with patch("server.Client.connect", new_callable=AsyncMock) as mock_connect:
        mock_client = AsyncMock()
        mock_handle = MagicMock()
        mock_handle.id = "mock-wf-id"
        mock_client.start_workflow = AsyncMock(return_value=mock_handle)
        mock_connect.return_value = mock_client
        yield mock_connect, mock_client


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_goal_success(mock_temporal_client):
    payload = {"user_id": "user-1", "user_intent": "do something", "trace_id": "trace-1"}

    with patch("server.Client.connect", mock_temporal_client[0]):
        # Patch middleware to passthrough
        app.user_middleware.clear()  # Hack for TestClient to bypass middleware
        app.middleware_stack = app.build_middleware_stack()

        # Now hit it
        response = client.post("/api/v1/goals", json=payload)

        assert response.status_code == 200
        assert response.json()["status"] == "started"


def test_create_goal_failure(mock_temporal_client):
    payload = {"user_id": "user-1", "user_intent": "do something", "trace_id": "trace-1"}

    # Mock temporal client to raise exception
    _, temp_client = mock_temporal_client
    temp_client.start_workflow.side_effect = Exception("Temporal dead")

    app.user_middleware.clear()
    app.middleware_stack = app.build_middleware_stack()

    response = client.post("/api/v1/goals", json=payload)
    assert response.status_code == 500


def test_execute_intent_missing_intent_id():
    app.user_middleware.clear()
    app.middleware_stack = app.build_middleware_stack()

    payload = {
        "payload": {}  # Missing intentId
    }

    response = client.post("/api/v1/intents", json=payload)
    assert response.status_code == 400


def test_execute_intent_unregistered_intent():
    app.user_middleware.clear()
    app.middleware_stack = app.build_middleware_stack()

    payload = {"payload": {"intentId": "unknown-intent-123"}}

    response = client.post("/api/v1/intents", json=payload)
    assert response.status_code == 200  # It returns 200 with an error payload
    data = response.json()
    assert data["status"] == "offline"
    assert "not registered" in data["error"]


def test_execute_intent_success(mock_temporal_client):
    app.user_middleware.clear()
    app.middleware_stack = app.build_middleware_stack()

    payload = {"payload": {"intentId": "test_intent"}, "correlation_id": "corr-1"}

    with patch("server.registry") as mock_registry:
        # Mock that intent is registered
        mock_registry.__contains__.return_value = True

        with patch("server.Client.connect", mock_temporal_client[0]):
            response = client.post("/api/v1/intents", json=payload)

            assert response.status_code == 200
            assert response.json()["status"] == "started"
