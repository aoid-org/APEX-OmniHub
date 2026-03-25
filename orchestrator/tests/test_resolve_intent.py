"""
Tests for activities/resolve_intent.py.

Covers:
  - Known intent → returns {"resolved": True, "activity_name": "..."}
  - Unknown intent → returns {"resolved": False, "offline_payload": {...}}
  - Offline payload contains correct error and intent_id
  - trace_id propagates correctly

The resolve_intent module is imported directly (bypassing activities/__init__)
to avoid the heavy dependency chain (supabase, redis, etc.) in CI/test.
"""

import importlib.util
import os
import sys
from unittest.mock import patch

import pytest

from core.intent_registry import IntentRegistry


def _load_resolve_intent_module():
    """Load activities/resolve_intent.py directly, bypassing activities/__init__."""
    mod_name = "activities.resolve_intent"
    if mod_name in sys.modules:
        return sys.modules[mod_name]

    module_path = os.path.join(
        os.path.dirname(__file__), "..", "activities", "resolve_intent.py"
    )
    spec = importlib.util.spec_from_file_location(mod_name, module_path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[mod_name] = mod
    spec.loader.exec_module(mod)
    return mod


# Load once at module level
_resolve_mod = _load_resolve_intent_module()


@pytest.mark.asyncio
async def test_resolve_known_intent():
    """Registered intent returns resolved=True with activity name."""
    reg = IntentRegistry()

    @reg.register_intent("test.known")
    async def known_activity(_payload):
        return {}

    with patch.object(_resolve_mod, "registry", reg):
        result = await _resolve_mod.resolve_intent("test.known", "trace-abc")

    assert result["resolved"] is True
    assert result["activity_name"] == "known_activity"


@pytest.mark.asyncio
async def test_resolve_unknown_intent():
    """Unregistered intent returns resolved=False with offline payload."""
    reg = IntentRegistry()

    with patch.object(_resolve_mod, "registry", reg):
        result = await _resolve_mod.resolve_intent("totally.unknown", "trace-xyz")

    assert result["resolved"] is False
    payload = result["offline_payload"]
    assert payload["intentId"] == "totally.unknown"
    assert payload["status"] == "offline"
    assert "not registered" in payload["error"].lower()
    assert payload["traceId"] == "trace-xyz"


@pytest.mark.asyncio
async def test_resolve_intent_none_trace_id():
    """trace_id=None is handled gracefully."""
    reg = IntentRegistry()

    with patch.object(_resolve_mod, "registry", reg):
        result = await _resolve_mod.resolve_intent("missing.intent", None)

    assert result["resolved"] is False
    assert result["offline_payload"]["traceId"] is None


@pytest.mark.asyncio
async def test_resolve_intent_mapped_activity():
    """map_intent (pre-existing activity) works through resolve_intent."""
    reg = IntentRegistry()
    reg.map_intent("mapped.test", "pre_existing_activity")

    with patch.object(_resolve_mod, "registry", reg):
        result = await _resolve_mod.resolve_intent("mapped.test", "trace-map")

    assert result["resolved"] is True
    assert result["activity_name"] == "pre_existing_activity"
