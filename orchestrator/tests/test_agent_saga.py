"""Tests for workflows/agent_saga.py — DAG execution, event sourcing, policy checks."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Import helpers under a mocked workflow sandbox so Temporal decorators
# don't blow up outside a real worker.
# ---------------------------------------------------------------------------
_wf_mock = MagicMock()
_wf_mock.now.return_value = MagicMock(timestamp=MagicMock(return_value=100.0))
_wf_mock.info.return_value = MagicMock(
    workflow_id="wf-test-1",
    search_attributes={"trace_id": ["trace-1"]},
)

with patch.dict("sys.modules", {"temporalio.workflow": _wf_mock}):
    from workflows.agent_saga import (
        AgentWorkflow,
        GoalReceived,
        PlanGenerated,
        ToolResultReceived,
        WorkflowCompleted,
        WorkflowFailed,
    )


# ── fixtures ──────────────────────────────────────────────────────────────
@pytest.fixture()
def wf() -> AgentWorkflow:
    return AgentWorkflow()


# ── unit tests ────────────────────────────────────────────────────────────
class TestInitialization:
    def test_defaults(self, wf: AgentWorkflow) -> None:
        assert wf.goal == ""
        assert wf.step_results == {}
        assert len(wf.events) == 0
        assert wf.saga is None


class TestAppendEvent:
    @pytest.mark.asyncio
    async def test_goal_received_updates_state(self, wf: AgentWorkflow) -> None:
        evt = GoalReceived(correlation_id="c1", goal="greet", user_id="u1")
        with patch("workflows.agent_saga.workflow.logger"):
            await wf._append_event(evt)
        assert wf.goal == "greet"
        assert wf.user_id == "u1"
        assert len(wf.events) == 1

    @pytest.mark.asyncio
    async def test_plan_generated_updates_state(self, wf: AgentWorkflow) -> None:
        evt = PlanGenerated(
            correlation_id="c1",
            plan_id="p1",
            steps=[{"id": "s1", "tool": "noop"}],
        )
        with patch("workflows.agent_saga.workflow.logger"):
            await wf._append_event(evt)
        assert wf.plan_id == "p1"
        assert len(wf.plan_steps) == 1

    @pytest.mark.asyncio
    async def test_continue_as_new_at_threshold(self, wf: AgentWorkflow) -> None:
        wf.MAX_HISTORY_SIZE = 2
        evt = GoalReceived(correlation_id="c1", goal="x", user_id="u1")
        with (
            patch("workflows.agent_saga.workflow.logger"),
            patch.object(wf, "_continue_as_new") as mock_can,
        ):
            await wf._append_event(evt)
            assert mock_can.call_count == 0
            await wf._append_event(evt)
            mock_can.assert_called_once()


class TestDAG:
    def test_build_dag_structure(self, wf: AgentWorkflow) -> None:
        wf.plan_steps = [
            {"id": "s1", "tool": "A"},
            {"id": "s2", "tool": "B", "depends_on": ["s1"]},
            {"id": "s3", "tool": "C", "depends_on": ["s1"]},
            {"id": "s4", "tool": "D", "depends_on": ["s2", "s3"]},
        ]
        lookup, _deps, dependents, in_degree = wf._build_dag_structure()
        assert in_degree["s1"] == 0
        assert in_degree["s4"] == 2
        assert "s2" in dependents["s1"]


class TestHandlers:
    @pytest.mark.asyncio
    async def test_handle_failure_runs_rollback(self, wf: AgentWorkflow) -> None:
        wf.plan_id = "p1"
        wf.failed_step_id = "s1"
        wf.saga = AsyncMock()
        wf.saga.rollback.return_value = {"c1": "ok"}

        with (
            patch("workflows.agent_saga.workflow.execute_activity", new_callable=AsyncMock),
            patch("workflows.agent_saga.workflow.logger"),
            patch("workflows.agent_saga.workflow.info") as mi,
        ):
            mi.return_value = MagicMock(workflow_id="wf-1")
            result = await wf._handle_failure("boom")

        assert result["status"] == "failed"
        assert result["compensation_executed"] is True


class TestContinueAsNew:
    def test_snapshot_fields(self, wf: AgentWorkflow) -> None:
        wf.goal = "g"
        wf.user_id = "u"
        wf.step_count = 42
        with (
            patch("workflows.agent_saga.workflow.continue_as_new") as mock_can,
            patch("workflows.agent_saga.workflow.logger"),
        ):
            wf._continue_as_new()
            mock_can.assert_called_once()
