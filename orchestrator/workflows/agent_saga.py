"""
Agent Workflow with Event Sourcing and Saga Pattern.

This module implements the core orchestration logic using Temporal.io workflows.

Key Concepts:

1. **Event Sourcing**: Workflow state is reconstructed by replaying AgentEvent sequence
   - Ensures deterministic replay (critical for Temporal)
   - Complete audit trail
   - Time-travel debugging

2. **Saga Pattern**: Compensation-based distributed transactions
   - Each successful step registers a compensation activity
   - On failure, compensations execute in LIFO order (rollback)
   - Example: BookFlight → compensation: CancelFlight

3. **Continue-As-New**: Workflow history truncation to prevent runaway memory
   - Temporal workflows have event history limits (~50K events)
   - Continue-as-new creates a new workflow instance with checkpoint state
   - Think of it like log compaction or Git history squashing

4. **Determinism**: Workflows MUST be deterministic for replay
   - No direct LLM calls (non-deterministic) - use Activities instead
   - No random numbers, system time, or network calls
   - All I/O via Activities

5. **DAG Execution**: True parallel execution for independent steps
   - Topological sort identifies execution order
   - Independent steps (no dependencies) execute in parallel via asyncio.gather
   - Steps with depends_on wait for their dependencies

Architecture:
    User Goal → Guardian Check → Semantic Cache Lookup →
    → [Cache Hit: Inject Params] OR [Cache Miss: LLM Plan Generation] →
    → Execute Steps (DAG) with Saga Compensation →
    → [Success: Store Result] OR [Failure: Rollback Saga]
"""

from datetime import timedelta
from typing import Any

from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ApplicationError

# Import our models and activities
with workflow.unsafe.imports_passed_through():
    from models.events import (
        AgentEvent,
        GoalReceived,
        PlanGenerated,
    )


# S6 structural split (600-line law): the saga compensation engine and the
# workflow's helper-method mixins live in sibling modules. Re-exported here so
# every existing import path (tests, main.py, server.py) is unchanged.
with workflow.unsafe.imports_passed_through():
    from workflows.agent_saga_execution import AgentSagaExecutionMixin
    from workflows.agent_saga_support import AgentSagaSupportMixin
    from workflows.saga_context import CompensationStep, SagaContext

__all__ = ["AgentWorkflow", "CompensationStep", "SagaContext"]

# ============================================================================
# AGENT WORKFLOW (Event Sourcing + Saga)
# ============================================================================


