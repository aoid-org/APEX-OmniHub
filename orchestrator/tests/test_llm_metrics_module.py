import pytest

import reliability.llm_metrics as llm_metrics


def test_record_llm_plan_attempt_increments_counter() -> None:
    before = llm_metrics._llm_plan_attempts.labels(workflow_type="agent_saga")._value.get()
    llm_metrics.record_llm_plan_attempt("agent_saga")
    after = llm_metrics._llm_plan_attempts.labels(workflow_type="agent_saga")._value.get()

    assert after == pytest.approx(before + 1.0)


def test_record_llm_plan_outcome_normalizes_unexpected_labels() -> None:
    before = llm_metrics._llm_plan_outcomes.labels(
        workflow_type="agent_saga",
        outcome="other",
    )._value.get()

    llm_metrics.record_llm_plan_outcome("Unexpected Failure Class", "agent_saga")

    after = llm_metrics._llm_plan_outcomes.labels(
        workflow_type="agent_saga",
        outcome="other",
    )._value.get()

    assert after == pytest.approx(before + 1.0)


def test_record_llm_plan_outcome_keeps_allowed_labels() -> None:
    before = llm_metrics._llm_plan_outcomes.labels(
        workflow_type="workflow-x",
        outcome="success",
    )._value.get()

    llm_metrics.record_llm_plan_outcome("success", "workflow-x")

    after = llm_metrics._llm_plan_outcomes.labels(
        workflow_type="workflow-x",
        outcome="success",
    )._value.get()

    assert after == pytest.approx(before + 1.0)
