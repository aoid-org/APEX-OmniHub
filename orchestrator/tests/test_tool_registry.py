"""Tests for tool_registry: ToolContract, TOOL_REGISTRY, resolve/get helpers.

Uses importlib.util to load tool_registry.py directly from its file path,
bypassing the activities/__init__.py chain which pulls heavy dependencies.
"""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

import pytest

_MODULE_PATH = Path(__file__).resolve().parent.parent / "activities" / "tool_registry.py"

EXPECTED_TOOL_NAMES = frozenset(
    {
        "search_database",
        "create_record",
        "delete_record",
        "send_email",
        "call_webhook",
        "search_youtube",
        "update_agent_run_completion",
        "mint_pilot_session",
    }
)


def _load_registry() -> types.ModuleType:
    """Load activities/tool_registry.py without triggering activities/__init__."""
    spec = importlib.util.spec_from_file_location("activities.tool_registry", _MODULE_PATH)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(autouse=True)
def _registry(request):
    """Provide a freshly-loaded registry module and clean up afterwards."""
    mod = _load_registry()
    request.config._tool_registry_mod = mod
    yield
    sys.modules.pop("activities.tool_registry", None)


def _mod(request) -> types.ModuleType:
    return request.config._tool_registry_mod


# ---------------------------------------------------------------------------
# ToolContract dataclass basics
# ---------------------------------------------------------------------------


class TestToolContract:
    def test_fields_are_set_correctly(self, request) -> None:
        mod = _mod(request)
        contract = mod.ToolContract(
            canonical_name="my_tool",
            aliases=("mt",),
            side_effect=True,
            idempotency_required=False,
            compensable=True,
            compensation_tools_allowed=("undo_my_tool",),
            default_lane="YELLOW",
            policy_tags=("tag_a", "tag_b"),
            input_schema={"type": "object"},
            output_schema={"type": "object"},
        )
        assert contract.canonical_name == "my_tool"
        assert contract.aliases == ("mt",)
        assert contract.side_effect is True
        assert contract.idempotency_required is False
        assert contract.compensable is True
        assert contract.compensation_tools_allowed == ("undo_my_tool",)
        assert contract.default_lane == "YELLOW"
        assert contract.policy_tags == ("tag_a", "tag_b")
        assert contract.input_schema == {"type": "object"}
        assert contract.output_schema == {"type": "object"}

    def test_frozen_raises_on_mutation(self, request) -> None:
        mod = _mod(request)
        contract = mod.TOOL_REGISTRY["search_database"]
        with pytest.raises(AttributeError):
            contract.canonical_name = "hacked"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# TOOL_REGISTRY completeness
# ---------------------------------------------------------------------------


class TestToolRegistry:
    def test_contains_all_expected_tools(self, request) -> None:
        mod = _mod(request)
        assert set(mod.TOOL_REGISTRY.keys()) == EXPECTED_TOOL_NAMES

    def test_registry_has_eight_entries(self, request) -> None:
        mod = _mod(request)
        assert len(mod.TOOL_REGISTRY) == 8

    def test_all_values_are_tool_contracts(self, request) -> None:
        mod = _mod(request)
        for name, contract in mod.TOOL_REGISTRY.items():
            assert isinstance(contract, mod.ToolContract), f"{name} is not a ToolContract"

    def test_canonical_names_match_keys(self, request) -> None:
        mod = _mod(request)
        for key, contract in mod.TOOL_REGISTRY.items():
            assert contract.canonical_name == key


# ---------------------------------------------------------------------------
# resolve_tool_name
# ---------------------------------------------------------------------------


