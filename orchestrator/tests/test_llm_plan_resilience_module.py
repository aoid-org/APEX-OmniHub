import asyncio

import pytest
from temporalio.exceptions import ApplicationError

import reliability
import reliability.llm_plan_resilience as plan_resilience
from reliability.llm_plan_resilience import (
    attempt_with_model_fallback,
    parse_model_candidates,
    resolve_model_candidates,
    resolve_plan_attempt_limit,
    resolve_plan_timeout_seconds,
)


def test_reliability_package_exports_expected_symbols() -> None:
    assert "attempt_with_model_fallback" in reliability.__all__
    assert "resolve_model_candidates" in reliability.__all__


def test_parse_model_candidates_handles_empty_and_whitespace() -> None:
    assert parse_model_candidates(None) == []
    assert parse_model_candidates("") == []
    assert parse_model_candidates(" model-a , model-b ,, ") == ["model-a", "model-b"]


def test_resolve_model_candidates_prioritizes_requested_then_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEFAULT_LLM_MODEL", "default-model")
    monkeypatch.setenv("LLM_FALLBACK_MODELS", "fallback-a,fallback-b,default-model")

    candidates = resolve_model_candidates(
        {
            "requested_model": "preferred-model",
            "tenant_model": "tenant-model",
        }
    )

    assert candidates == [
        "preferred-model",
        "tenant-model",
        "default-model",
        "fallback-a",
        "fallback-b",
    ]


def test_resolve_model_candidates_filters_by_allowlist(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEFAULT_LLM_MODEL", "default-model")
    monkeypatch.setenv("LLM_FALLBACK_MODELS", "fallback-a")

    candidates = resolve_model_candidates(
        {
            "requested_model": "requested",
            "tenant_model": "tenant",
            "allowed_models": ["tenant", "fallback-a"],
        }
    )

    assert candidates == ["tenant", "fallback-a"]


def test_resolve_model_candidates_raises_when_no_allowlisted_candidates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEFAULT_LLM_MODEL", "default-model")
    monkeypatch.setenv("LLM_FALLBACK_MODELS", "fallback-a")

    with pytest.raises(ApplicationError) as exc_info:
        resolve_model_candidates(
            {
                "requested_model": "requested",
                "tenant_model": "tenant",
                "allowed_models": ["approved-only"],
            }
        )

    assert exc_info.value.non_retryable is True


def test_resolve_plan_attempt_limit_clamps_and_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PLAN_MAX_MODEL_ATTEMPTS", "not-int")
    assert resolve_plan_attempt_limit() == 3

    monkeypatch.setenv("LLM_PLAN_MAX_MODEL_ATTEMPTS", "0")
    assert resolve_plan_attempt_limit() == 1

    monkeypatch.setenv("LLM_PLAN_MAX_MODEL_ATTEMPTS", "99")
    assert resolve_plan_attempt_limit() == 10


def test_resolve_plan_timeout_seconds_clamps_and_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PLAN_REQUEST_TIMEOUT_SECONDS", "not-a-number")
    assert resolve_plan_timeout_seconds() == 45.0

    monkeypatch.setenv("LLM_PLAN_REQUEST_TIMEOUT_SECONDS", "0")
    assert resolve_plan_timeout_seconds() == 5.0

    monkeypatch.setenv("LLM_PLAN_REQUEST_TIMEOUT_SECONDS", "999")
    assert resolve_plan_timeout_seconds() == 180.0


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
async def test_attempt_with_model_fallback_retries_retryable_application_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LLM_PLAN_MAX_MODEL_ATTEMPTS", "2")

    attempts: list[str] = []

    async def _execute(_: str, model: str, __: dict[str, object]) -> dict[str, object]:
        attempts.append(model)
        if model == "model-a":
            raise ApplicationError("retryable provider error", non_retryable=False)
        return {"model": model}

    result = await attempt_with_model_fallback(
        goal="retry-on-application-error",
        context={"requested_model": "model-a", "tenant_model": "model-b"},
        execute_attempt=_execute,
    )

    assert result["model"] == "model-b"
    assert attempts == ["model-a", "model-b"]


@pytest.mark.asyncio
async def test_attempt_with_model_fallback_raises_when_no_candidates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DEFAULT_LLM_MODEL", "")
    monkeypatch.setenv("LLM_FALLBACK_MODELS", "")

    async def _execute(_: str, __: str, ___: dict[str, object]) -> dict[str, object]:
        return {"unreachable": True}

    with pytest.raises(ApplicationError) as exc_info:
        await attempt_with_model_fallback(
            goal="no-candidates",
            context={},
            execute_attempt=_execute,
        )

    assert exc_info.value.non_retryable is True
    assert "No model candidates available" in str(exc_info.value)


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
