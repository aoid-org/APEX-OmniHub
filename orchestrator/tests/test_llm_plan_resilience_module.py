import asyncio

import pytest
from temporalio.exceptions import ApplicationError

import reliability.llm_plan_resilience as plan_resilience
from reliability.llm_plan_resilience import (
    attempt_with_model_fallback,
    resolve_model_candidates,
)


def test_resolve_model_candidates_prioritizes_requested_then_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEFAULT_LLM_MODEL", "default-model")
    monkeypatch.setenv("LLM_FALLBACK_MODELS", "fallback-a,fallback-b,default-model")

    candidates = resolve_model_candidates(
        {
            "requested_model": "preferred-model",
            "tenant_model": "tenant-model",
        }
    )

    assert candidates == ["preferred-model", "tenant-model", "default-model", "fallback-a", "fallback-b"]


@pytest.mark.asyncio
async def test_attempt_with_model_fallback_succeeds_on_second_candidate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LLM_PLAN_MAX_MODEL_ATTEMPTS", "3")
    monkeypatch.setenv("LLM_PLAN_REQUEST_TIMEOUT_SECONDS", "30")

    attempts: list[str] = []

    async def _execute(goal: str, model: str, context: dict[str, object]) -> dict[str, object]:
        attempts.append(model)
        if model == "model-a":
            raise RuntimeError("provider down")
        return {"plan_id": "plan-123", "model": model, "goal": goal, "context": context}

    result = await attempt_with_model_fallback(
        goal="generate release plan",
        context={"requested_model": "model-a", "tenant_model": "model-b"},
        execute_attempt=_execute,
    )

    assert result["plan_id"] == "plan-123"
    assert result["model"] == "model-b"
    assert attempts == ["model-a", "model-b"]


@pytest.mark.asyncio
async def test_attempt_with_model_fallback_times_out_then_raises_non_retryable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LLM_PLAN_MAX_MODEL_ATTEMPTS", "2")
    monkeypatch.setattr(plan_resilience, "resolve_plan_timeout_seconds", lambda: 0.001)

    async def _execute(_: str, model: str, __: dict[str, object]) -> dict[str, object]:
        await asyncio.sleep(0.01)
        return {"model": model}

    with pytest.raises(ApplicationError) as exc_info:
        await attempt_with_model_fallback(
            goal="slow request",
            context={"requested_model": "model-a", "tenant_model": "model-b"},
            execute_attempt=_execute,
        )

    assert exc_info.value.non_retryable is True
    assert "Planner failed after" in str(exc_info.value)


@pytest.mark.asyncio
async def test_attempt_with_model_fallback_stops_on_non_retryable_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LLM_PLAN_MAX_MODEL_ATTEMPTS", "3")

    async def _execute(_: str, __: str, ___: dict[str, object]) -> dict[str, object]:
        raise ApplicationError("model not approved", non_retryable=True)

    with pytest.raises(ApplicationError) as exc_info:
        await attempt_with_model_fallback(
            goal="policy constrained",
            context={"requested_model": "blocked-model", "tenant_model": "fallback-model"},
            execute_attempt=_execute,
        )

    assert exc_info.value.non_retryable is True
    assert "model not approved" in str(exc_info.value)
