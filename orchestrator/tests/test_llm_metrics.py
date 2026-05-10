"""Tests for LLM planner metrics counters."""

from __future__ import annotations

import sys
from collections.abc import Generator

import metrics as _real_metrics_module
import pytest


@pytest.fixture(autouse=True)
def _restore_real_metrics_module() -> Generator[None, None, None]:
    """Prevent test suites from replacing the real metrics module with mocks."""
    original = sys.modules.get("metrics")
    sys.modules["metrics"] = _real_metrics_module
    yield
    if original is not None:
        sys.modules["metrics"] = original
    else:
        sys.modules.pop("metrics", None)


def test_record_llm_plan_attempt_increments_counter() -> None:
    from metrics import llm_plan_attempts, record_llm_plan_attempt

    before = llm_plan_attempts.labels(workflow_type="agent_saga")._value.get()
    record_llm_plan_attempt()
    after = llm_plan_attempts.labels(workflow_type="agent_saga")._value.get()
    assert after == before + 1


def test_record_llm_plan_outcome_increments_allowed_outcome() -> None:
    from metrics import llm_plan_outcomes, record_llm_plan_outcome

    before = llm_plan_outcomes.labels(
        workflow_type="agent_saga", outcome="fallback_success"
    )._value.get()
    record_llm_plan_outcome("fallback_success")
    after = llm_plan_outcomes.labels(
        workflow_type="agent_saga", outcome="fallback_success"
    )._value.get()
    assert after == before + 1


def test_record_llm_plan_outcome_normalizes_unknown_values() -> None:
    from metrics import llm_plan_outcomes, record_llm_plan_outcome

    before = llm_plan_outcomes.labels(workflow_type="agent_saga", outcome="unknown")._value.get()
    record_llm_plan_outcome("unbounded_user_supplied_value")
    after = llm_plan_outcomes.labels(workflow_type="agent_saga", outcome="unknown")._value.get()
    assert after == before + 1
