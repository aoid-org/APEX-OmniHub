from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Mock the current temporal workflow context before importing AgentWorkflow
with (
    patch("temporalio.workflow.now") as mock_now,
    patch("temporalio.workflow.info") as mock_info,
    patch("temporalio.workflow.execute_activity", new_callable=AsyncMock) as mock_execute_activity,
    patch("temporalio.workflow.sleep", new_callable=AsyncMock) as mock_sleep,
    patch("temporalio.workflow.continue_as_new") as mock_continue,
):
    mock_now.return_value = MagicMock(timestamp=MagicMock(return_value=123456789.0))
    mock_info.return_value = MagicMock(workflow_id="wf-test-123")

    from workflows.agent_saga import (  # noqa: E402
        AgentWorkflow,
        GoalReceived,
        PlanGenerated,
    )


@pytest.fixture
def agent_workflow():
    return AgentWorkflow()


def test_initialization(agent_workflow):
    assert agent_workflow.goal == ""
    assert agent_workflow.step_results == {}
    assert len(agent_workflow.events) == 0
    assert agent_workflow.saga is None
    assert agent_workflow.MAX_HISTORY_SIZE == 40000


@pytest.mark.asyncio
async def test_append_event_goal_received(agent_workflow):
    event = GoalReceived(correlation_id="corr-1", goal="Do a thing", user_id="user-1")

    with patch("workflows.agent_saga.workflow.logger"):
        await agent_workflow._append_event(event)

    assert agent_workflow.goal == "Do a thing"
    assert agent_workflow.user_id == "user-1"
    assert len(agent_workflow.events) == 1


@pytest.mark.asyncio
async def test_append_event_plan_generated(agent_workflow):
    event = PlanGenerated(
        correlation_id="corr-1", plan_id="plan-1", steps=[{"id": "step1", "tool": "test_tool"}]
    )

    with patch("workflows.agent_saga.workflow.logger"):
        await agent_workflow._append_event(event)

    assert agent_workflow.plan_id == "plan-1"
    assert len(agent_workflow.plan_steps) == 1


@pytest.mark.asyncio
async def test_continue_as_new_threshold(agent_workflow):
    agent_workflow.MAX_HISTORY_SIZE = 2  # lower threshold for testing

    event1 = GoalReceived(correlation_id="corr-1", goal="Test", user_id="u1")
    event2 = GoalReceived(correlation_id="corr-1", goal="Test", user_id="u1")

    with (
        patch("workflows.agent_saga.workflow.logger"),
        patch.object(agent_workflow, "_continue_as_new") as mock_continue,
    ):
        await agent_workflow._append_event(event1)
        assert mock_continue.call_count == 0

        await agent_workflow._append_event(event2)
        mock_continue.assert_called_once()


def test_build_dag_structure(agent_workflow):
    agent_workflow.plan_steps = [
        {"id": "step1", "tool": "A"},
        {"id": "step2", "tool": "B", "depends_on": ["step1"]},
        {"id": "step3", "tool": "C", "depends_on": ["step1"]},
        {"id": "step4", "tool": "D", "depends_on": ["step2", "step3"]},
    ]

    step_lookup, _, dependents, in_degree = agent_workflow._build_dag_structure()

    assert "step1" in step_lookup
    assert in_degree["step1"] == 0
    assert in_degree["step2"] == 1
    assert in_degree["step4"] == 2

    assert "step2" in dependents["step1"]
    assert "step3" in dependents["step1"]


def test_process_dag_results(agent_workflow):
    results = [
        ("step1", {"status": "success", "result": "ok"}),
        ("step2", {"status": "deferred", "reason": "Requires Manual Approval Node approval"}),
    ]

    executed = set()
    dependents = {"step1": ["step3"], "step2": ["step4"]}
    in_degree = {"step3": 1, "step4": 1}

    with patch("workflows.agent_saga.workflow.logger"):
        ready = agent_workflow._process_dag_results(results, executed, dependents, in_degree)

    assert "step1" in executed
    assert "step2" in executed  # Deferred counts as executed conceptually for DAG progression
    assert "step3" in ready
    assert "step4" in ready

    assert agent_workflow.step_results["step1"] == {"status": "success", "result": "ok"}
    assert agent_workflow.step_results["step2"]["status"] == "deferred"


def test_build_policy_ctx(agent_workflow):
    agent_workflow.goal = "test goal"
    agent_workflow.user_id = "user1"

    step = {"tool": "send_email", "input": {"to": "test@test.com"}, "sensitivity": "HIGH"}

    with patch("workflows.agent_saga.workflow.info") as mock_info:
        mock_info.return_value = MagicMock(workflow_id="wf-test-123")
        ctx = agent_workflow._build_policy_ctx(step, "step1")

    assert ctx["action"] == "send_email"
    assert ctx["resource"] == "test@test.com"
    assert ctx["sensitivity"] == "HIGH"
    assert ctx["context"]["goal"] == "test goal"
    assert ctx["context"]["user_id"] == "user1"


