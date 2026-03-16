"""
Tests for core/intents.py — 100% line coverage.

Verifies that the IntentRegistry singleton is populated with the correct
bridge mappings defined in core/intents.py at import time.
"""

import pytest

# Import triggers the side-effect: populates the registry singleton
import core.intents  # noqa: F401
from core.intent_registry import registry

# ---------------------------------------------------------------------------
# Bridge mappings verification
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "intent_id, expected_activity",
    [
        # Tool activities
        ("search_database", "search_database"),
        ("create_record", "create_record"),
        ("delete_record", "delete_record"),
        ("send_email", "send_email"),
        ("call_webhook", "call_webhook"),
        ("search_youtube", "search_youtube"),
        # MAN Mode activities
        ("risk_triage", "risk_triage"),
        ("create_man_task", "create_man_task"),
        ("resolve_man_task", "resolve_man_task"),
        ("get_man_task", "get_man_task"),
        ("check_man_decision", "check_man_decision"),
        # Policy activities
        ("evaluate_policy", "evaluate_policy"),
        # Iron Law verification
        ("verify_deductive_path", "verify_deductive_path"),
        # Notification activities
        ("notify_man_task", "notify_man_task"),
    ],
)
def test_bridge_intent_mapped(intent_id: str, expected_activity: str):
    """Each bridge mapping resolves to the correct Temporal activity name."""
    resolved = registry.resolve(intent_id)
    assert resolved == expected_activity, (
        f"Expected '{intent_id}' → '{expected_activity}', got '{resolved}'"
    )


def test_universal_intents_are_registered():
    """USO decorator-registered activities must be present."""
    assert "system.health_check" in registry
    assert "system.echo" in registry
    assert "system.list_intents" in registry


def test_registry_total_intent_count():
    """Registry must have at least 17 intents (14 bridges + 3 decorator)."""
    assert len(registry) >= 17


def test_all_mapped_intents_resolve_non_none():
    """Every registered intent resolves to a non-empty string."""
    for intent_id in registry.list_intents():
        resolved = registry.resolve(intent_id)
        assert resolved is not None, f"Intent '{intent_id}' resolved to None"
        assert isinstance(resolved, str) and len(resolved) > 0


# ---------------------------------------------------------------------------
# IntentRegistry unit tests for uncovered lines
# ---------------------------------------------------------------------------
from core.intent_registry import IntentRegistry, OmniModalPayload  # noqa: E402


class TestOmniModalPayloadToDict:
    """Line 48: OmniModalPayload.to_dict() method."""

    def test_to_dict_returns_correct_structure(self):
        payload = OmniModalPayload(
            intent_id="my.intent",
            status="ok",
            data={"key": "val"},
            error=None,
            trace_id="trace-xyz",
        )
        result = payload.to_dict()
        assert result == {
            "intentId": "my.intent",
            "status": "ok",
            "data": {"key": "val"},
            "error": None,
            "traceId": "trace-xyz",
        }


class TestRegisterIntentDuplicate:
    """Line 95: duplicate registration raises ValueError."""

    def test_register_intent_duplicate_raises(self):
        reg = IntentRegistry()

        @reg.register_intent("test.action")
        def my_activity(payload): ...  # placeholder activity for registration test

        with pytest.raises(ValueError, match="duplicate registration"):

            @reg.register_intent("test.action")
            def another_activity(
                payload,
            ): ...  # placeholder activity for duplicate-registration test


class TestMapIntentDuplicate:
    """Line 123: duplicate map_intent raises ValueError."""

    def test_map_intent_duplicate_raises(self):
        reg = IntentRegistry()
        reg.map_intent("some.action", "activity_a")

        with pytest.raises(ValueError, match="duplicate registration"):
            reg.map_intent("some.action", "activity_b")


class TestResolveOrOffline:
    """Lines 150-159: resolve_or_offline returns OmniModalPayload for unknown intents."""

    def test_resolve_or_offline_known_intent_returns_string(self):
        reg = IntentRegistry()
        reg.map_intent("known.intent", "known_activity")
        result = reg.resolve_or_offline("known.intent", trace_id="t1")
        assert result == "known_activity"

    def test_resolve_or_offline_unknown_intent_returns_payload(self):
        reg = IntentRegistry()
        result = reg.resolve_or_offline("unknown.intent", trace_id="trace-99")
        assert isinstance(result, OmniModalPayload)
        assert result.status == "offline"
        assert result.intent_id == "unknown.intent"
        assert result.trace_id == "trace-99"
        assert "unknown.intent" in result.error

    def test_resolve_or_offline_no_trace_id(self):
        reg = IntentRegistry()
        result = reg.resolve_or_offline("no.trace")
        assert isinstance(result, OmniModalPayload)
        assert result.trace_id is None
