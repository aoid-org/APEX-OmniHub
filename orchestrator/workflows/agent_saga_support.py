"""
AgentWorkflow support mixin: OmniTrace telemetry, semantic-cache and
plan-generation activity calls, DAG structure helpers, success/failure handlers.

Split from workflows/agent_saga.py (S6, 600-line law) — pure structural move.
Names that tests patch on the workflows.agent_saga namespace (notably
``workflow``) are resolved late through ``_ns()`` so existing patches keep
governing this code exactly as before the split.
"""

import asyncio
import sys
from collections import defaultdict
from datetime import timedelta
from typing import TYPE_CHECKING, Any

from temporalio.common import RetryPolicy
from temporalio.exceptions import ActivityError

from models.events import WorkflowCompleted, WorkflowFailed


def _ns():
    """Late-bound workflows.agent_saga module namespace.

    Resolved through ``sys.modules`` — the same way ``unittest.mock.patch``
    resolves dotted targets — so existing test patches on workflows.agent_saga
    govern this code exactly as before the S6 split.
    """
    return sys.modules["workflows.agent_saga"]


class AgentSagaSupportMixin:
    """Undecorated helper methods for AgentWorkflow (state lives on the workflow)."""

    if TYPE_CHECKING:
        # Shared workflow state and cross-module methods live on AgentWorkflow
        # (workflows/agent_saga.py); declared here so mypy can type-check the
        # mixin in isolation. Zero runtime effect.
        goal: str
        user_id: str
        plan_id: str
        plan_steps: list[dict[str, Any]]
        step_results: dict[str, Any]
        step_count: int
        start_time: Any
        workflow_context: dict[str, Any]
        deferred_steps: dict[str, Any]
        saga: Any
        _admin_paused: bool
        _cancelled_steps: set[str]

        async def _append_event(self, event: Any) -> None: ...
        async def _execute_single_step(
            self, step: dict[str, Any], step_id: str
        ) -> dict[str, Any]: ...

    def _get_trace_id(self) -> str:
        """Get trace_id from workflow_context, falling back to workflow_id (strips goal- prefix)."""
        trace_id = self.workflow_context.get("trace_id")
        if trace_id:
            return str(trace_id)
        wf_id = _ns().workflow.info().workflow_id
        if wf_id.startswith("goal-"):
            return wf_id[5:]
        return wf_id

    async def _execute_omnitrace_activity(
        self, activity_name: str, args: dict[str, Any], timeout_seconds: int = 5
    ) -> Any:
        """Execute OmniTrace activity with common parameters (best-effort)."""
        try:
            # Common arguments
            args.update({
                "workflow_id": _ns().workflow.info().workflow_id,
                "trace_id": self._get_trace_id(),
            })

            return await _ns().workflow.execute_activity(
                activity_name,
                args=[args],
                start_to_close_timeout=timedelta(seconds=timeout_seconds),
                retry_policy=RetryPolicy(maximum_attempts=1),  # No retries for telemetry
            )
        except Exception as e:
            _ns().workflow.logger.warning(
                f"OmniTrace activity {activity_name} failed (ignored): {e}"
            )
            return None

    async def _omnitrace_record_run_start(self, input_data: dict[str, Any]) -> None:
        """Record workflow run start via OmniTrace (best-effort)."""
        result = await self._execute_omnitrace_activity(
            "omnitrace_record_run_start",
            {
                "user_id": self.user_id,
                "input_data": input_data,
                "status": "running",
            },
        )
        if result:
            self._omnitrace_enabled = result.get("sampled", False)

    async def _omnitrace_record_run_complete(
        self, output_data: dict[str, Any] | None, status: str
    ) -> None:
        """Record workflow run completion via OmniTrace (best-effort)."""
        if not self._omnitrace_enabled:
            return

        await self._execute_omnitrace_activity(
            "omnitrace_record_run_complete",
            {
                "output_data": output_data,
                "status": status,
            },
        )

    async def _omnitrace_record_event(
        self,
        event_key: str,
        kind: str,
        name: str,
        latency_ms: int | None = None,
        data: dict[str, Any] | None = None,
    ) -> None:
        """Record workflow event via OmniTrace (best-effort)."""
        if not self._omnitrace_enabled:
            return

        await self._execute_omnitrace_activity(
            "omnitrace_record_event",
            {
                "event_key": event_key,
                "kind": kind,
                "name": name,
                "latency_ms": latency_ms,
                "data": data,
            },
            timeout_seconds=3,
        )

    async def _mint_pilot_session_if_byom(self, user_id: str, context: dict[str, Any]) -> None:
        """
        Mint a pilot session if the run uses a BYOM credential.

        Checks context for credential_type == 'byom'. If present, calls the
        mint_pilot_session activity and binds the returned pilot_session_id
        to the workflow context for downstream proxy use.
        """
        credential_type = context.get("credential_type", "")
        if credential_type != "byom":
            return

        connection_id = context.get("connection_id")
        if not connection_id:
            _ns().workflow.logger.warning(
                "BYOM credential_type set but no connection_id — skipping mint"
            )
            return

        try:
            result = await _ns().workflow.execute_activity(
                "mint_pilot_session",
                args=[
                    {
                        "user_id": user_id,
                        "tenant_id": context.get("tenant_id", user_id),
                        "connection_id": connection_id,
                        "trace_id": _ns().workflow.info().workflow_id,
                        "model": context.get("model", "gpt-4o"),
                        "sovereignty_mode": context.get("sovereignty_mode", "standard"),
                        "policy_snapshot_hash": context.get("policy_snapshot_hash", ""),
                    }
                ],
                start_to_close_timeout=timedelta(seconds=15),
                retry_policy=RetryPolicy(maximum_attempts=2),
            )

            if result.get("success"):
                self._pilot_session_id = result["pilot_session_id"]
                self.workflow_context["pilot_session_id"] = self._pilot_session_id
                _ns().workflow.logger.info(f"✓ Pilot session minted: {self._pilot_session_id}")
            else:
                _ns().workflow.logger.warning(f"Pilot session mint failed: {result.get('error')}")

        except Exception as e:
            # Best-effort — don't crash the workflow if minting fails
            _ns().workflow.logger.warning(f"Pilot session mint error (non-fatal): {e}")

    async def _check_semantic_cache(self, goal: str) -> dict[str, Any] | None:
        """
        Check semantic cache for existing plan template.

        This is an Activity (not direct Redis call) to maintain determinism.
        """
        try:
            result = await _ns().workflow.execute_activity(
                "check_semantic_cache",
                args=[goal],
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=RetryPolicy(maximum_attempts=2),
            )
            return result if result else None
        except ActivityError:
            _ns().workflow.logger.warning("Semantic cache lookup failed - proceeding without cache")
            return None

    async def _generate_plan_with_llm(self, goal: str, context: dict[str, Any]) -> dict[str, Any]:
        """
        Generate execution plan using LLM.

        This MUST be an Activity (not direct LLM call) because:
        - LLM calls are non-deterministic (same input ≠ same output)
        - Temporal replays workflows → direct calls would re-execute
        - Activities are recorded in history → replay uses cached result

        The activity also stores the plan in semantic cache for future hits.
        """
        result = await _ns().workflow.execute_activity(
            "generate_plan_with_llm",
            args=[goal, context],
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(
                maximum_attempts=3,
                initial_interval=timedelta(seconds=1),
                backoff_coefficient=2.0,
            ),
        )
        return dict(result)

    def _build_dag_structure(
        self,
    ) -> tuple[
        dict[str, dict[str, Any]],
        dict[str, list[str]],
        dict[str, list[str]],
        dict[str, int],
    ]:
        """
        Build DAG dependency graph from plan steps.

        Returns:
            Tuple of (step_lookup, dependencies, dependents, in_degree)
        """
        step_lookup = {}
        dependencies: dict[str, list[str]] = defaultdict(list)
        dependents: dict[str, list[str]] = defaultdict(list)

        for idx, step in enumerate(self.plan_steps):
            # Optimization: Avoid redundant get() and eager string formatting
            step_id = step.get("id")
            if step_id is None:
                step_id = f"step_{idx}"

            step_lookup[step_id] = step

            deps = step.get("depends_on")
            if deps is None:
                deps = []
            elif isinstance(deps, str):
                deps = [deps]

            dependencies[step_id] = deps
            for dep in deps:
                dependents[dep].append(step_id)

        # Calculate in-degrees for topological sort
        in_degree = {step_id: len(deps) for step_id, deps in dependencies.items()}

        return step_lookup, dependencies, dependents, in_degree

    def _build_policy_ctx(self, step: dict[str, Any], step_id: str) -> dict[str, Any]:
        """
        Build bounded policy context for OmniPolicy evaluation.
        """
        input_payload = step.get("input", {}) or {}
        resource = (
            input_payload.get("table") or input_payload.get("resource") or input_payload.get("to")
        )
        data_class = input_payload.get("data_class") or input_payload.get("classification")

        return {
            "tenant_id": self.workflow_context.get("tenant_id") or self.user_id,
            "user_id": self.user_id,
            "workflow_id": _ns().workflow.info().workflow_id,
            "step_id": step_id,
            "tool": step.get("tool"),
            "action": step.get("name") or step.get("action") or step.get("tool"),
            "resource": resource,
            "data_class": data_class,
            "sensitivity": step.get("sensitivity"),
            "context": {
                "goal": self.goal,
                "user_id": self.user_id,
            },
        }

    async def _execute_dag_level(
        self, ready_queue: list[str], step_lookup: dict[str, dict[str, Any]], level: int
    ) -> list[tuple[str, Any]]:
        """
        Execute all steps at a given DAG level in parallel.

        Returns:
            List of (step_id, result) tuples
        """
        # Log execution level
        if len(ready_queue) > 1:
            _ns().workflow.logger.info(
                f"▶ Level {level}: Executing {len(ready_queue)} steps in PARALLEL: {ready_queue}"
            )
        else:
            _ns().workflow.logger.info(f"▶ Level {level}: Executing step: {ready_queue[0]}")

        # Create coroutines for parallel execution
        parallel_tasks = [
            self._execute_single_step(step_lookup[step_id], step_id) for step_id in ready_queue
        ]

        # Execute in parallel and collect results
        results = await asyncio.gather(*parallel_tasks, return_exceptions=True)

        return list(zip(ready_queue, results, strict=True))

    def _process_dag_results(
        self,
        step_results: list[tuple[str, Any]],
        executed: set[str],
        dependents: dict[str, list[str]],
        in_degree: dict[str, int],
    ) -> list[str]:
        """
        Process DAG execution results and determine next ready steps.

        Returns:
            List of step IDs ready for next execution level
        """
        next_ready = []
        for step_id, result in step_results:
            if isinstance(result, Exception):
                # Step failed - trigger rollback
                self.failed_step_id = step_id
                raise result

            # Mark as executed and update dependents
            executed.add(step_id)
            self.step_results[step_id] = result

            # Check if any dependents are now ready
            for dependent_id in dependents[step_id]:
                in_degree[dependent_id] -= 1
                if in_degree[dependent_id] == 0 and dependent_id not in executed:
                    next_ready.append(dependent_id)

        return next_ready

    async def _handle_success(self) -> dict[str, Any]:
        """Handle successful workflow completion."""
        _ns().workflow.logger.info("✓ Workflow completed successfully")

        # Update agent_runs table with completion status and response
        result = {
            "status": "success",
            "goal": self.goal,
            "plan_id": self.plan_id,
            "steps_executed": len(self.step_results),
            "results": self.step_results,
        }

        # Surface a direct conversational reply (e.g. from respond_to_user) so the
        # gateway renders a human answer instead of a generic completion template.
        for _res in self.step_results.values():
            if (
                isinstance(_res, dict)
                and isinstance(_res.get("reply"), str)
                and _res["reply"].strip()
            ):
                result["reply"] = _res["reply"].strip()
                break

        # Update agent_runs using trace_id from workflow context (never search attributes)
        trace_id = self._get_trace_id()
        try:
            await _ns().workflow.execute_activity(
                "update_agent_run_completion",
                args=[{"trace_id": trace_id, "status": "completed", "agent_response": result}],
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=RetryPolicy(maximum_attempts=2),
            )
            _ns().workflow.logger.info(f"✓ Updated agent_runs for trace_id: {trace_id}")
        except Exception as e:
            _ns().workflow.logger.warning(f"Failed to update agent_runs: {e!s}")

        await self._append_event(
            WorkflowCompleted(
                correlation_id=_ns().workflow.info().workflow_id,
                plan_id=self.plan_id,
                total_steps=len(self.plan_steps),
                duration_seconds=(
                    _ns().workflow.now().timestamp() - self.start_time if self.start_time else 0.0
                ),
                final_result=self.step_results,
            )
        )

        result = {
            "status": "success",
            "goal": self.goal,
            "plan_id": self.plan_id,
            "steps_executed": len(self.step_results),
            "results": self.step_results,
        }

        # OmniTrace: Record run completion (best-effort)
        await self._omnitrace_record_run_complete(result, "completed")

        return result

    async def _handle_failure(self, error_message: str) -> dict[str, Any]:
        """Handle workflow failure with Saga rollback."""
        _ns().workflow.logger.error(f"✗ Handling workflow failure: {error_message}")

        # Execute compensations
        assert self.saga is not None
        compensation_results = await self.saga.rollback()

        result = {
            "status": "failed",
            "plan_id": self.plan_id,
            "failed_step_id": self.failed_step_id,
            "error": error_message,
            "compensation_executed": True,
            "compensation_results": compensation_results,
        }

        # Update agent_runs with failed status so the gateway poll receives a terminal event
        trace_id = self._get_trace_id()
        try:
            await _ns().workflow.execute_activity(
                "update_agent_run_completion",
                args=[{"trace_id": trace_id, "status": "failed", "agent_response": result}],
                start_to_close_timeout=timedelta(seconds=10),
                retry_policy=RetryPolicy(maximum_attempts=2),
            )
            _ns().workflow.logger.info(f"✓ agent_runs updated: failed, trace_id={trace_id}")
        except Exception as e:
            _ns().workflow.logger.warning(f"Failed to update agent_runs on failure: {e!s}")

        comp_results_list: list[dict[str, Any]] | None = (
            compensation_results if isinstance(compensation_results, list) else None
        )
        await self._append_event(
            WorkflowFailed(
                correlation_id=_ns().workflow.info().workflow_id,
                plan_id=self.plan_id,
                failed_step_id=self.failed_step_id,
                error_message=error_message,
                compensation_executed=True,
                compensation_results=comp_results_list,
            )
        )

        # OmniTrace: Record run failure (best-effort)
        await self._omnitrace_record_run_complete(result, "failed")

        return result