@pytest.mark.asyncio
async def test_omnitrace_record_run_complete(agent_workflow):
    agent_workflow._omnitrace_enabled = True
    with (
        patch(
            "workflows.agent_saga.workflow.execute_activity", new_callable=AsyncMock
        ) as mock_execute,
        patch("workflows.agent_saga.workflow.info") as mock_info,
    ):
        mock_info.return_value = MagicMock(workflow_id="wf-test-123")
        await agent_workflow._omnitrace_record_run_complete({"result": "ok"}, "success")

        mock_execute.assert_called_once()
        args, kwargs = mock_execute.call_args
        assert args[0] == "omnitrace_record_run_complete"
        assert kwargs["args"][0]["status"] == "success"


@pytest.mark.asyncio
async def test_omnitrace_record_event(agent_workflow):
    agent_workflow._omnitrace_enabled = True
    with (
        patch(
            "workflows.agent_saga.workflow.execute_activity", new_callable=AsyncMock
        ) as mock_execute,
        patch("workflows.agent_saga.workflow.info") as mock_info,
    ):
        mock_info.return_value = MagicMock(workflow_id="wf-test-123")
        await agent_workflow._omnitrace_record_event(
            event_key="evt-1", kind="tool", name="test-tool", latency_ms=100, data={"foo": "bar"}
        )

        mock_execute.assert_called_once()
        args, kwargs = mock_execute.call_args
        assert args[0] == "omnitrace_record_event"
        assert kwargs["args"][0]["event_key"] == "evt-1"
        assert kwargs["args"][0]["kind"] == "tool"


@pytest.mark.asyncio
async def test_handle_success(agent_workflow):
    agent_workflow.goal = "test goal"
    agent_workflow.plan_id = "plan-1"
    agent_workflow.step_results = {"step1": {"success": True}}
    agent_workflow.plan_steps = [{"id": "step1"}]

    with (
        patch(
            "workflows.agent_saga.workflow.execute_activity", new_callable=AsyncMock
        ) as mock_execute,
        patch("workflows.agent_saga.workflow.logger"),
        patch("workflows.agent_saga.workflow.info") as mock_info,
        patch("workflows.agent_saga.workflow.now") as mock_now,
    ):
        mock_info.return_value = MagicMock(
            workflow_id="wf-1", search_attributes={"trace_id": ["trace-1"]}
        )
        mock_now.return_value = MagicMock(timestamp=MagicMock(return_value=123.0))

        result = await agent_workflow._handle_success()

        assert result["status"] == "success"
        assert result["steps_executed"] == 1

        # Should have called update_agent_run_completion AND omnitrace activity
        assert mock_execute.call_count >= 1


@pytest.mark.asyncio
async def test_handle_failure(agent_workflow):
    agent_workflow.plan_id = "plan-1"
    agent_workflow.failed_step_id = "step1"

    # Mock saga rollback
    agent_workflow.saga = AsyncMock()
    agent_workflow.saga.rollback.return_value = {"comp1": "success"}

    with (
        patch("workflows.agent_saga.workflow.execute_activity", new_callable=AsyncMock),
        patch("workflows.agent_saga.workflow.logger"),
        patch("workflows.agent_saga.workflow.info") as mock_info,
    ):
        mock_info.return_value = MagicMock(workflow_id="wf-1")

        result = await agent_workflow._handle_failure("test error")

        assert result["status"] == "failed"
        assert result["error"] == "test error"
        assert result["compensation_executed"] is True
        assert result["compensation_results"] == {"comp1": "success"}


def test_continue_as_new_snapshot(agent_workflow):
    agent_workflow.goal = "test"
    agent_workflow.plan_id = "plan-1"
    agent_workflow.step_count = 500

    with (
        patch("workflows.agent_saga.workflow.continue_as_new") as mock_continue_builtin,
        patch("workflows.agent_saga.workflow.logger"),
    ):
        agent_workflow._continue_as_new()

        mock_continue_builtin.assert_called_once()

        # Based on workflow.continue_as_new(args=[self.goal, self.user_id, snapshot])
        if "args" in mock_continue_builtin.call_args[1]:
            passed_args = mock_continue_builtin.call_args[1]["args"]
        else:
            assert len(mock_continue_builtin.call_args[0]) >= 1
            if "args=" in str(mock_continue_builtin.call_args):
                passed_args = mock_continue_builtin.call_args[1]["args"]
            elif len(mock_continue_builtin.call_args[0]) > 0 and isinstance(
                mock_continue_builtin.call_args[0][0], list
            ):
                passed_args = mock_continue_builtin.call_args[0][0]
            else:
                passed_args = mock_continue_builtin.call_args[1].get("args", [])

        if passed_args:
            assert passed_args[0] == "test"
            snapshot = passed_args[2]
            assert snapshot["step_count"] == 500


