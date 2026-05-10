import pytest
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker
from workflows.sub_workflows import (
    PlanningWorkflow,
    ExecutionWorkflow,
    VerificationWorkflow,
)
from temporalio import activity


@activity.defn(name="generate_plan_with_llm")
async def dummy_generate_plan(goal: str, _context: dict) -> dict:
    return {"steps": [{"action": "test", "target": goal}]}


@pytest.mark.asyncio
async def test_planning_workflow():
    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="test-planning-queue",
            workflows=[PlanningWorkflow],
            activities=[dummy_generate_plan],
        ):
            # FIX: Temporal SDK execute_workflow() accepts at most one
            # positional arg after the workflow reference. Multiple
            # workflow params must be passed via the args= keyword.
            result = await env.client.execute_workflow(
                PlanningWorkflow.run,
                args=["test goal", {"info": "test"}],
                id="test-planning-id",
                task_queue="test-planning-queue",
            )
            assert result["steps"][0]["target"] == "test goal"


@pytest.mark.asyncio
async def test_execution_workflow():
    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="test-execution-queue",
            workflows=[ExecutionWorkflow],
        ):
            plan_steps = [{"action": "test1"}, {"action": "test2"}]
            # FIX: Same Temporal SDK signature issue — use args= keyword
            # for multi-param workflows instead of positional arguments.
            result = await env.client.execute_workflow(
                ExecutionWorkflow.run,
                args=[plan_steps, {"ctx": "test"}],
                id="test-execution-id",
                task_queue="test-execution-queue",
            )
            assert result["status"] == "executed"
            assert result["steps_run"] == 2


@pytest.mark.asyncio
async def test_verification_workflow():
    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(
            env.client,
            task_queue="test-verification-queue",
            workflows=[VerificationWorkflow],
        ):
            result = await env.client.execute_workflow(
                VerificationWorkflow.run,
                {"results": "test"},
                id="test-verification-id",
                task_queue="test-verification-queue",
            )
            assert result["status"] == "verified"
