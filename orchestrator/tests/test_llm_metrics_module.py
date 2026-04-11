import importlib
import sys
from collections.abc import Generator

import pytest

import reliability.llm_metrics as _real_llm_metrics


@pytest.fixture(autouse=True)
def _restore_real_llm_metrics() -> Generator[None, None, None]:
    original = sys.modules.get("reliability.llm_metrics")
    sys.modules["reliability.llm_metrics"] = _real_llm_metrics
    yield
    if original is not None:
        sys.modules["reliability.llm_metrics"] = original
    else:
        sys.modules.pop("reliability.llm_metrics", None)


def test_record_llm_plan_attempt_increments_counter() -> None:
    module = importlib.reload(_real_llm_metrics)

    before = module._llm_plan_attempts.labels(workflow_type="agent_saga")._value.get()
    module.record_llm_plan_attempt("agent_saga")
    after = module._llm_plan_attempts.labels(workflow_type="agent_saga")._value.get()

    assert after == pytest.approx(before + 1.0)


def test_record_llm_plan_outcome_normalizes_unexpected_labels() -> None:
    module = importlib.reload(_real_llm_metrics)

    before = module._llm_plan_outcomes.labels(
        workflow_type="agent_saga",
        outcome="other",
    )._value.get()

    module.record_llm_plan_outcome("Unexpected Failure Class", "agent_saga")

    after = module._llm_plan_outcomes.labels(
        workflow_type="agent_saga",
        outcome="other",
    )._value.get()

    assert after == pytest.approx(before + 1.0)


def test_record_llm_plan_outcome_keeps_allowed_labels() -> None:
    module = importlib.reload(_real_llm_metrics)

    before = module._llm_plan_outcomes.labels(
        workflow_type="workflow-x",
        outcome="success",
    )._value.get()

    module.record_llm_plan_outcome("success", "workflow-x")

    after = module._llm_plan_outcomes.labels(
        workflow_type="workflow-x",
        outcome="success",
    )._value.get()

    assert after == pytest.approx(before + 1.0)