@workflow.defn
class AgentWorkflow(AgentSagaSupportMixin, AgentSagaExecutionMixin):
    """
    AI Agent Orchestration Workflow with Event Sourcing and Saga Pattern.

    This workflow orchestrates multi-step agent tasks with:
    - Semantic caching for latency reduction
    - Event sourcing for state management
    - Saga pattern for compensation
    - Reflexion-based error recovery

    Workflow Lifecycle:
    1. Receive goal (GoalReceived event)
    2. Check semantic cache
    3. Generate plan (cache hit → inject params, cache miss → LLM call)
    4. Execute plan steps (DAG traversal)
    5. Handle failures (retry → reflexion → saga rollback)
    6. Complete or fail (terminal state)

    Why Event Sourcing:
    - Temporal replays workflows from history on worker crashes
    - Event-based state ensures deterministic replay
    - Complete audit trail (every decision recorded)
    - Easy debugging (replay to any point in time)

    Continue-As-New:
    - Temporal limits workflow history to ~50K events
    - For long-running workflows, we snapshot state and start fresh
    - Think: Git history squashing or log compaction
    - Triggered when event list exceeds MAX_HISTORY_SIZE
    """

    def __init__(self) -> None:
        """Initialize workflow state."""
        # Event sourcing: State reconstructed from events
        self.events: list[AgentEvent] = []

        # Saga context for compensations
        self.saga: SagaContext | None = None

        # Derived state (computed from events)
        self.goal: str = ""
        self.user_id: str = ""
        self.plan_id: str = ""
        self.plan_steps: list[dict[str, Any]] = []
        self.step_results: dict[str, Any] = {}
        self.failed_step_id: str = ""

        # MAN Mode: pending Manual Approval Node decisions (step_id -> decision)
        self.pending_decisions: dict[str, dict[str, Any]] = {}

        # MAN Mode 2.0: deferred steps awaiting approval
        self.deferred_steps: dict[str, dict[str, Any]] = {}

        # Operator supremacy: admin control flags
        self._admin_paused: bool = False
        self._cancelled_steps: set[str] = set()

        # Continue-as-new threshold
        self.MAX_HISTORY_SIZE = 40000
        self.step_count = 0
        self.start_time: float | None = None
        self.workflow_context: dict[str, Any] = {}

        # OmniTrace: track whether recording is enabled for this run
        self._omnitrace_enabled: bool = False

        # BYOM: pilot session ID (bound when credential_type == 'byom')
        self._pilot_session_id: str | None = None

    # =========================================================================
    # OPERATOR SUPREMACY SIGNALS (MAN Mode 2.0)
    # =========================================================================

    @workflow.signal
    async def admin_pause(self) -> None:
        """
        Pause workflow execution.

        Workflow will wait until admin_resume is called.
        """
        self._admin_paused = True
        workflow.logger.warning("⏸️  Workflow paused by admin")

    @workflow.signal
    async def admin_resume(self) -> None:
        """Resume paused workflow execution."""
        self._admin_paused = False
        workflow.logger.info("▶️  Workflow resumed by admin")

    @workflow.signal
    async def admin_stop(self, reason: str = "Admin stop") -> None:
        """
        Terminate workflow immediately.

        This is a hard stop - workflow will fail with non-retryable error.
        """
        workflow.logger.error(f"🛑 Workflow stopped by admin: {reason}")
        raise ApplicationError(
            f"Workflow stopped by admin: {reason}",
            non_retryable=True,
        )

    @workflow.signal
    async def admin_cancel_step(self, step_id: str) -> None:
        """
        Cancel a specific pending step.

        If step is in-flight, it will be skipped.
        If step is deferred, it will be marked as cancelled.
        """
        self._cancelled_steps.add(step_id)
        workflow.logger.warning(f"🚫 Step {step_id} cancelled by admin")

    # =========================================================================
    # MAN MODE SIGNAL HANDLER (for audit)
    # =========================================================================

    @workflow.signal
    async def submit_man_decision(self, decision: dict[str, Any]) -> None:
        """
        Receive Manual Approval Node decision handling for MAN task (for audit logging).

        Called by external system (API endpoint) when an authorized operator makes a decision.
        Since the workflow does NOT block on RED lane actions, this signal
        is used for audit logging and potential future re-execution support.

        Note: The isolated action is NOT automatically re-executed on approval.
        Re-execution requires a separate workflow or manual trigger.

        Args:
            decision: Dict with keys:
                - step_id: str (identifies the isolated step)
                - status: "APPROVED"|"DENIED"
                - reason: str (optional)
                - decided_by: str (user who made decision)
        """
        step_id = decision.get("step_id", "")
        status = decision.get("status", "UNKNOWN")

        workflow.logger.info(f"📥 Received MAN decision for step '{step_id}': {status}")

        # Store decision for audit trail
        self.pending_decisions[step_id] = decision

    @workflow.run
    async def run(
        self, goal: str, user_id: str, context: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """
        Main workflow entry point.

        Args:
            goal: User's natural language goal
            user_id: User ID
            context: Additional context OR snapshot from continue-as-new

        Returns:
            Workflow result with plan execution details

        Raises:
            ApplicationError: If workflow fails after exhausting retries
        """
        correlation_id = workflow.info().workflow_id

        # Record start time for continue-as-new threshold.
        # Uses workflow.now() — deterministic Temporal clock, safe for replay.
        if self.start_time is None:
            self.start_time = workflow.now().timestamp()

        # Initialize Saga context
        self.saga = SagaContext(workflow_instance=self)
        self.workflow_context = context or {}

        # Restore snapshot if this is a continue-as-new
        if context and "step_results" in context:
            workflow.logger.info("♻️  Restoring from continue-as-new snapshot")
            self.goal = context.get("goal", goal)
            self.user_id = context.get("user_id", user_id)
            self.plan_id = context.get("plan_id", "")
            self.plan_steps = context.get("plan_steps", [])
            self.step_results = context.get("step_results", {})
            self.pending_decisions = context.get("pending_decisions", {})
            self.deferred_steps = context.get("deferred_steps", {})
            self.step_count = context.get("step_count", 0)
            self.failed_step_id = context.get("failed_step_id", "")

            workflow.logger.info(
                f"✓ Snapshot restored: {len(self.step_results)} steps, "
                f"{len(self.deferred_steps)} deferred"
            )

            # If we have a plan, skip planning and go straight to execution
            if self.plan_steps:
                await self._execute_plan()
                return await self._handle_success()

        try:
            # 1. Record goal received
            await self._append_event(
                GoalReceived(
                    correlation_id=correlation_id,
                    goal=goal,
                    user_id=user_id,
                    context=context,
                )
            )

            # 1b. OmniTrace: Record run start (best-effort)
            await self._omnitrace_record_run_start({
                "goal": goal,
                "user_id": user_id,
                "context": context or {},
            })

            # 1c. BYOM: Mint pilot session if credential_type is 'byom'
            await self._mint_pilot_session_if_byom(user_id, context or {})

            # 2. Try semantic cache lookup
            cached_plan = await self._check_semantic_cache(goal)

            # 3. Generate plan (use cache or call LLM)
            if cached_plan:
                template_id = cached_plan["template_id"]
                workflow.logger.info(f"✓ Cache HIT - using cached plan: {template_id}")
                await self._append_event(
                    PlanGenerated(
                        correlation_id=correlation_id,
                        plan_id=cached_plan["plan_id"],
                        steps=cached_plan["steps"],
                        cache_hit=True,
                        template_id=cached_plan.get("template_id"),
                        estimated_duration_seconds=None,
                    )
                )
            else:
                workflow.logger.info("✗ Cache MISS - generating fresh plan via LLM")
                plan = await self._generate_plan_with_llm(goal, context or {})
                await self._append_event(
                    PlanGenerated(
                        correlation_id=correlation_id,
                        plan_id=plan["plan_id"],
                        steps=plan["steps"],
                        cache_hit=False,
                        template_id=None,
                        estimated_duration_seconds=None,
                    )
                )

            # 4. Execute plan steps (DAG traversal)
            await self._execute_plan()

            # 5. Workflow succeeded
            # Return final result
            return await self._handle_success()

        except Exception as e:
            # 6. Workflow failed - trigger Saga rollback
            workflow.logger.error(f"✗ Workflow failed: {e!s}")
            workflow_result = await self._handle_failure(str(e))

            raise ApplicationError(
                f"Workflow failed: {e!s}",
                workflow_result,
                non_retryable=True,
            ) from e

    # =========================================================================
    # OMNITRACE HELPERS (Best-effort telemetry - never breaks workflow)
    # =========================================================================

    async def _append_event(self, event: AgentEvent) -> None:
        """
        Append event to event log (Event Sourcing).

        Also checks for continue-as-new threshold to prevent runaway history.

        Why continue-as-new:
        - Temporal workflows store full event history
        - Large histories (>50K events) cause performance degradation
        - Continue-as-new snapshots state and starts fresh workflow
        - Old history is archived, new workflow continues from checkpoint
        """
        self.events.append(event)

        # Update derived state based on event type
        if isinstance(event, GoalReceived):
            self.goal = event.goal
            self.user_id = event.user_id
        elif isinstance(event, PlanGenerated):
            self.plan_id = event.plan_id
            self.plan_steps = event.steps

        # Check for continue-as-new threshold
        if len(self.events) >= self.MAX_HISTORY_SIZE:
            workflow.logger.warning(
                f"Event history size ({len(self.events)}) exceeded threshold "
                f"({self.MAX_HISTORY_SIZE}) - triggering continue-as-new"
            )
            self._continue_as_new()

        # Also check step count threshold
        if self.step_count > 0 and self.step_count % 100 == 0:
            workflow.logger.info(f"Step count checkpoint: {self.step_count}")
            # Consider continue-as-new for long-running workflows
            if self.step_count >= 500:
                workflow.logger.warning(
                    f"Step count ({self.step_count}) exceeded threshold - "
                    "triggering continue-as-new"
                )
                self._continue_as_new()

    def _continue_as_new(self) -> None:
        """
        Snapshot state and continue workflow with fresh history.

        This prevents Temporal history from growing unbounded.
        Think of it like Git history squashing or log compaction.
        """
        workflow.logger.info("📸 Snapshotting workflow state for continue-as-new")

        # Create snapshot with all essential state
        snapshot = {
            "goal": self.goal,
            "user_id": self.user_id,
            "plan_id": self.plan_id,
            "plan_steps": self.plan_steps,
            "step_results": self.step_results,
            "pending_decisions": self.pending_decisions,
            "deferred_steps": self.deferred_steps,
            "step_count": self.step_count,
            "failed_step_id": self.failed_step_id,
        }

        workflow.logger.info(
            f"✓ Snapshot created: {len(self.step_results)} steps completed, "
            f"{len(self.deferred_steps)} deferred, "
            f"{len(self.pending_decisions)} pending decisions"
        )

        # Continue as new with snapshot as context
        workflow.continue_as_new(args=[self.goal, self.user_id, snapshot])

    async def _execute_activity(
        self,
        activity_name: str,
        activity_input: Any,
        is_compensation: bool = False,
        _step_id: str = "",  # Unused but kept for consistency
    ) -> Any:
        """
        Execute Temporal activity with retry policy.

        Activities are the ONLY way to perform I/O in workflows (determinism requirement).
        """
        # Default timeout
        timeout = timedelta(minutes=5)

        if is_compensation:
            timeout = timedelta(seconds=15)  # Shorter timeout for compensations

        return await workflow.execute_activity(
            activity_name,
            args=[activity_input],
            start_to_close_timeout=timeout,
            retry_policy=RetryPolicy(
                maximum_attempts=3 if not is_compensation else 2,
                initial_interval=timedelta(seconds=1),
                backoff_coefficient=2.0,
                maximum_interval=timedelta(seconds=10),
            ),
        )
