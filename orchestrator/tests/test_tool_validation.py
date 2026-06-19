"""Tests for tool planner validation and alias resolution.

Uses importlib to import tools.py directly, avoiding the
activities/__init__.py chain which pulls heavy dependencies.
"""

import importlib
import sys
from unittest.mock import MagicMock

import pytest


@pytest.fixture(autouse=True)
def _mock_heavy_deps():
    """Mock out heavy/unavailable transitive dependencies."""
    stubs = {}
    for mod_name in [
        "instructor",
        "litellm",
        "models.audit",
        "providers.database.factory",
        "security.prompt_sanitizer",
    ]:
        if mod_name not in sys.modules:
            stubs[mod_name] = sys.modules[mod_name] = MagicMock()

    # Snapshot activities modules before reload
    saved = {k: v for k, v in sys.modules.items() if k.startswith("activities")}

    yield

    for mod_name, mock in stubs.items():
        if sys.modules.get(mod_name) is mock:
            del sys.modules[mod_name]

    # Restore original activities modules to prevent downstream pollution
    for key in tuple(sys.modules):
        if key.startswith("activities"):
            del sys.modules[key]
    sys.modules.update(saved)


def _load_tools():
    """Import activities.tools directly (bypass __init__.py)."""
    sys.modules.pop("activities.tools", None)
    return importlib.import_module("activities.tools")


def _load_tool_registry():
    """Import activities.tool_registry directly (bypass __init__.py)."""
    sys.modules.pop("activities.tool_registry", None)
    return importlib.import_module("activities.tool_registry")


class TestAllowedTools:
    def test_canonical_tools_defined(self):
        tools = _load_tools()
        expected = {
            "search_database",
            "create_record",
            "delete_record",
            "send_email",
            "call_webhook",
            "search_youtube",
            "respond_to_user",
            "update_agent_run_completion",
            "mint_pilot_session",
        }
        assert expected == set(tools.TOOL_REGISTRY.keys())

    def test_webhook_alias_resolves(self):
        tools = _load_tools()
        assert tools.resolve_tool_name("webhook") == "call_webhook"

    def test_unknown_tool_not_in_allowed(self):
        tools = _load_tools()
        assert "book_flight" not in tools.TOOL_REGISTRY
        assert "search_flights" not in tools.TOOL_REGISTRY
        assert "cancel_flight" not in tools.TOOL_REGISTRY

    def test_all_aliases_resolve_to_allowed_tools(self):
        tools = _load_tools()
        # Verify all defined aliases resolve to a tool in the registry
        for contract in tools.TOOL_REGISTRY.values():
            for alias in contract.aliases:
                assert tools.resolve_tool_name(alias) in tools.TOOL_REGISTRY


class TestResolveToolNameCoverage:
    """Direct coverage tests for lines 160, 164, 168-169 in tool_registry.py."""

    def test_resolve_tool_name_canonical_returns_name(self):
        """Line 160: name directly in TOOL_REGISTRY returns name."""
        tr = _load_tool_registry()
        result = tr.resolve_tool_name("search_database")
        assert result == "search_database"

    def test_resolve_tool_name_alias_returns_canonical(self):
        """Line 164: alias resolution returns canonical name."""
        tr = _load_tool_registry()
        result = tr.resolve_tool_name("webhook")
        assert result == "call_webhook"

    def test_resolve_tool_name_unknown_returns_none(self):
        """resolve_tool_name returns None for unknown names."""
        tr = _load_tool_registry()
        result = tr.resolve_tool_name("totally_unknown_tool")
        assert result is None

    def test_get_tool_contract_canonical(self):
        """Line 168-169: get_tool_contract returns contract for known tool."""
        tr = _load_tool_registry()
        contract = tr.get_tool_contract("search_database")
        assert contract is not None
        assert contract.canonical_name == "search_database"

    def test_get_tool_contract_via_alias(self):
        """Line 168-169: get_tool_contract resolves alias and returns contract."""
        tr = _load_tool_registry()
        contract = tr.get_tool_contract("webhook")
        assert contract is not None
        assert contract.canonical_name == "call_webhook"

    def test_get_tool_contract_unknown_returns_none(self):
        """Line 168-169 (else branch): get_tool_contract returns None for unknowns."""
        tr = _load_tool_registry()
        contract = tr.get_tool_contract("nonexistent_tool")
        assert contract is None
