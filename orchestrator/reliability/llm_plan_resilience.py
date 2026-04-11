"""Bounded adaptive model fallback for planner reliability."""

from __future__ import annotations

import asyncio
import os
from collections.abc import Awaitable, Callable
from typing import Any

from temporalio.exceptions import ApplicationError

from reliability.llm_metrics import record_llm_plan_attempt, record_llm_plan_outcome


def parse_model_candidates(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [candidate.strip() for candidate in raw.split(",") if candidate.strip()]


def resolve_model_candidates(
    context: dict[str, Any],
    *,
    default_model: str | None = None,
) -> list[str]:
    resolved_default = default_model or os.getenv("DEFAULT_LLM_MODEL", "gpt-4-turbo-preview")
    fallback_models = parse_model_candidates(os.getenv("LLM_FALLBACK_MODELS"))

    ordered: list[str] = []
    for candidate in (
        context.get("requested_model"),
        context.get("tenant_model"),
        resolved_default,
        *fallback_models,
    ):
        if isinstance(candidate, str) and candidate and candidate not in ordered:
            ordered.append(candidate)

    allowed_models = context.get("allowed_models", [])
    if allowed_models:
        filtered = [candidate for candidate in ordered if candidate in allowed_models]
        if not filtered:
            raise ApplicationError(
                "No approved models available for planner fallback",
                non_retryable=True,
            )
        return filtered

    return ordered


def resolve_plan_attempt_limit() -> int:
    raw = os.getenv("LLM_PLAN_MAX_MODEL_ATTEMPTS", "3")
    try:
        parsed = int(raw)
    except ValueError:
        return 3
    return max(1, min(parsed, 10))


def resolve_plan_timeout_seconds() -> float:
    raw = os.getenv("LLM_PLAN_REQUEST_TIMEOUT_SECONDS", "45")
    try:
        parsed = float(raw)
    except ValueError:
        return 45.0
    return max(5.0, min(parsed, 180.0))


async def attempt_with_model_fallback(
    *,
    goal: str,
    context: dict[str, Any],
    execute_attempt: Callable[[str, str, dict[str, Any]], Awaitable[dict[str, Any]]],
) -> dict[str, Any]:
    """Execute planner generation with bounded model fallback and telemetry."""
    workflow_type = str(context.get("workflow_type", "agent_saga"))
    candidates = resolve_model_candidates(context)
    if not candidates:
        raise ApplicationError("No model candidates available", non_retryable=True)

    max_attempts = min(len(candidates), resolve_plan_attempt_limit())
    timeout_seconds = resolve_plan_timeout_seconds()

    last_exception: Exception | None = None

    for model in candidates[:max_attempts]:
        record_llm_plan_attempt(workflow_type)
        try:
            attempt_context = dict(context)
            attempt_context["requested_model"] = model
            result = await asyncio.wait_for(
                execute_attempt(goal, model, attempt_context),
                timeout=timeout_seconds,
            )
            record_llm_plan_outcome("success", workflow_type)
            return result
        except asyncio.TimeoutError as exc:
            last_exception = exc
            record_llm_plan_outcome("timeout", workflow_type)
        except ApplicationError as exc:
            last_exception = exc
            outcome = "non_retryable" if exc.non_retryable else "application_error"
            record_llm_plan_outcome(outcome, workflow_type)
            if exc.non_retryable:
                raise
        except Exception as exc:  # noqa: BLE001
            last_exception = exc
            record_llm_plan_outcome("error", workflow_type)

    failure_message = f"Planner failed after {max_attempts} model attempt(s)"
    if last_exception is not None:
        raise ApplicationError(f"{failure_message}: {last_exception}", non_retryable=True) from last_exception

    raise ApplicationError(failure_message, non_retryable=True)
