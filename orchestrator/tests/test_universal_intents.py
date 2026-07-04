"""
Tests for activities/universal_intents.py — 100% line coverage.

Covers the three USO activities (system_health_check, system_echo,
system_list_intents) and verifies their responses without requiring
a live Temporal worker.
"""

from unittest.mock import MagicMock, patch

import pytest
from temporalio import activity

from activities.universal_intents import (
    connector_connect,
    connector_create_custom,
    connector_disconnect,
    connector_list,
    connector_status,
    connector_test,
    system_echo,
    system_health_check,
    system_list_intents,
)
from core.intent_registry import registry


@pytest.fixture(autouse=True)
def _mock_logger():
    with patch.object(activity, "logger", MagicMock()):
        yield


# ---------------------------------------------------------------------------
# system_health_check
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_system_health_check_structure():
    result = await system_health_check({})
    assert result["healthy"] is True
    assert "python_version" in result
    assert "timestamp" in result
    assert "worker_hostname" in result


@pytest.mark.asyncio
async def test_system_health_check_timestamp_is_zulu():
    """Timestamp must end with Z (ISO 8601 Zulu), not +00:00."""
    result = await system_health_check({})
    assert result["timestamp"].endswith("Z"), f"Expected Zulu timestamp, got: {result['timestamp']}"


@pytest.mark.asyncio
async def test_system_health_check_ignores_extra_params():
    """Activity must not crash on unexpected payload keys."""
    result = await system_health_check({"unexpected_key": "value", "another": 42})
    assert result["healthy"] is True


# ---------------------------------------------------------------------------
# system_echo
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_system_echo_returns_payload():
    params = {"message": "hello", "user": "test"}
    result = await system_echo(params)
    assert result["echoed"] is True
    assert result["payload"] == params


@pytest.mark.asyncio
async def test_system_echo_received_keys_sorted():
    params = {"z_key": 1, "a_key": 2, "m_key": 3}
    result = await system_echo(params)
    assert result["received_keys"] == ["a_key", "m_key", "z_key"]


@pytest.mark.asyncio
async def test_system_echo_empty_payload():
    result = await system_echo({})
    assert result["echoed"] is True
    assert result["received_keys"] == []
    assert result["payload"] == {}


@pytest.mark.asyncio
async def test_system_echo_timestamp_is_zulu():
    result = await system_echo({"x": 1})
    assert result["timestamp"].endswith("Z")


# ---------------------------------------------------------------------------
# system_list_intents
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_system_list_intents_returns_list():
    result = await system_list_intents({})
    assert isinstance(result["intents"], list)
    assert isinstance(result["count"], int)
    assert result["count"] == len(result["intents"])


@pytest.mark.asyncio
async def test_system_list_intents_contains_registered_intents():
    """The three USO activities themselves are registered via @registry.register_intent."""
    result = await system_list_intents({})
    registered = set(result["intents"])
    assert "system.health_check" in registered
    assert "system.echo" in registered
    assert "system.list_intents" in registered


@pytest.mark.asyncio
async def test_system_list_intents_count_matches_registry():
    result = await system_list_intents({})
    assert result["count"] == len(registry)


@pytest.mark.asyncio
async def test_system_list_intents_timestamp_is_zulu():
    result = await system_list_intents({})
    assert result["timestamp"].endswith("Z")


# ---------------------------------------------------------------------------
# connector.* chat-native bridges
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_connector_intents_registered():
    registered = set((await system_list_intents({}))["intents"])
    assert {
        "connector.list",
        "connector.status",
        "connector.connect",
        "connector.test",
        "connector.disconnect",
        "connector.create_custom",
    }.issubset(registered)


@pytest.mark.asyncio
async def test_connector_list_returns_status_and_health():
    result = await connector_list({})
    assert result["count"] >= 1
    assert all("status" in item and "health" in item for item in result["availableIntegrations"])


@pytest.mark.asyncio
async def test_connector_chat_flow_slack_connect_test_disconnect():
    connected = await connector_connect({"connector": "slack"})
    assert connected["status"] == "ready_for_test"
    assert connected["message"] == "Connection readiness verified."

    tested = await connector_test({"connector": "slack"})
    assert tested["status"] == "ok"
    assert tested["message"] == "Connection test passed. This app is ready for a production key."

    status = await connector_status({"connector": "slack"})
    assert status["status"] == "ok"

    disconnected = await connector_disconnect({"connector": "slack"})
    assert disconnected["status"] == "ok"


@pytest.mark.asyncio
async def test_connector_create_custom_is_beta_only():
    result = await connector_create_custom({"name": "Partner API", "authType": "oauth2"})
    assert result["status"] == "beta"
    assert result["connector"]["status"] == "beta"
    assert "Human promotion" in result["message"]
