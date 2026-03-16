from __future__ import annotations

import pytest

from models.man_mode import ActionIntent, RiskLane
from policies.man_policy import (
    BLOCKED_TOOLS,
    HIGH_RISK_PARAMS,
    SAFE_TOOLS,
    SENSITIVE_TOOLS,
    ManPolicy,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _intent(
    tool_name: str = "unknown_tool",
    params: dict | None = None,
    irreversible: bool = False,
) -> ActionIntent:
    return ActionIntent(
        tool_name=tool_name,
        params=params or {},
        workflow_id="wf-test-001",
        step_id="step-1",
        irreversible=irreversible,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def policy() -> ManPolicy:
    return ManPolicy()


# ---------------------------------------------------------------------------
# 1. BLOCKED tool -> BLOCKED lane, requires_approval=False
# ---------------------------------------------------------------------------


class TestBlockedTool:
    def test_blocked_tool_returns_blocked_lane(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="execute_sql_raw")
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.BLOCKED
        assert result.requires_approval is False

    def test_blocked_tool_case_insensitive(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="SHELL_EXECUTE")
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.BLOCKED

    def test_blocked_tool_reasoning_contains_tool_name(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="admin_override")
        result = policy.triage(intent)
        assert "admin_override" in result.reasoning

    @pytest.mark.parametrize("tool", sorted(BLOCKED_TOOLS))
    def test_all_default_blocked_tools(self, policy: ManPolicy, tool: str) -> None:
        result = policy.triage(_intent(tool_name=tool))
        assert result.risk_lane == RiskLane.BLOCKED


# ---------------------------------------------------------------------------
# 2. SENSITIVE tool -> RED lane, requires_approval=True
# ---------------------------------------------------------------------------


class TestSensitiveTool:
    def test_sensitive_tool_returns_red_lane(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="transfer_funds")
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.RED
        assert result.requires_approval is True

    def test_sensitive_tool_case_insensitive(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="DELETE_RECORD")
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.RED

    def test_sensitive_tool_reasoning(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="send_email")
        result = policy.triage(intent)
        assert "send_email" in result.reasoning
        assert "approval" in result.reasoning.lower()


# ---------------------------------------------------------------------------
# 3. Irreversible flag -> RED lane, requires_approval=True
# ---------------------------------------------------------------------------


class TestIrreversibleFlag:
    def test_irreversible_returns_red_lane(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="some_custom_tool", irreversible=True)
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.RED
        assert result.requires_approval is True

    def test_irreversible_reasoning(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="some_custom_tool", irreversible=True)
        result = policy.triage(intent)
        assert "irreversible" in result.reasoning.lower()

    def test_blocked_takes_precedence_over_irreversible(self, policy: ManPolicy) -> None:
        """Blocked check comes before irreversible in triage order."""
        intent = _intent(tool_name="shell_execute", irreversible=True)
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.BLOCKED


# ---------------------------------------------------------------------------
# 4. 2+ high-risk params -> RED lane, requires_approval=True
# ---------------------------------------------------------------------------


class TestMultipleHighRiskParams:
    def test_two_high_risk_params_returns_red(self, policy: ManPolicy) -> None:
        intent = _intent(
            tool_name="some_tool",
            params={"scope": "all", "force": "true"},
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.RED
        assert result.requires_approval is True

    def test_three_high_risk_params_returns_red(self, policy: ManPolicy) -> None:
        intent = _intent(
            tool_name="some_tool",
            params={"scope": "all", "force": "true", "cascade": "true"},
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.RED

    def test_multiple_risk_reasoning_mentions_factors(self, policy: ManPolicy) -> None:
        intent = _intent(
            tool_name="some_tool",
            params={"scope": "global", "admin": "True"},
        )
        result = policy.triage(intent)
        assert "scope" in result.reasoning
        assert "admin" in result.reasoning


# ---------------------------------------------------------------------------
# 5. 1 high-risk param -> YELLOW lane, requires_approval=False
# ---------------------------------------------------------------------------


class TestSingleHighRiskParam:
    def test_single_high_risk_param_returns_yellow(self, policy: ManPolicy) -> None:
        intent = _intent(
            tool_name="some_tool",
            params={"force": "true"},
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.YELLOW
        assert result.requires_approval is False

    def test_single_risk_reasoning(self, policy: ManPolicy) -> None:
        intent = _intent(
            tool_name="some_tool",
            params={"cascade": "True"},
        )
        result = policy.triage(intent)
        assert "cascade" in result.reasoning


# ---------------------------------------------------------------------------
# 6. SAFE tool -> GREEN lane, requires_approval=False
# ---------------------------------------------------------------------------


class TestSafeTool:
    def test_safe_tool_returns_green_lane(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="read_record")
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.GREEN
        assert result.requires_approval is False

    def test_safe_tool_case_insensitive(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="CHECK_STATUS")
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.GREEN

    @pytest.mark.parametrize("tool", sorted(SAFE_TOOLS))
    def test_all_default_safe_tools(self, policy: ManPolicy, tool: str) -> None:
        result = policy.triage(_intent(tool_name=tool))
        assert result.risk_lane == RiskLane.GREEN


# ---------------------------------------------------------------------------
# 7. Unknown tool -> YELLOW lane (default)
# ---------------------------------------------------------------------------


class TestUnknownTool:
    def test_unknown_tool_returns_yellow(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="totally_unknown_tool_xyz")
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.YELLOW
        assert result.requires_approval is False

    def test_unknown_tool_reasoning(self, policy: ManPolicy) -> None:
        intent = _intent(tool_name="totally_unknown_tool_xyz")
        result = policy.triage(intent)
        assert "unknown" in result.reasoning.lower()


# ---------------------------------------------------------------------------
# 8. Helper methods: is_sensitive, is_blocked, is_safe
# ---------------------------------------------------------------------------


class TestHelpers:
    def test_is_sensitive_positive(self, policy: ManPolicy) -> None:
        assert policy.is_sensitive("transfer_funds") is True

    def test_is_sensitive_negative(self, policy: ManPolicy) -> None:
        assert policy.is_sensitive("read_record") is False

    def test_is_sensitive_case_insensitive(self, policy: ManPolicy) -> None:
        assert policy.is_sensitive("TRANSFER_FUNDS") is True

    def test_is_blocked_positive(self, policy: ManPolicy) -> None:
        assert policy.is_blocked("shell_execute") is True

    def test_is_blocked_negative(self, policy: ManPolicy) -> None:
        assert policy.is_blocked("read_record") is False

    def test_is_blocked_case_insensitive(self, policy: ManPolicy) -> None:
        assert policy.is_blocked("SHELL_EXECUTE") is True

    def test_is_safe_positive(self, policy: ManPolicy) -> None:
        assert policy.is_safe("read_record") is True

    def test_is_safe_negative(self, policy: ManPolicy) -> None:
        assert policy.is_safe("transfer_funds") is False

    def test_is_safe_case_insensitive(self, policy: ManPolicy) -> None:
        assert policy.is_safe("READ_RECORD") is True


# ---------------------------------------------------------------------------
# 9. _evaluate_params with large amount >= 10000
# ---------------------------------------------------------------------------


class TestEvaluateParamsLargeAmount:
    def test_amount_at_threshold(self, policy: ManPolicy) -> None:
        factors = policy._evaluate_params({"amount": 10000})
        large = [f for f in factors if f.startswith("large_amount:")]
        assert len(large) >= 1

    def test_amount_above_threshold(self, policy: ManPolicy) -> None:
        factors = policy._evaluate_params({"amount": 99999})
        large = [f for f in factors if f.startswith("large_amount:")]
        assert len(large) >= 1

    def test_amount_below_threshold(self, policy: ManPolicy) -> None:
        factors = policy._evaluate_params({"amount": 9999})
        large = [f for f in factors if f.startswith("large_amount:")]
        assert len(large) == 0

    def test_value_param_large(self, policy: ManPolicy) -> None:
        factors = policy._evaluate_params({"value": 50000})
        large = [f for f in factors if "value=" in f]
        assert len(large) >= 1

    def test_quantity_param_large(self, policy: ManPolicy) -> None:
        factors = policy._evaluate_params({"quantity": 20000})
        large = [f for f in factors if "quantity=" in f]
        assert len(large) >= 1

    def test_string_numeric_amount(self, policy: ManPolicy) -> None:
        """String that can be parsed as float should still trigger."""
        factors = policy._evaluate_params({"amount": "15000"})
        large = [f for f in factors if f.startswith("large_amount:")]
        assert len(large) >= 1


# ---------------------------------------------------------------------------
# 10. _evaluate_params with non-numeric amount (ValueError branch)
# ---------------------------------------------------------------------------


class TestEvaluateParamsNonNumeric:
    def test_non_numeric_amount_no_crash(self, policy: ManPolicy) -> None:
        factors = policy._evaluate_params({"amount": "not-a-number"})
        large = [f for f in factors if f.startswith("large_amount:")]
        assert len(large) == 0

    def test_none_amount_no_crash(self, policy: ManPolicy) -> None:
        factors = policy._evaluate_params({"amount": None})
        large = [f for f in factors if f.startswith("large_amount:")]
        assert len(large) == 0

    def test_empty_params(self, policy: ManPolicy) -> None:
        factors = policy._evaluate_params({})
        assert factors == []


# ---------------------------------------------------------------------------
# 11. Custom tool sets in __init__
# ---------------------------------------------------------------------------


class TestCustomToolSets:
    def test_custom_blocked_tools(self) -> None:
        policy = ManPolicy(blocked_tools={"my_blocked"})
        assert policy.is_blocked("my_blocked") is True
        # Default blocked tool should no longer be blocked
        assert policy.is_blocked("shell_execute") is False

    def test_custom_sensitive_tools(self) -> None:
        policy = ManPolicy(sensitive_tools={"my_sensitive"})
        assert policy.is_sensitive("my_sensitive") is True
        assert policy.is_sensitive("transfer_funds") is False

    def test_custom_safe_tools(self) -> None:
        policy = ManPolicy(safe_tools={"my_safe"})
        assert policy.is_safe("my_safe") is True
        assert policy.is_safe("read_record") is False

    def test_custom_sets_used_in_triage(self) -> None:
        policy = ManPolicy(
            blocked_tools={"custom_block"},
            sensitive_tools={"custom_sensitive"},
            safe_tools={"custom_safe"},
        )
        assert policy.triage(_intent("custom_block")).risk_lane == RiskLane.BLOCKED
        assert policy.triage(_intent("custom_sensitive")).risk_lane == RiskLane.RED
        assert policy.triage(_intent("custom_safe")).risk_lane == RiskLane.GREEN


# ---------------------------------------------------------------------------
# Edge cases / triage order
# ---------------------------------------------------------------------------


class TestTriageOrder:
    def test_task_id_is_nonempty_string(self, policy: ManPolicy) -> None:
        result = policy.triage(_intent("read_record"))
        assert isinstance(result.task_id, str)
        assert len(result.task_id) > 0

    def test_sensitive_takes_precedence_over_safe(self) -> None:
        """If a tool appears in both sensitive and safe, sensitive wins."""
        policy = ManPolicy(
            sensitive_tools={"dual_tool"},
            safe_tools={"dual_tool"},
        )
        result = policy.triage(_intent("dual_tool"))
        assert result.risk_lane == RiskLane.RED

    def test_blocked_takes_precedence_over_sensitive(self) -> None:
        policy = ManPolicy(
            blocked_tools={"mega_tool"},
            sensitive_tools={"mega_tool"},
        )
        result = policy.triage(_intent("mega_tool"))
        assert result.risk_lane == RiskLane.BLOCKED

    def test_high_risk_param_exact_match_from_config(self, policy: ManPolicy) -> None:
        """amount=10000 matches both HIGH_RISK_PARAMS list AND >= 10000 check."""
        intent = _intent(tool_name="some_tool", params={"amount": "10000"})
        result = policy.triage(intent)
        # Two risk factors: exact match + large amount -> RED
        assert result.risk_lane == RiskLane.RED
        assert result.requires_approval is True


# ---------------------------------------------------------------------------
# Module-level constant sanity checks
# ---------------------------------------------------------------------------


class TestModuleConstants:
    def test_sensitive_tools_is_set(self) -> None:
        assert isinstance(SENSITIVE_TOOLS, set)
        assert len(SENSITIVE_TOOLS) > 0

    def test_blocked_tools_is_set(self) -> None:
        assert isinstance(BLOCKED_TOOLS, set)
        assert len(BLOCKED_TOOLS) > 0

    def test_safe_tools_is_set(self) -> None:
        assert isinstance(SAFE_TOOLS, set)
        assert len(SAFE_TOOLS) > 0

    def test_high_risk_params_is_dict(self) -> None:
        assert isinstance(HIGH_RISK_PARAMS, dict)
        assert len(HIGH_RISK_PARAMS) > 0

    def test_no_overlap_blocked_and_safe(self) -> None:
        assert BLOCKED_TOOLS.isdisjoint(SAFE_TOOLS)

    def test_no_overlap_blocked_and_sensitive(self) -> None:
        assert BLOCKED_TOOLS.isdisjoint(SENSITIVE_TOOLS)

    def test_no_overlap_sensitive_and_safe(self) -> None:
        assert SENSITIVE_TOOLS.isdisjoint(SAFE_TOOLS)
