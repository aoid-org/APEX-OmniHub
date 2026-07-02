"""
AgentWorkflow execution mixin: DAG plan execution and single-step execution
with saga compensation registration (S6 split of workflows/agent_saga.py).
Patched names resolve late via ``_ns()`` — see saga_context.py.
"""

import sys
from datetime import timedelta
from typing import TYPE_CHECKING, Any

from temporalio.common import RetryPolicy
from temporalio.exceptions import ActivityError, ApplicationError

from models.events import ToolCallRequested, ToolResultReceived
from models.man_mode import create_idempotency_key


def _ns():
    """Late-bound workflows.agent_saga namespace (mock.patch semantics)."""
    return sys.modules["workflows.agent_saga"]


class AgentSagaExecutionMixin:
    """Undecorated helper methods for AgentWorkflow (state lives on the workflow)."""

    if TYPE_CHECKING:
        # State/methods live on AgentWorkflow; declared for mypy only.
        plan_steps: list[dict[str, Any]]
        step_count: int
        deferred_steps: dict[str, Any]
        saga: Any
        _admin_paused: bool
        _cancelled_steps: set[str]

        async def _append_event(self, event: Any) -> None: ...
        async def _omnitrace_record_event(self, *args: Any, **kwargs: Any) -> None: ...
        def _build_dag_structure(self) -> Any: ...
        def _build_policy_ctx(self, step: dict[str, Any], step_id: str) -> dict[str, Any]: ...
        async def _execute_dag_level(self, *args: Any, **kwargs: Any) -> Any: ...
        def _process_dag_results(self, *args: Any, **kwargs: Any) -> Any: ...

    async def _execute_plan(self) -> None:
        """
        Execute plan steps in dependency order (DAG traversal with parallel execution).

        DAG Execution Algorithm:
        1. Build dependency graph from step.depends_on fields
        2. Topological sort to find execution levels
        3. Execute steps at same level in parallel via asyncio.gather
        4. Pass results to dependent steps
        """
        # Build DAG structure
        step_lookup, _, dependents, in_degree = self._build_dag_structure()

        # Find all steps with no dependencies (ready to execute)
        ready_queue = [step_id for step_id, degree in in_degree.items() if degree == 0]
        executed: set[str] = set()
        level = 1

        _ns().workflow.logger.info(
            f"🔀 DAG Execution: {len(self.plan_steps)} steps, "
            f"{len(ready_queue)} initial parallel steps"
        )

        while ready_queue:
            # Execute current level in parallel
            level_results = await self._execute_dag_level(ready_queue, step_lookup, level)

            # Process results and get next ready steps
            ready_queue = self._process_dag_results(level_results, executed, dependents, in_degree)
            level += 1

        # Verify all steps executed (detect cycles)
        if len(executed) != len(self.plan_steps):
            missing = set(step_lookup.keys()) - executed
            raise ApplicationError(
                f"DAG cycle detected or missing dependencies: {missing}",
                non_retryable=True,
            )

        _ns().workflow.logger.info(
            f"✓ DAG execution complete: {len(executed)} steps in {level - 1} levels"
        )

    async def _execute_single_step(self, step: dict[str, Any], step_id: str) -> dict[str, Any]:
        """
        Execute a single step with event logging and compensation registration.

        Includes MAN Mode safety gate:
        - BLOCKED lane: Action is prohibited, raises ApplicationError
        - RED lane: Action is DEFERRED (not executed), sent to a Manual Approval Node checkpoint
        - YELLOW lane: Action executes with audit logging
        - GREEN lane: Action executes normally

        The workflow does NOT pause for RED lane actions. Instead, the action
        is deferred and a MAN task is created for Manual Approval Node review. The workflow
        continues with other steps while the deferred action awaits approval.

        Re-entry: Periodically checks for approved deferred steps and executes them.

        Args:
            step: Step definition from plan
            step_id: Unique step identifier

        Returns:
            Step execution result, or deferred result for RED lane actions:
            {"status": "deferred", "man_task_id": "...", "awaiting_approval": True}

        Raises:
            ActivityError: If step fails after retries
            ApplicationError: If action is blocked by policy or cancelled by admin
        """
        step_name = step.get("name", step_id)

        # Check if step was cancelled by admin
        if step_id in self._cancelled_steps:
            _ns().workflow.logger.warning(f"  🚫 Step {step_name} cancelled by admin")
            return {"status": "cancelled", "reason": "Cancelled by admin"}

        # Check if admin paused _ns().workflow.
        # _ns().workflow.sleep() is the deterministic Temporal-safe alternative to asyncio.sleep().
        while self._admin_paused:
            _ns().workflow.logger.info("⏸️  Workflow paused, waiting for resume...")
            await _ns().workflow.sleep(timedelta(seconds=5))

        _ns().workflow.logger.info(f"  ⚙ Starting step: {step_name}")
        self.step_count += 1

        # =====================================================================
        # OmniPolicy choke point (cached, deterministic)
        # =====================================================================
        policy_ctx = self._build_policy_ctx(step, step_id)
        policy_result = await _ns().workflow.execute_activity(
            "evaluate_policy",
            args=[policy_ctx],
            start_to_close_timeout=timedelta(seconds=15),
            retry_policy=RetryPolicy(maximum_attempts=2),
        )

        decision = policy_result.get("decision", "ALLOW")
        if decision == "DENY":
            _ns().workflow.logger.error(
                f"  🚫 Policy DENY: {step['tool']} - {policy_result.get('reason')}"
            )
            raise ApplicationError(
                f"Action denied by policy: {policy_result.get('reason')}",
                non_retryable=True,
            )

        if decision == "DEFER":
            _ns().workflow.logger.warning(
                f"  🛑 Policy DEFER: {step['tool']} - awaiting MAN approval"
            )

            idempotency_key = create_idempotency_key(
                _ns().workflow.info().workflow_id,
                step_id,
                tool_name=step.get("tool"),
                namespace="man",
            )

            man_task_result = await _ns().workflow.execute_activity(
                "create_man_task",
                args=[
                    {
                        "workflow_id": _ns().workflow.info().workflow_id,
                        "step_id": step_id,
                        "intent": {
                            "tool_name": step["tool"],
                            "params": step.get("input", {}),
                            "workflow_id": _ns().workflow.info().workflow_id,
                            "step_id": step_id,
                            "irreversible": step.get("irreversible", False),
                        },
                        "triage_result": policy_result,
                        "timeout_hours": 24,
                        "idempotency_key": idempotency_key,
                    }
                ],
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=RetryPolicy(maximum_attempts=3),
            )

            deferred_result = {
                "status": "deferred",
                "reason": policy_result.get("reason", "Requires Manual Approval Node approval"),
                "man_task_id": man_task_result.get("task_id"),
                "step_id": step_id,
                "tool_name": step["tool"],
                "awaiting_approval": True,
                "policy": policy_result,
            }

            self.deferred_steps[step_id] = {
                "step": step,
                "man_task_id": man_task_result.get("task_id"),
                "triage_result": policy_result,
            }

            await self._append_event(
                ToolResultReceived(
                    correlation_id=_ns().workflow.info().workflow_id,
                    tool_name=step["tool"],
                    step_id=step_id,
                    success=True,
                    result=deferred_result,
                    error=None,
                )
            )
            return deferred_result

        # =====================================================================
        # MAN MODE: Risk Triage
        # =====================================================================
        triage_result = await _ns().workflow.execute_activity(
            "risk_triage",
            args=[
                {
                    "tool_name": step["tool"],
                    "params": step.get("input", {}),
                    "workflow_id": _ns().workflow.info().workflow_id,
                    "step_id": step_id,
                    "irreversible": step.get("irreversible", False),
                }
            ],
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(maximum_attempts=2),
        )

        lane = triage_result.get("lane", "GREEN")

        # BLOCKED lane: never execute
        if lane == "BLOCKED":
            _ns().workflow.logger.error(
                f"  🚫 BLOCKED: {step['tool']} - {triage_result.get('reason')}"
            )
            raise ApplicationError(
                f"Action blocked by policy: {triage_result.get('reason')}",
                non_retryable=True,
            )

        # RED lane: defer action and send to a Manual Approval Node checkpoint (non-blocking)
        if lane == "RED":
            _ns().workflow.logger.warning(
                "  🛑 MAN Mode: Deferring %s - sent to a Manual Approval Node checkpoint",
                step["tool"],
            )

            # Create MAN task in database for Manual Approval Node review
            man_task_result = await _ns().workflow.execute_activity(
                "create_man_task",
                args=[
                    {
                        "workflow_id": _ns().workflow.info().workflow_id,
                        "step_id": step_id,
                        "intent": {
                            "tool_name": step["tool"],
                            "params": step.get("input", {}),
                            "workflow_id": _ns().workflow.info().workflow_id,
                            "step_id": step_id,
                            "irreversible": step.get("irreversible", False),
                        },
                        "triage_result": triage_result,
                        "timeout_hours": triage_result.get("suggested_timeout_hours", 24),
                    }
                ],
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=RetryPolicy(maximum_attempts=3),
            )

            # Store as deferred step for potential re-entry
            self.deferred_steps[step_id] = {
                "step": step,
                "man_task_id": man_task_result.get("task_id"),
                "triage_result": triage_result,
            }

            # Return deferred result - workflow continues without blocking
            deferred_result = {
                "status": "deferred",
                "reason": triage_result.get("reason", "Requires Manual Approval Node approval"),
                "man_task_id": man_task_result.get("task_id"),
                "step_id": step_id,
                "tool_name": step["tool"],
                "awaiting_approval": True,
            }

            _ns().workflow.logger.info(
                f"  📤 Step '{step_name}' deferred - MAN task {man_task_result.get('task_id')}"
            )

            # Record the deferred action as a tool call (not executed)
            await self._append_event(
                ToolResultReceived(
                    correlation_id=_ns().workflow.info().workflow_id,
                    tool_name=step["tool"],
                    step_id=step_id,
                    success=True,  # Step completed (deferred), not failed
                    result=deferred_result,
                    error=None,
                )
            )

            return deferred_result

        # =====================================================================
        # IRON LAW: Physical AI Verification (before hardware actuation)
        # =====================================================================
        physical_actuator_tools = [
            "actuate_lock",
            "actuate_valve",
            "move_robot",
            "execute_trajectory",
        ]

        if step["tool"] in physical_actuator_tools:
            _ns().workflow.logger.warning(
                f"  🔒 Physical actuator detected: {step['tool']} - running Iron Law verification"
            )

            iron_law_result = await _ns().workflow.execute_activity(
                "verify_deductive_path",
                args=[
                    {
                        "intent": step.get("name", step["tool"]),
                        "target_state": step.get("input", {}),
                        "device_id": step.get("input", {}).get("device_id", "unknown"),
                        "workflow_id": _ns().workflow.info().workflow_id,
                    }
                ],
                start_to_close_timeout=timedelta(seconds=15),
                retry_policy=RetryPolicy(maximum_attempts=2),
            )

            if not iron_law_result.get("verified", False):
                _ns().workflow.logger.error(
                    f"  ❌ Iron Law REJECTED: {step['tool']} - {iron_law_result.get('reason')}"
                )

                # If logic delta exceeds threshold, escalate to MAN Mode
                if iron_law_result.get("escalateToMan", False):
                    _ns().workflow.logger.warning(f"  🚨 Escalating to MAN Mode: {step['tool']}")

                    man_task_result = await _ns().workflow.execute_activity(
                        "create_man_task",
                        args=[
                            {
                                "workflow_id": _ns().workflow.info().workflow_id,
                                "step_id": step_id,
                                "intent": {
                                    "tool_name": step["tool"],
                                    "params": step.get("input", {}),
                                    "iron_law_reason": iron_law_result.get("reason"),
                                },
                                "triage_result": {
                                    "lane": "RED",
                                    "reason": (
                                        f"Iron Law verification failed: "
                                        f"{iron_law_result.get('reason')}"
                                    ),
                                },
                                "timeout_hours": 24,
                            }
                        ],
                        start_to_close_timeout=timedelta(seconds=30),
                        retry_policy=RetryPolicy(maximum_attempts=3),
                    )

                    deferred_result = {
                        "status": "deferred",
                        "reason": iron_law_result.get("reason"),
                        "man_task_id": man_task_result.get("task_id"),
                        "iron_law_verified": False,
                    }

                    await self._append_event(
                        ToolResultReceived(
                            correlation_id=_ns().workflow.info().workflow_id,
                            tool_name=step["tool"],
                            step_id=step_id,
                            success=True,
                            result=deferred_result,
                            error=None,
                        )
                    )

                    return deferred_result

                # Not MAN Mode, but still rejected - hard fail
                raise ApplicationError(
                    f"Iron Law verification failed: {iron_law_result.get('reason')}",
                    non_retryable=True,
                )

            _ns().workflow.logger.info(
                f"  ✅ Iron Law APPROVED: {step['tool']} - logic delta: "
                f"{iron_law_result.get('logicDelta', 0):.2f}"
            )

        # =====================================================================
        # Execute the tool (GREEN or YELLOW lanes only - RED is isolated above)
        # =====================================================================

        # Record tool call request
        await self._append_event(
            ToolCallRequested(
                correlation_id=_ns().workflow.info().workflow_id,
                tool_name=step["tool"],
                tool_input=step.get("input", {}),
                step_id=step_id,
                compensation_activity=step.get("compensation"),
            )
        )

        # Track execution time for OmniTrace.
        # _ns().workflow.now() is deterministic — safe for Temporal replay.
        tool_start_time = _ns().workflow.now().timestamp()
        attempt = 1  # Could be incremented on retry if needed

        try:
            assert self.saga is not None
            result = await self.saga.execute_with_compensation(
                activity_name=step["tool"],
                activity_input=step.get("input", {}),
                compensation_activity=step.get("compensation"),
                compensation_input=step.get("compensation_input"),
                step_id=step_id,
            )

            # Calculate latency
            latency_ms = int((_ns().workflow.now().timestamp() - tool_start_time) * 1000)

            # Record success
            await self._append_event(
                ToolResultReceived(
                    correlation_id=_ns().workflow.info().workflow_id,
                    tool_name=step["tool"],
                    step_id=step_id,
                    success=True,
                    result=result,
                    error=None,
                )
            )

            # OmniTrace: Record tool event (best-effort)
            await self._omnitrace_record_event(
                event_key=f"tool:{step_id}:{step['tool']}:{attempt}",
                kind="tool",
                name=step["tool"],
                latency_ms=latency_ms,
                data={
                    "step_id": step_id,
                    "tool": step["tool"],
                    "success": True,
                    "lane": lane,
                },
            )

            _ns().workflow.logger.info(f"  ✓ Completed step: {step_name}")
            return result

        except ActivityError as e:
            # Calculate latency
            latency_ms = int((_ns().workflow.now().timestamp() - tool_start_time) * 1000)

            # Record failure
            await self._append_event(
                ToolResultReceived(
                    correlation_id=_ns().workflow.info().workflow_id,
                    tool_name=step["tool"],
                    step_id=step_id,
                    success=False,
                    result=None,
                    error=str(e),
                )
            )

            # OmniTrace: Record tool failure event (best-effort)
            await self._omnitrace_record_event(
                event_key=f"tool:{step_id}:{step['tool']}:{attempt}",
                kind="tool",
                name=step["tool"],
                latency_ms=latency_ms,
                data={
                    "step_id": step_id,
                    "tool": step["tool"],
                    "success": False,
                    "error": str(e)[:200],  # Truncate error message
                    "lane": lane,
                },
            )

            _ns().workflow.logger.error(f"  ✗ Failed step: {step_name} - {e!s}")
            raise