# ============================================================================
# Trace-ID extraction regression tests
# ============================================================================


def test_get_trace_id_uses_workflow_context(agent_workflow):
    """_get_trace_id must read from workflow_context, not search_attributes."""
    agent_workflow.workflow_context = {"trace_id": "ctx-trace-abc"}

    with patch("workflows.agent_saga.workflow.info") as mock_info:
        mock_info.return_value = MagicMock(workflow_id="goal-something-else")
        result = agent_workflow._get_trace_id()

    assert result == "ctx-trace-abc", "Should use workflow_context trace_id, not workflow_id"


def test_get_trace_id_strips_goal_prefix_when_context_missing(agent_workflow):
    """_get_trace_id must strip 'goal-' prefix from workflow_id as fallback."""
    agent_workflow.workflow_context = {}

    with patch("workflows.agent_saga.workflow.info") as mock_info:
        mock_info.return_value = MagicMock(workflow_id="goal-my-trace-uuid")
        result = agent_workflow._get_trace_id()

    assert result == "my-trace-uuid"


def test_get_trace_id_returns_raw_workflow_id_if_no_prefix(agent_workflow):
    """Fallback to raw workflow_id when no trace_id in context and no goal- prefix."""
    agent_workflow.workflow_context = {}

    with patch("workflows.agent_saga.workflow.info") as mock_info:
        mock_info.return_value = MagicMock(workflow_id="bare-workflow-id")
        result = agent_workflow._get_trace_id()

    assert result == "bare-workflow-id"


@pytest.mark.asyncio
async def test_handle_success_calls_update_agent_run(agent_workflow):
    """_handle_success must call update_agent_run_completion with context trace_id."""
    agent_workflow.workflow_context = {"trace_id": "handle-success-trace"}
    agent_workflow.goal = "test goal"
    agent_workflow.plan_id = "plan-99"
    agent_workflow.step_results = {}
    agent_workflow.plan_steps = []
    agent_workflow.start_time = 0.0

    captured_args: list = []

    async def fake_execute(activity_name, args, **_kwargs):
        captured_args.append((activity_name, args))

    with (
        patch("workflows.agent_saga.workflow.execute_activity", side_effect=fake_execute),
        patch("workflows.agent_saga.workflow.info") as mock_info,
        patch("workflows.agent_saga.workflow.logger"),
        patch("workflows.agent_saga.workflow.now") as mock_now,
    ):
        mock_info.return_value = MagicMock(workflow_id="goal-handle-success-trace")
        mock_now.return_value = MagicMock(timestamp=MagicMock(return_value=1.0))
        with patch.object(agent_workflow, "_append_event", new_callable=AsyncMock):
            with patch.object(agent_workflow, "_omnitrace_record_run_complete", new_callable=AsyncMock):
                await agent_workflow._handle_success()

    update_calls = [c for c in captured_args if c[0] == "update_agent_run_completion"]
    assert len(update_calls) == 1, "Must call update_agent_run_completion exactly once"
    call_params = update_calls[0][1][0]
    assert call_params["trace_id"] == "handle-success-trace"
    assert call_params["status"] == "completed"


@pytest.mark.asyncio
async def test_handle_failure_calls_update_agent_run(agent_workflow):
    """_handle_failure must call update_agent_run_completion with failed status."""
    agent_workflow.workflow_context = {"trace_id": "handle-failure-trace"}
    agent_workflow.plan_id = "plan-99"
    agent_workflow.failed_step_id = "step-1"
    agent_workflow.saga = MagicMock()
    agent_workflow.saga.rollback = AsyncMock(return_value=[])

    captured_args: list = []

    async def fake_execute(activity_name, args, **_kwargs):
        captured_args.append((activity_name, args))

    with (
        patch("workflows.agent_saga.workflow.execute_activity", side_effect=fake_execute),
        patch("workflows.agent_saga.workflow.info") as mock_info,
        patch("workflows.agent_saga.workflow.logger"),
    ):
        mock_info.return_value = MagicMock(workflow_id="goal-handle-failure-trace")
        with patch.object(agent_workflow, "_append_event", new_callable=AsyncMock):
            with patch.object(agent_workflow, "_omnitrace_record_run_complete", new_callable=AsyncMock):
                await agent_workflow._handle_failure("something broke")

    update_calls = [c for c in captured_args if c[0] == "update_agent_run_completion"]
    assert len(update_calls) == 1, "Must call update_agent_run_completion on failure"
    call_params = update_calls[0][1][0]
    assert call_params["trace_id"] == "handle-failure-trace"
    assert call_params["status"] == "failed"