class TestResolveToolName:
    def test_direct_match_returns_canonical(self, request) -> None:
        mod = _mod(request)
        assert mod.resolve_tool_name("search_database") == "search_database"

    def test_alias_returns_canonical(self, request) -> None:
        mod = _mod(request)
        assert mod.resolve_tool_name("webhook") == "call_webhook"

    def test_unknown_returns_none(self, request) -> None:
        mod = _mod(request)
        assert mod.resolve_tool_name("nonexistent_tool") is None

    @pytest.mark.parametrize("tool_name", sorted(EXPECTED_TOOL_NAMES))
    def test_all_canonical_names_resolve(self, tool_name: str, request) -> None:
        mod = _mod(request)
        assert mod.resolve_tool_name(tool_name) == tool_name


# ---------------------------------------------------------------------------
# get_tool_contract
# ---------------------------------------------------------------------------


class TestGetToolContract:
    def test_known_tool_returns_contract(self, request) -> None:
        mod = _mod(request)
        contract = mod.get_tool_contract("search_database")
        assert contract is not None
        assert contract.canonical_name == "search_database"

    def test_alias_returns_contract(self, request) -> None:
        mod = _mod(request)
        contract = mod.get_tool_contract("webhook")
        assert contract is not None
        assert contract.canonical_name == "call_webhook"

    def test_unknown_tool_returns_none(self, request) -> None:
        mod = _mod(request)
        assert mod.get_tool_contract("does_not_exist") is None

    def test_returned_contract_is_same_object_as_registry(self, request) -> None:
        mod = _mod(request)
        contract = mod.get_tool_contract("send_email")
        assert contract is mod.TOOL_REGISTRY["send_email"]


# ---------------------------------------------------------------------------
# Specific tool properties
# ---------------------------------------------------------------------------


class TestSpecificToolProperties:
    def test_delete_record_is_red_lane_with_side_effect(self, request) -> None:
        mod = _mod(request)
        contract = mod.TOOL_REGISTRY["delete_record"]
        assert contract.side_effect is True
        assert contract.default_lane == "RED"
        assert contract.compensable is False

    def test_search_database_is_green_lane_without_side_effect(self, request) -> None:
        mod = _mod(request)
        contract = mod.TOOL_REGISTRY["search_database"]
        assert contract.side_effect is False
        assert contract.default_lane == "GREEN"
        assert contract.policy_tags == ("db_read",)

    def test_create_record_is_compensable_via_delete(self, request) -> None:
        mod = _mod(request)
        contract = mod.TOOL_REGISTRY["create_record"]
        assert contract.compensable is True
        assert contract.compensation_tools_allowed == ("delete_record",)
        assert contract.default_lane == "YELLOW"

    def test_call_webhook_has_alias_and_is_compensable(self, request) -> None:
        mod = _mod(request)
        contract = mod.TOOL_REGISTRY["call_webhook"]
        assert "webhook" in contract.aliases
        assert contract.compensable is True
        assert contract.compensation_tools_allowed == ("call_webhook",)

    def test_send_email_is_not_compensable(self, request) -> None:
        mod = _mod(request)
        contract = mod.TOOL_REGISTRY["send_email"]
        assert contract.side_effect is True
        assert contract.compensable is False
        assert contract.policy_tags == ("external_comm",)

    def test_search_youtube_is_read_only(self, request) -> None:
        mod = _mod(request)
        contract = mod.TOOL_REGISTRY["search_youtube"]
        assert contract.side_effect is False
        assert contract.idempotency_required is False
        assert contract.default_lane == "GREEN"

    def test_update_agent_run_completion_is_system_internal(self, request) -> None:
        mod = _mod(request)
        contract = mod.TOOL_REGISTRY["update_agent_run_completion"]
        assert contract.side_effect is True
        assert contract.default_lane == "GREEN"
        assert "system_internal" in contract.policy_tags

    def test_mint_pilot_session_is_system_internal(self, request) -> None:
        mod = _mod(request)
        contract = mod.TOOL_REGISTRY["mint_pilot_session"]
        assert contract.side_effect is True
        assert contract.default_lane == "YELLOW"
        assert "system_internal" in contract.policy_tags
