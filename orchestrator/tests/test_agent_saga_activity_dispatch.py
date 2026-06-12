"""
Regression tests for SagaContext activity dispatch in workflows/agent_saga.py.

Locks the fix for a latent positional-argument bug in calls to
AgentWorkflow._execute_activity(activity_name, activity_input,
is_compensation=False, _step_id=""):

1. SagaContext.execute_with_compensation used to pass step_id as the THIRD
   POSITIONAL argument, which bound to is_compensation. Any non-empty step_id
   string is truthy, so every main activity silently ran with the compensation
   profile (15s timeout / 2 attempts instead of 5min / 3 attempts).

2. SagaContext.rollback's inner _execute_compensation passed comp.step_id
   positionally PLUS is_compensation=True as a keyword, raising
   "TypeError: got multiple values for argument 'is_compensation'". The
   best-effort except swallowed it, so EVERY compensation silently failed
   (success=False) without ever dispatching.

Both call sites now pass _step_id= by keyword. These tests fail if anyone
regresses them to positional dispatch.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from workflows.agent_saga import CompensationStep, SagaContext


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------
def _make_saga_with_mock(return_value=None, side_effect=None):
    """Build a SagaContext around a MagicMock workflow with AsyncMock dispatch."""
    wf = MagicMock()
    wf._execute_activity = AsyncMock(return_value=return_value, side_effect=side_effect)
    return SagaContext(workflow_instance=wf), wf


def _push_two_compensations(saga: SagaContext) -> tuple[CompensationStep, CompensationStep]:
    """Push two compensation steps in order [stepA, stepB] (stepB is LIFO-first)."""
    step_a = CompensationStep(activity_name="undo_a", input={"a": 1}, step_id="step-a")
    step_b = CompensationStep(activity_name="undo_b", input={"b": 2}, step_id="step-b")
    saga.compensation_stack.append(step_a)
    saga.compensation_stack.append(step_b)
    return step_a, step_b


class _RealSignatureWorkflow:
    """
    Workflow stand-in whose _execute_activity mirrors the EXACT production
    signature of AgentWorkflow._execute_activity.

    Unlike an AsyncMock (which accepts anything), this re-raises TypeError if
    a call site regresses to passing step_id positionally alongside
    is_compensation=True.
    """

    def __init__(self) -> None:
        self.calls: list[tuple[str, dict, bool, str]] = []

    async def _execute_activity(
        self,
        activity_name: str,
        activity_input,
        is_compensation: bool = False,
        _step_id: str = "",
    ):
        self.calls.append((activity_name, activity_input, is_compensation, _step_id))
        return {"compensated": activity_name}


# ---------------------------------------------------------------------------
# TESTS: Main path dispatch (execute_with_compensation)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_main_path_dispatches_with_compensation_profile_off():
    """Main activities must NOT inherit the compensation retry/timeout profile.

    Regression: step_id used to be passed as the third positional argument,
    binding to is_compensation (truthy for any non-empty step id).
    """
    saga, wf = _make_saga_with_mock(return_value={"status": "ok"})

    # compensation_activity=None skips the tool-registry validation branch,
    # keeping this test hermetic (no activities.tool_registry import).
    with patch("workflows.agent_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        result = await saga.execute_with_compensation(
            activity_name="sync_node",
            activity_input={"node": "primary"},
            compensation_activity=None,
            step_id="node-sync",
        )

    assert result == {"status": "ok"}
    wf._execute_activity.assert_awaited_once()

    call = wf._execute_activity.await_args
    # Only (activity_name, activity_input) may be positional - no third
    # positional arg that could shadow is_compensation.
    assert len(call.args) <= 2, f"unexpected positional args: {call.args}"
    assert call.kwargs.get("_step_id") == "node-sync"
    assert call.kwargs.get("is_compensation", False) is False

    # No compensation was provided, so nothing should be registered.
    assert saga.compensation_stack == []


# ---------------------------------------------------------------------------
# TESTS: Rollback dispatch (SagaContext.rollback)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_rollback_executes_compensations_lifo_and_marks_success():
    """All compensations must dispatch successfully, in LIFO order, by keyword.

    Regression core: before the fix every entry came back success=False
    because the dispatch raised TypeError before reaching the activity.
    """
    saga, wf = _make_saga_with_mock(return_value={"ok": True})
    step_a, step_b = _push_two_compensations(saga)

    with patch("workflows.agent_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        results = await saga.rollback()

    # (i) Every compensation succeeded.
    assert len(results) == 2
    assert all(entry["success"] is True for entry in results)

    # (ii) LIFO order: stepB (pushed last) dispatches first, then stepA.
    calls = wf._execute_activity.await_args_list
    assert len(calls) == 2
    assert calls[0].args[0] == step_b.activity_name
    assert calls[1].args[0] == step_a.activity_name

    # (iii) Both flags passed as keywords on every call.
    assert calls[0].kwargs["is_compensation"] is True
    assert calls[0].kwargs["_step_id"] == step_b.step_id
    assert calls[1].kwargs["is_compensation"] is True
    assert calls[1].kwargs["_step_id"] == step_a.step_id

    # Rollback is idempotent - second invocation is a no-op.
    with patch("workflows.agent_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        assert await saga.rollback() == []


@pytest.mark.asyncio
async def test_rollback_against_real_signature():
    """Rollback must succeed against the EXACT production dispatch signature.

    An AsyncMock accepts any call shape; this real async method re-raises
    "TypeError: got multiple values for argument 'is_compensation'" if anyone
    regresses the call sites to positional step_id dispatch.
    """
    wf = _RealSignatureWorkflow()
    saga = SagaContext(workflow_instance=wf)
    step_a, step_b = _push_two_compensations(saga)

    with patch("workflows.agent_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        results = await saga.rollback()

    assert len(results) == 2
    assert all(entry["success"] is True for entry in results)

    # The real method observed correct bindings, in LIFO order.
    assert wf.calls == [
        (step_b.activity_name, step_b.input, True, step_b.step_id),
        (step_a.activity_name, step_a.input, True, step_a.step_id),
    ]

    # Results carry the per-step audit payload from the real dispatch.
    results_by_step = {entry["step_id"]: entry for entry in results}
    assert results_by_step["step-b"]["result"] == {"compensated": "undo_b"}
    assert results_by_step["step-a"]["result"] == {"compensated": "undo_a"}


@pytest.mark.asyncio
async def test_compensation_failure_is_best_effort():
    """One failing compensation must not block the others or raise."""

    async def _dispatch(activity_name, _activity_input, **_kwargs):
        if activity_name == "undo_b":
            raise RuntimeError("compensation backend unavailable")
        return {"ok": True}

    saga, wf = _make_saga_with_mock(side_effect=_dispatch)
    _push_two_compensations(saga)

    with patch("workflows.agent_saga.workflow") as mock_wf:
        mock_wf.logger = MagicMock()
        results = await saga.rollback()  # must NOT propagate the RuntimeError

    assert len(results) == 2
    results_by_step = {entry["step_id"]: entry for entry in results}

    assert results_by_step["step-b"]["success"] is False
    assert "compensation backend unavailable" in results_by_step["step-b"]["error"]

    assert results_by_step["step-a"]["success"] is True
    assert results_by_step["step-a"]["result"] == {"ok": True}

    # Both compensations were still attempted despite the failure.
    assert wf._execute_activity.await_count == 2
