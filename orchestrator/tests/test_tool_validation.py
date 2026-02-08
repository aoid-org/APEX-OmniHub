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
    # These modules may not be available in all test environments.
    # We only need the ALLOWED_TOOLS and _TOOL_ALIASES constants.
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
    yield
    for mod_name, mock in stubs.items():
        if sys.modules.get(mod_name) is mock:
            del sys.modules[mod_name]


def _load_tools():
    """Import activities.tools directly (bypass __init__.py)."""
    # Remove cached module to get clean import
    sys.modules.pop("activities.tools", None)
    return importlib.import_module("activities.tools")


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
        }
        assert expected == tools.ALLOWED_TOOLS

    def test_webhook_alias_resolves(self):
        tools = _load_tools()
        assert tools._TOOL_ALIASES.get("webhook") == "call_webhook"

    def test_unknown_tool_not_in_allowed(self):
        tools = _load_tools()
        assert "book_flight" not in tools.ALLOWED_TOOLS
        assert "search_flights" not in tools.ALLOWED_TOOLS
        assert "cancel_flight" not in tools.ALLOWED_TOOLS

    def test_all_aliases_resolve_to_allowed_tools(self):
        tools = _load_tools()
        for alias, canonical in tools._TOOL_ALIASES.items():
            assert canonical in tools.ALLOWED_TOOLS, (
                f"Alias '{alias}' -> '{canonical}' not in ALLOWED_TOOLS"
            )
