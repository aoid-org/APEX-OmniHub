import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# Mock slowapi to avoid ModuleNotFoundError and Starlette crash when running tests locally
class DummyRateLimitExceededError(Exception):
    pass


sys.modules["slowapi"] = MagicMock(_rate_limit_exceeded_handler=MagicMock())
sys.modules["slowapi.errors"] = MagicMock(RateLimitExceeded=DummyRateLimitExceededError)
sys.modules["slowapi.util"] = MagicMock()
sys.modules["metrics"] = MagicMock(get_metrics_app=MagicMock(return_value=MagicMock()))

from fastapi.testclient import TestClient  # noqa: E402

from server import app  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def bypass_signature_verification():
    """Bypass HMAC signature verification for all tests in this module via proper mocking."""
    with patch("security.request_signing._is_signature_required", return_value=False):
        yield


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
    payload = {
        "user_id": "user-1",
        "user_intent": "do something",
        "trace_id": "trace-1",
        "jwt_token": "jwt-1",
    }

    with patch("server.Client.connect", mock_temporal_client[0]):
        # Now hit it
        response = client.post("/api/v1/goals", json=payload)

        assert response.status_code == 200
        assert response.json()["status"] == "started"


def test_create_goal_requires_jwt_token():
    payload = {"user_id": "user-1", "user_intent": "do something", "trace_id": "trace-1"}

    response = client.post("/api/v1/goals", json=payload)

    assert response.status_code == 422


def test_create_goal_passes_jwt_and_tenant_context(mock_temporal_client):
    payload = {
        "user_id": "user-1",
        "user_intent": "do something",
        "trace_id": "trace-1",
        "jwt_token": "jwt-1",
        "tenant_id": "tenant-1",
    }

    response = client.post("/api/v1/goals", json=payload)

    assert response.status_code == 200
    _, temp_client = mock_temporal_client
    args = temp_client.start_workflow.call_args.kwargs["args"]
    assert args[2] == {
        "trace_id": "trace-1",
        "jwt_token": "jwt-1",
        "tenant_id": "tenant-1",
    }


def test_create_goal_failure(mock_temporal_client):
    payload = {
        "user_id": "user-1",
        "user_intent": "do something",
        "trace_id": "trace-1",
        "jwt_token": "jwt-1",
    }

    # Mock temporal client to raise exception
    _, temp_client = mock_temporal_client
    temp_client.start_workflow.side_effect = Exception("Temporal dead")

    response = client.post("/api/v1/goals", json=payload)
    assert response.status_code == 500


def test_execute_intent_missing_intent_id():
    payload = {
        "payload": {}  # Missing intentId
    }

    response = client.post("/api/v1/intents", json=payload)
    assert response.status_code == 400


def test_execute_intent_unregistered_intent():
    payload = {"payload": {"intentId": "unknown-intent-123"}}

    response = client.post("/api/v1/intents", json=payload)
    assert response.status_code == 200  # It returns 200 with an error payload
    data = response.json()
    assert data["status"] == "offline"
    assert "not registered" in data["error"]


def test_execute_intent_success(mock_temporal_client):
    payload = {"payload": {"intentId": "test_intent"}, "correlation_id": "corr-1"}

    with patch("server.registry") as mock_registry:
        # Mock that intent is registered
        mock_registry.__contains__.return_value = True

        with patch("server.Client.connect", mock_temporal_client[0]):
            response = client.post("/api/v1/intents", json=payload)

            assert response.status_code == 200
            assert response.json()["status"] == "started"
