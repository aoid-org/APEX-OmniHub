"""
Tests for workflows/universal_saga.py.

Covers:
  - build_omni_modal_schema helper: all fields, None data default, error field
  - UniversalOrchestratorWorkflow.run:
      * Invalid EventEnvelope dict → error response
      * Unknown intent → offline response (resolve_intent returns resolved=False)
      * Known intent, activity succeeds → ok response (dict result)
      * Known intent, activity succeeds → ok response (non-dict result wrapped)
      * Known intent, activity raises ActivityError → error response
      * resolve_intent activity itself fails → error response
  - IntentRegistry helpers used by the workflow (via core.intent_registry):
      * resolve returns activity name for registered intent
      * resolve_or_offline returns OmniModalPayload for unknown intent
      * __contains__ and __len__
      * map_intent + duplicate raises ValueError
      * list_intents sorted
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from temporalio.exceptions import ActivityError

from core.intent_registry import IntentRegistry, OmniModalPayload
from workflows.universal_saga import (
    ACTIVITY_RETRY_POLICY,
    ACTIVITY_TIMEOUT,
    RESOLVE_INTENT_RETRY_POLICY,
    RESOLVE_INTENT_TIMEOUT,
    UniversalOrchestratorWorkflow,
    build_omni_modal_schema,
)

# ============================================================================
# build_omni_modal_schema
# ============================================================================


def test_build_omni_modal_schema_success():
    result = build_omni_modal_schema(
        intent_id="crm.sync",
        trace_id="trace-1",
        status="ok",
        data={"records": 5},
    )
    assert result["intentId"] == "crm.sync"
    assert result["traceId"] == "trace-1"
    assert result["status"] == "ok"
    assert result["data"] == {"records": 5}
    assert result["error"] is None
    assert result["schemaVersion"] == "1.0.0"


def test_build_omni_modal_schema_no_data_defaults_to_empty_dict():
    result = build_omni_modal_schema(
        intent_id="x",
        trace_id="t",
        status="error",
        error="something went wrong",
    )
    assert result["data"] == {}
    assert result["error"] == "something went wrong"


def test_build_omni_modal_schema_offline():
    result = build_omni_modal_schema(
        intent_id="unknown.intent",
        trace_id="trace-2",
        status="offline",
        error="Intent not registered",
    )
    assert result["status"] == "offline"
    assert result["intentId"] == "unknown.intent"


# ============================================================================
# Module-level constants
# ============================================================================


def test_activity_timeout_is_120_seconds():
    from datetime import timedelta

    assert timedelta(seconds=120) == ACTIVITY_TIMEOUT


def test_retry_policy_config():
    from datetime import timedelta

    assert ACTIVITY_RETRY_POLICY.maximum_attempts == 3
    assert ACTIVITY_RETRY_POLICY.initial_interval == timedelta(seconds=1)
    assert ACTIVITY_RETRY_POLICY.backoff_coefficient == pytest.approx(2.0)
    assert ACTIVITY_RETRY_POLICY.maximum_interval == timedelta(seconds=30)


def test_resolve_intent_timeout_is_5_seconds():
    from datetime import timedelta

    assert timedelta(seconds=5) == RESOLVE_INTENT_TIMEOUT


def test_resolve_intent_retry_policy():
    from datetime import timedelta

    assert RESOLVE_INTENT_RETRY_POLICY.maximum_attempts == 2
    assert RESOLVE_INTENT_RETRY_POLICY.initial_interval == timedelta(milliseconds=200)
    assert RESOLVE_INTENT_RETRY_POLICY.backoff_coefficient == pytest.approx(1.5)
    assert RESOLVE_INTENT_RETRY_POLICY.maximum_interval == timedelta(seconds=2)


# ============================================================================
# UniversalOrchestratorWorkflow.run — mocked workflow context
# ============================================================================

# We exercise the workflow's run() method directly (not via a Temporal sandbox)
# by patching the Temporal workflow module functions it uses.


def _valid_envelope_dict(intent_id="crm.sync_contacts"):
    return {
        "correlation_id": "corr-123",
        "idempotency_key": "tenant-1-event-2024-nonce",
        "tenant_id": "tenant-1",
        "event_type": "orchestrator:agent.goal_received",
        "payload": {"intentId": intent_id},
        "source": "omni-dash",
        "trace": {
            "trace_id": "corr-123",
            "span_id": "span-1",
        },
    }


@pytest.mark.asyncio
async def test_run_invalid_envelope_returns_error():
    """Completely invalid envelope dict → error schema, no activity call."""
    wf = UniversalOrchestratorWorkflow()

    with patch("workflows.universal_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        result = await wf.run({"not_valid": True})

    assert result["status"] == "error"
    assert "EventEnvelope validation failed" in result["error"]
    assert result["intentId"] == "unknown"


@pytest.mark.asyncio
async def test_run_unknown_intent_returns_offline():
    """Valid envelope but intent not in registry → offline response."""
    wf = UniversalOrchestratorWorkflow()

    envelope_dict = _valid_envelope_dict(intent_id="totally.unknown.intent.xyz")

    # resolve_intent activity returns resolved=False
    resolve_result = {
        "resolved": False,
        "offline_payload": {
            "intentId": "totally.unknown.intent.xyz",
            "status": "offline",
            "error": "Intent 'totally.unknown.intent.xyz' is not registered in the Universal Intent Registry.",
            "traceId": "corr-123",
            "data": {},
        },
    }

    with patch("workflows.universal_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        # First call: resolve_intent activity → offline
        mock_wf.execute_activity = AsyncMock(return_value=resolve_result)
        result = await wf.run(envelope_dict)

    assert result["status"] == "offline"
    assert result["intentId"] == "totally.unknown.intent.xyz"
    assert "not registered" in result["error"].lower()


@pytest.mark.asyncio
async def test_run_known_intent_activity_succeeds_dict_result():
    """Known intent, activity returns dict → ok response with data."""
    wf = UniversalOrchestratorWorkflow()

    envelope_dict = _valid_envelope_dict(intent_id="test.saga.known_intent")

    resolve_result = {"resolved": True, "activity_name": "sync_contacts_activity"}
    activity_result = {"contacts": 10, "synced": True}

    call_count = 0

    async def mock_execute_activity(name, *_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # First call: resolve_intent
            assert name == "resolve_intent"
            return resolve_result
        # Second call: the resolved activity
        assert name == "sync_contacts_activity"
        return activity_result

    with patch("workflows.universal_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(side_effect=mock_execute_activity)
        result = await wf.run(envelope_dict)

    assert result["status"] == "ok"
    assert result["data"] == activity_result
    assert result["intentId"] == "test.saga.known_intent"
    assert result["error"] is None
    assert call_count == 2


@pytest.mark.asyncio
async def test_run_known_intent_activity_returns_non_dict():
    """Activity returns non-dict (e.g. string) → wrapped in {"result": ...}."""
    wf = UniversalOrchestratorWorkflow()

    envelope_dict = _valid_envelope_dict(intent_id="test.saga.string_result")

    call_count = 0

    async def mock_execute_activity(_name, *_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return {"resolved": True, "activity_name": "string_activity"}
        return "plain string result"

    with patch("workflows.universal_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(side_effect=mock_execute_activity)
        result = await wf.run(envelope_dict)

    assert result["status"] == "ok"
    assert result["data"] == {"result": "plain string result"}


@pytest.mark.asyncio
async def test_run_known_intent_activity_raises_activity_error():
    """Activity raises ActivityError → error response, no re-raise."""
    wf = UniversalOrchestratorWorkflow()

    envelope_dict = _valid_envelope_dict(intent_id="test.saga.failing_intent")

    call_count = 0

    async def mock_execute_activity(_name, *_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return {"resolved": True, "activity_name": "failing_activity"}
        raise ActivityError(
            "activity failed",
            scheduled_event_id=1,
            started_event_id=2,
            identity="worker",
            activity_type="failing_activity",
            activity_id="act-1",
            retry_state=None,
        )

    with patch("workflows.universal_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(side_effect=mock_execute_activity)
        result = await wf.run(envelope_dict)

    assert result["status"] == "error"
    assert "failing_activity" in result["error"]
    assert result["intentId"] == "test.saga.failing_intent"


@pytest.mark.asyncio
async def test_run_resolve_intent_activity_fails():
    """resolve_intent activity itself raises ActivityError → error response."""
    wf = UniversalOrchestratorWorkflow()

    envelope_dict = _valid_envelope_dict(intent_id="test.saga.resolve_fail")

    with patch("workflows.universal_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(
            side_effect=ActivityError(
                "resolve_intent crashed",
                scheduled_event_id=1,
                started_event_id=2,
                identity="worker",
                activity_type="resolve_intent",
                activity_id="act-resolve-1",
                retry_state=None,
            )
        )
        result = await wf.run(envelope_dict)

    assert result["status"] == "error"
    assert "Intent resolution failed" in result["error"]
    assert result["intentId"] == "test.saga.resolve_fail"


@pytest.mark.asyncio
async def test_run_envelope_uses_event_type_as_fallback_intent_id():
    """When intentId not in payload, event_type.value is used as intent_id."""
    wf = UniversalOrchestratorWorkflow()

    # Payload has no intentId key
    envelope_dict = {
        "correlation_id": "corr-456",
        "idempotency_key": "tenant-1-event-2024-nonce",
        "tenant_id": "tenant-1",
        "event_type": "orchestrator:agent.goal_received",
        "payload": {},  # no intentId
        "source": "omni-dash",
        "trace": {
            "trace_id": "corr-456",
            "span_id": "span-2",
        },
    }

    resolve_result = {
        "resolved": False,
        "offline_payload": {
            "intentId": "orchestrator:agent.goal_received",
            "status": "offline",
            "error": "Intent 'orchestrator:agent.goal_received' is not registered.",
            "traceId": "corr-456",
            "data": {},
        },
    }

    with patch("workflows.universal_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(return_value=resolve_result)
        result = await wf.run(envelope_dict)

    # The fallback intentId comes from event_type.value
    assert result["intentId"] == "orchestrator:agent.goal_received"
    # It won't be registered → offline
    assert result["status"] == "offline"


@pytest.mark.asyncio
async def test_run_trace_id_from_correlation_id():
    """traceId in response matches envelope.correlation_id."""
    wf = UniversalOrchestratorWorkflow()

    envelope_dict = _valid_envelope_dict(intent_id="test.trace.check")

    call_count = 0

    async def mock_execute_activity(_name, *_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return {"resolved": True, "activity_name": "some_activity"}
        return {"ok": True}

    with patch("workflows.universal_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        mock_wf.execute_activity = AsyncMock(side_effect=mock_execute_activity)
        result = await wf.run(envelope_dict)

    assert result["traceId"] == "corr-123"


# ============================================================================
# IntentRegistry unit tests (used by the resolve_intent activity)
# ============================================================================


def test_registry_register_and_resolve():
    reg = IntentRegistry()

    @reg.register_intent("test.intent")
    async def my_activity(_payload):
        return {}

    assert reg.resolve("test.intent") == "my_activity"


def test_registry_resolve_unknown_returns_none():
    reg = IntentRegistry()
    assert reg.resolve("no.such.intent") is None


def test_registry_resolve_or_offline_returns_activity_name():
    reg = IntentRegistry()

    @reg.register_intent("known.intent")
    async def known_activity(_payload):
        return {}

    result = reg.resolve_or_offline("known.intent", trace_id="t1")
    assert result == "known_activity"


def test_registry_resolve_or_offline_returns_omni_modal_payload():
    reg = IntentRegistry()
    result = reg.resolve_or_offline("missing.intent", trace_id="t2")
    assert isinstance(result, OmniModalPayload)
    assert result.status == "offline"
    assert result.intent_id == "missing.intent"
    assert result.trace_id == "t2"
    assert "not registered" in result.error.lower()


def test_registry_duplicate_registration_raises():
    reg = IntentRegistry()

    @reg.register_intent("dup.intent")
    async def activity_one(_payload):
        return {}

    with pytest.raises(ValueError, match="duplicate registration"):

        @reg.register_intent("dup.intent")
        async def activity_two(_payload):
            return {}


def test_registry_map_intent():
    reg = IntentRegistry()
    reg.map_intent("mapped.intent", "existing_activity_name")
    assert reg.resolve("mapped.intent") == "existing_activity_name"


def test_registry_map_intent_duplicate_raises():
    reg = IntentRegistry()
    reg.map_intent("dup.map", "act_a")
    with pytest.raises(ValueError, match="duplicate registration"):
        reg.map_intent("dup.map", "act_b")


def test_registry_contains_and_len():
    reg = IntentRegistry()
    reg.map_intent("intent.a", "act_a")
    reg.map_intent("intent.b", "act_b")

    assert "intent.a" in reg
    assert "intent.c" not in reg
    assert len(reg) == 2


def test_registry_list_intents_sorted():
    reg = IntentRegistry()
    reg.map_intent("z.intent", "act_z")
    reg.map_intent("a.intent", "act_a")
    reg.map_intent("m.intent", "act_m")

    intents = reg.list_intents()
    assert intents == ["a.intent", "m.intent", "z.intent"]


def test_omni_modal_payload_to_dict():
    payload = OmniModalPayload(
        intent_id="test.intent",
        status="ok",
        data={"key": "value"},
        error=None,
        trace_id="trace-123",
    )
    d = payload.to_dict()
    assert d["intentId"] == "test.intent"
    assert d["status"] == "ok"
    assert d["data"] == {"key": "value"}
    assert d["error"] is None
    assert d["traceId"] == "trace-123"
