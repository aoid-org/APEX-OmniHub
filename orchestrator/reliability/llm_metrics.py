"""Planner resilience metrics with bounded label cardinality."""

from __future__ import annotations

from prometheus_client import Counter

_llm_plan_attempts = Counter(
    "llm_plan_attempts_total",
    "Total planner model-attempt executions",
    ["workflow_type"],
)

_llm_plan_outcomes = Counter(
    "llm_plan_outcomes_total",
    "Planner model-attempt outcomes",
    ["workflow_type", "outcome"],
)

_ALLOWED_OUTCOMES = {
    "success",
    "timeout",
    "error",
    "application_error",
    "non_retryable",
    "other",
}


def _normalize_outcome(outcome: str) -> str:
    normalized = outcome.strip().lower().replace(" ", "_")
    return normalized if normalized in _ALLOWED_OUTCOMES else "other"


def record_llm_plan_attempt(workflow_type: str = "agent_saga") -> None:
    _llm_plan_attempts.labels(workflow_type=workflow_type).inc()


def record_llm_plan_outcome(outcome: str, workflow_type: str = "agent_saga") -> None:
    _llm_plan_outcomes.labels(
        workflow_type=workflow_type,
        outcome=_normalize_outcome(outcome),
    ).inc()
