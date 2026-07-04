"""
Saga compensation engine: CompensationStep + SagaContext.

Split from workflows/agent_saga.py (S6, 600-line law) — pure structural move.
Names that tests patch on the workflows.agent_saga namespace (notably
``workflow``) are resolved late through ``_ns()`` so existing patches keep
governing this code exactly as before the split.
"""

import asyncio
import sys
from dataclasses import dataclass, field
from typing import Any


def _ns():
    """Late-bound workflows.agent_saga module namespace.

    Resolved through ``sys.modules`` — the same way ``unittest.mock.patch``
    resolves dotted targets — so existing test patches on workflows.agent_saga
    govern this code exactly as before the S6 split.
    """
    return sys.modules["workflows.agent_saga"]


# ============================================================================
# SAGA CONTEXT (Compensation Pattern)
# ============================================================================


@dataclass
class CompensationStep:
    """
    A compensation step to execute on rollback.

    Stored in LIFO order (stack) - last successful step compensates first.
    """

    activity_name: str
    input: dict[str, Any]
    step_id: str


@dataclass
class SagaContext:
    """
    Saga context manager for compensation-based distributed transactions.

    Usage in workflow:
        saga = SagaContext(workflow_instance=self)

        # Execute step with compensation
        result = await saga.execute_with_compensation(
            activity="book_flight",
            input={"destination": "Paris"},
            compensation_activity="cancel_flight",
            compensation_input={"booking_id": "{booking_id}"}
        )

        # On failure, saga automatically rolls back all successful steps
        if error:
            await saga.rollback()

    Why Saga Pattern:
    - No distributed transactions (2PC) → eventual consistency
    - Each service maintains local ACID, global consistency via compensations
    - Better resilience (no coordinator bottleneck)
    - Works across heterogeneous systems (SQL + NoSQL + APIs)

    Compensation Guarantees:
    - At-least-once execution (compensations may retry on failure)
    - Idempotent compensations (e.g., CancelBooking checks if exists first)
    - Best-effort rollback (log failures but don't block)
    """

    workflow_instance: Any  # Reference to workflow (for activity execution)
    compensation_stack: list[CompensationStep] = field(default_factory=list)
    rollback_executed: bool = False

    async def execute_with_compensation(
        self,
        activity_name: str,
        activity_input: dict[str, Any],
        compensation_activity: str | None = None,
        compensation_input: dict[str, Any] | None = None,
        step_id: str = "",
    ) -> dict[str, Any]:
        """
        Execute activity and register compensation on success.
        """
        # Double check compensation validity just in case
        if compensation_activity:
            with _ns().workflow.unsafe.imports_passed_through():
                from activities.tool_registry import (
                    TOOL_REGISTRY,
                    resolve_tool_name,
                )

            # Resolve tool
            canonical_tool = resolve_tool_name(activity_name)
            canonical_comp = resolve_tool_name(compensation_activity)

            if not canonical_comp:
                _ns().workflow.logger.error(
                    f"Blocked invalid compensation activity (unknown): {compensation_activity}"
                )
                compensation_activity = None
            elif canonical_tool and canonical_tool in TOOL_REGISTRY:
                contract = TOOL_REGISTRY[canonical_tool]
                valid_comp = canonical_comp in contract.compensation_tools_allowed
                if not contract.compensable or not valid_comp:
                    _ns().workflow.logger.error(
                        f"Blocked invalid compensation mapping: "
                        f"{activity_name} -> {compensation_activity}"
                    )
                    compensation_activity = None

        # Execute main activity

        result = await self.workflow_instance._execute_activity(
            activity_name, activity_input, _step_id=step_id
        )

        # Register compensation (only on success)
        if compensation_activity:
            # Inject result values into compensation input
            comp_input = compensation_input or {}
            injected_input = self._inject_result_values(comp_input, result)

            compensation = CompensationStep(
                activity_name=compensation_activity,
                input=injected_input,
                step_id=step_id,
            )
            self.compensation_stack.append(compensation)

            stack_size = len(self.compensation_stack)
            _ns().workflow.logger.info(
                f"✓ Registered compensation: {compensation_activity} (stack size={stack_size})"
            )

        return dict(result)

    async def rollback(self) -> list[dict[str, Any]]:
        """
        Execute all compensations in reverse order (LIFO).

        Returns:
            List of compensation results (for audit trail)

        Note: Compensations are best-effort. Failures are logged but don't block rollback.
        """
        if self.rollback_executed:
            _ns().workflow.logger.warning("Saga rollback already executed - skipping")
            return []

        self.rollback_executed = True

        if not self.compensation_stack:
            _ns().workflow.logger.info("No compensations to execute")
            return []

        _ns().workflow.logger.warning(
            f"🔄 Starting Saga rollback ({len(self.compensation_stack)} compensations)"
        )

        async def _execute_compensation(comp: CompensationStep) -> dict[str, Any]:
            try:
                result = await self.workflow_instance._execute_activity(
                    comp.activity_name,
                    comp.input,
                    is_compensation=True,
                    _step_id=comp.step_id,
                )
                _ns().workflow.logger.info(f"✓ Compensation succeeded: {comp.activity_name}")
                return {"step_id": comp.step_id, "success": True, "result": result}
            except Exception as e:
                # Log but continue (best-effort rollback)
                _ns().workflow.logger.error(f"✗ Compensation failed: {comp.activity_name} - {e!s}")
                return {"step_id": comp.step_id, "success": False, "error": str(e)}

        # Execute in reverse order (LIFO) in parallel via asyncio.gather
        tasks = [_execute_compensation(c) for c in reversed(self.compensation_stack)]
        results = await asyncio.gather(*tasks)

        _ns().workflow.logger.info(
            f"✓ Saga rollback complete ({len(results)} compensations executed)"
        )
        return results

    @staticmethod
    def _inject_result_values(
        compensation_input: dict[str, Any], result: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Inject values from activity result into compensation input.

        Example:
            result = {"booking_id": "BK123", "price": 500}
            comp_input = {"booking_id": "{result.booking_id}"}
            → {"booking_id": "BK123"}
        """
        injected = {}
        for key, value in compensation_input.items():
            if isinstance(value, str) and value.startswith("{result."):
                # Extract field name: "{result.booking_id}" → "booking_id"
                field_name = value.replace("{result.", "").replace("}", "")
                injected[key] = result.get(field_name, value)
            else:
                injected[key] = value
        return injected
