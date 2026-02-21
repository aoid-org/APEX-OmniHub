"""Unit tests for MAN Mode models and policy engine."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from models.man_mode import (
    ActionIntent,
    ManTask,
    ManTaskDecision,
    ManTaskStatus,
    RiskLane,
    RiskTriageResult,
    create_idempotency_key,
)
from policies.man_policy import (
    BLOCKED_TOOLS,
    SAFE_TOOLS,
    SENSITIVE_TOOLS,
    ManPolicy,
)


class TestRiskLaneEnum:
    """Test RiskLane enum values."""

    def test_all_lanes_present(self):
        """Should have all 4 risk lanes."""
        assert RiskLane.GREEN == "GREEN"
        assert RiskLane.YELLOW == "YELLOW"
        assert RiskLane.RED == "RED"
        assert RiskLane.BLOCKED == "BLOCKED"


class TestManTaskStatusEnum:
    """Test ManTaskStatus enum values."""

    def test_all_statuses_present(self):
        """Should have all 4 task statuses."""
        assert ManTaskStatus.PENDING == "PENDING"
        assert ManTaskStatus.APPROVED == "APPROVED"
        assert ManTaskStatus.DENIED == "DENIED"
        assert ManTaskStatus.EXPIRED == "EXPIRED"


class TestActionIntent:
    """Test ActionIntent model validation."""

    def test_create_valid_intent(self):
        """Should create valid action intent."""
        intent = ActionIntent(
            tool_name="delete_record",
            params={"id": 123},
            workflow_id="wf-123",
            step_id="step-1",
            irreversible=True,
        )
        assert intent.tool_name == "delete_record"
        assert intent.params == {"id": 123}
        assert intent.workflow_id == "wf-123"
        assert intent.irreversible is True

    def test_minimal_intent(self):
        """Should create intent with only required fields."""
        intent = ActionIntent(
            tool_name="search",
            workflow_id="wf-456",
        )
        assert intent.tool_name == "search"
        assert intent.params == {}
        assert intent.step_id == ""
        assert intent.irreversible is False
        assert intent.context is None

    def test_intent_immutable(self):
        """ActionIntent should be frozen (immutable)."""
        intent = ActionIntent(tool_name="test", workflow_id="wf-1")
        with pytest.raises(ValidationError):
            intent.tool_name = "changed"


class TestRiskTriageResult:
    """Test RiskTriageResult model."""

    def test_create_valid_result(self):
        """Should create valid triage result."""
        result = RiskTriageResult(
            task_id=uuid4().hex,
            risk_lane=RiskLane.RED,
            reasoning="Sensitive tool",
            requires_approval=True,
        )
        assert result.risk_lane == RiskLane.RED
        assert result.requires_approval is True
        assert result.is_demo is False

    def test_is_executable(self):
        """Should correctly determine executability."""
        green = RiskTriageResult(
            task_id="1", risk_lane=RiskLane.GREEN, reasoning="ok", requires_approval=False
        )
        yellow = RiskTriageResult(
            task_id="2", risk_lane=RiskLane.YELLOW, reasoning="ok", requires_approval=False
        )
        red = RiskTriageResult(
            task_id="3", risk_lane=RiskLane.RED, reasoning="stop", requires_approval=True
        )
        blocked = RiskTriageResult(
            task_id="4", risk_lane=RiskLane.BLOCKED, reasoning="stop", requires_approval=False
        )

        assert green.is_executable() is True
        assert yellow.is_executable() is True
        assert red.is_executable() is False
        assert blocked.is_executable() is False


class TestManTaskDecision:
    """Test ManTaskDecision model."""

    def test_create_approval(self):
        """Should create approval decision."""
        decision = ManTaskDecision(
            status=ManTaskStatus.APPROVED,
            decided_by="admin@example.com",
            reason="Looks good",
        )
        assert decision.status == ManTaskStatus.APPROVED
        assert decision.decided_by == "admin@example.com"
        assert decision.reason == "Looks good"

    def test_create_denial(self):
        """Should create denial decision."""
        decision = ManTaskDecision(
            status=ManTaskStatus.DENIED,
            decided_by="admin@example.com",
            reason="Too risky",
        )
        assert decision.status == ManTaskStatus.DENIED


class TestManTask:
    """Test ManTask model."""

    def test_create_valid_task(self):
        """Should create valid MAN task."""
        intent = ActionIntent(tool_name="delete_user", workflow_id="wf-1")
        triage = RiskTriageResult(
            task_id=uuid4().hex,
            risk_lane=RiskLane.RED,
            reasoning="Sensitive",
            requires_approval=True,
        )
        task = ManTask(
            idempotency_key="wf-1:step-1",
            workflow_id="wf-1",
            intent=intent,
            triage_result=triage,
        )
        assert task.status == ManTaskStatus.PENDING
        assert task.decision is None
        assert task.workflow_id == "wf-1"


class TestIdempotencyKey:
    """Test idempotency key helper."""

    def test_create_key(self):
        """Should create idempotency key from workflow and step."""
        key = create_idempotency_key("wf-123", "step-5")
        assert key == "wf-123:step-5"

    def test_empty_step(self):
        """Should handle empty step ID."""
        key = create_idempotency_key("wf-123", "")
        assert key == "wf-123:"

    def test_namespaced_tool_key(self):
        """Should include namespace and tool when provided."""
        key = create_idempotency_key("wf-123", "step-5", tool_name="delete_record", namespace="man")
        assert key == "man:wf-123:step-5:delete_record"


class TestManPolicy:
    """Test ManPolicy risk classification engine."""

    def test_sensitive_tool_red_lane(self):
        """Sensitive tools should return RED lane."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="delete_record",
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.RED
        assert result.requires_approval is True
        # reasoning should contain risk factor
        assert "requires human approval" in result.reasoning

    def test_blocked_tool_blocked_lane(self):
        """Blocked tools should return BLOCKED lane."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="execute_sql_raw",
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.BLOCKED
        assert result.requires_approval is False

    def test_safe_tool_green_lane(self):
        """Safe tools should return GREEN lane."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="search_database",
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.GREEN
        assert result.requires_approval is False

    def test_irreversible_flag_red_lane(self):
        """Irreversible flag should force RED lane."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="unknown_tool",
            workflow_id="wf-1",
            irreversible=True,
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.RED
        assert result.requires_approval is True
        assert "marked as irreversible" in result.reasoning

    def test_unknown_tool_yellow_lane(self):
        """Unknown tools should return YELLOW lane."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="some_random_tool",
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.YELLOW
        assert result.requires_approval is False
        assert "Unknown tool" in result.reasoning

    def test_high_risk_params_single_yellow(self):
        """Single high-risk param should return YELLOW."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="some_tool",
            params={"force": "true"},
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.YELLOW
        assert "High-risk parameter detected" in result.reasoning

    def test_high_risk_params_multiple_red(self):
        """Multiple high-risk params should return RED."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="some_tool",
            params={"force": "true", "cascade": "true"},
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.RED
        assert result.requires_approval is True
        assert "Multiple high-risk parameters" in result.reasoning

    def test_large_amount_triggers_risk(self):
        """Large financial amounts should trigger risk factor."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="some_tool",
            params={"amount": 50000},
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert "large_amount" in result.reasoning

    def test_case_insensitive_tool_matching(self):
        """Tool matching should be case-insensitive."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="DELETE_RECORD",
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.RED

    def test_is_sensitive_helper(self):
        """is_sensitive helper should work correctly."""
        policy = ManPolicy()
        assert policy.is_sensitive("delete_record") is True
        assert policy.is_sensitive("search_database") is False

    def test_is_blocked_helper(self):
        """is_blocked helper should work correctly."""
        policy = ManPolicy()
        assert policy.is_blocked("execute_sql_raw") is True
        assert policy.is_blocked("delete_record") is False

    def test_is_safe_helper(self):
        """is_safe helper should work correctly."""
        policy = ManPolicy()
        assert policy.is_safe("search_database") is True
        assert policy.is_safe("delete_record") is False

    def test_custom_tool_sets(self):
        """Should accept custom tool sets."""
        policy = ManPolicy(
            sensitive_tools={"custom_sensitive"},
            blocked_tools={"custom_blocked"},
            safe_tools={"custom_safe"},
        )
        assert policy.is_sensitive("custom_sensitive") is True
        assert policy.is_blocked("custom_blocked") is True
        assert policy.is_safe("custom_safe") is True


