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

@pytest.mark.parametrize("intent_id, expected_activity", [
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
])
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