class TestManPolicyPerformance:
    """Test ManPolicy performance optimizations."""

    def test_cached_lowercase_sets_exist(self):
        """Policy should have cached lowercase sets."""
        policy = ManPolicy()
        assert hasattr(policy, "_sensitive_lower")
        assert hasattr(policy, "_blocked_lower")
        assert hasattr(policy, "_safe_lower")
        assert isinstance(policy._sensitive_lower, frozenset)

    def test_repeated_triage_consistent(self):
        """Repeated triage calls should be consistent."""
        policy = ManPolicy()
        intent = ActionIntent(tool_name="delete_record", workflow_id="wf-1")
        result1 = policy.triage(intent)
        result2 = policy.triage(intent)
        assert result1.risk_lane == result2.risk_lane
        assert result1.reasoning == result2.reasoning


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_empty_tool_name(self):
        """Should handle empty tool name gracefully."""
        policy = ManPolicy()
        intent = ActionIntent(tool_name="", workflow_id="wf-1")
        result = policy.triage(intent)
        # Empty tool name defaults to YELLOW (unknown)
        assert result.risk_lane == RiskLane.YELLOW

    def test_special_characters_in_tool_name(self):
        """Should handle special characters in tool name."""
        policy = ManPolicy()
        intent = ActionIntent(tool_name="tool-with-dashes_and_underscores", workflow_id="wf-1")
        result = policy.triage(intent)
        assert result.risk_lane == RiskLane.YELLOW

    def test_exact_high_risk_param_match(self):
        """Should match exact high-risk param values."""
        policy = ManPolicy()
        # Exact match: amount=10000
        intent = ActionIntent(
            tool_name="some_tool",
            params={"amount": "10000"},
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert "high_risk_param" in result.reasoning

    def test_near_threshold_amount(self):
        """Should not trigger for amounts just below threshold."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="some_tool",
            params={"amount": 9999},
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert "large_amount" not in result.reasoning

    def test_negative_amount_safe(self):
        """Negative amounts should not trigger risk."""
        policy = ManPolicy()
        intent = ActionIntent(
            tool_name="some_tool",
            params={"amount": -50000},
            workflow_id="wf-1",
        )
        result = policy.triage(intent)
        assert "large_amount" not in result.reasoning


class TestToolConfiguration:
    """Test tool configuration constants."""

    def test_sensitive_tools_not_empty(self):
        """Sensitive tools set should not be empty."""
        assert len(SENSITIVE_TOOLS) > 0
        assert "delete_record" in SENSITIVE_TOOLS
        assert "transfer_funds" in SENSITIVE_TOOLS

    def test_blocked_tools_not_empty(self):
        """Blocked tools set should not be empty."""
        assert len(BLOCKED_TOOLS) > 0
        assert "execute_sql_raw" in BLOCKED_TOOLS

    def test_safe_tools_not_empty(self):
        """Safe tools set should not be empty."""
        assert len(SAFE_TOOLS) > 0
        assert "search_database" in SAFE_TOOLS

    def test_no_overlap_blocked_safe(self):
        """Blocked and safe tools should not overlap."""
        assert BLOCKED_TOOLS.isdisjoint(SAFE_TOOLS)

    def test_no_overlap_sensitive_safe(self):
        """Sensitive and safe tools should not overlap."""
        assert SENSITIVE_TOOLS.isdisjoint(SAFE_TOOLS)
