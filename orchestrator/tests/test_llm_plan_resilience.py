"""Tests for bounded model fallback and planner reliability guardrails."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from temporalio.exceptions import ApplicationError

from activities.tools import (
    GeneratedPlan,
    PlanStep,
    _resolve_model_candidates,
    generate_plan_with_llm,
)


def _valid_plan() -> GeneratedPlan:
    return GeneratedPlan(
        plan_id="plan-fallback-ok",
        reasoning="test",
        steps=[
            PlanStep(
                id="s1",
                name="Lookup",
                tool="search_database",
                input={"table": "users"},
            )
        ],
    )


def test_resolve_model_candidates_filters_and_caps() -> None:
    with patch.dict(
        "os.environ",
        {
            "DEFAULT_LLM_MODEL": "primary-model",
            "LLM_FALLBACK_MODELS": "backup-a, backup-b , backup-c",
            "LLM_PLAN_MAX_MODEL_ATTEMPTS": "2",
        },
    ):
        candidates = _resolve_model_candidates(
            {"allowed_models": ["primary-model", "backup-b", "backup-c"]}
        )
    assert candidates == ["primary-model", "backup-b"]


def test_resolve_model_candidates_rejects_unapproved_requested_model() -> None:
    with patch.dict(
        "os.environ",
        {"DEFAULT_LLM_MODEL": "primary-model", "LLM_FALLBACK_MODELS": "backup-a"},
    ):
        with pytest.raises(ApplicationError, match="not approved"):
            _resolve_model_candidates(
                {
                    "requested_model": "forbidden-model",
                    "allowed_models": ["primary-model", "backup-a"],
                }
            )


@pytest.mark.asyncio
async def test_generate_plan_fallback_success_records_metrics() -> None:
    import activities.tools as tools_mod

    old_cache = tools_mod._semantic_cache
    tools_mod._semantic_cache = None
    try:
        client = MagicMock()
        client.chat = MagicMock()
        client.chat.completions = MagicMock()
        client.chat.completions.create = AsyncMock(
            side_effect=[RuntimeError("primary unavailable"), _valid_plan()]
        )

        with (
            patch("activities.tools.instructor.from_litellm", return_value=client),
            patch("activities.tools.create_safe_user_message", return_value="safe-goal"),
            patch("activities.tools.record_llm_plan_attempt") as record_attempt,
            patch("activities.tools.record_llm_plan_outcome") as record_outcome,
            patch.dict(
                "os.environ",
                {
                    "DEFAULT_LLM_MODEL": "primary-model",
                    "LLM_FALLBACK_MODELS": "backup-model",
                    "LLM_PLAN_MAX_MODEL_ATTEMPTS": "2",
                },
            ),
        ):
            result = await generate_plan_with_llm("compose a plan", {})

        assert result["plan_id"] == "plan-fallback-ok"
        assert len(result["steps"]) == 1
        assert record_attempt.call_count == 2
        record_outcome.assert_any_call("fallback_success")
    finally:
        tools_mod._semantic_cache = old_cache


@pytest.mark.asyncio
async def test_generate_plan_non_retryable_across_all_models_blocks() -> None:
    import activities.tools as tools_mod

    old_cache = tools_mod._semantic_cache
    tools_mod._semantic_cache = None
    try:
        client = MagicMock()
        client.chat = MagicMock()
        client.chat.completions = MagicMock()
        client.chat.completions.create = AsyncMock(
            side_effect=[
                ApplicationError("invalid plan 1", non_retryable=True),
                ApplicationError("invalid plan 2", non_retryable=True),
            ]
        )

        with (
            patch("activities.tools.instructor.from_litellm", return_value=client),
            patch("activities.tools.create_safe_user_message", return_value="safe-goal"),
            patch("activities.tools.record_llm_plan_outcome") as record_outcome,
            patch.dict(
                "os.environ",
                {
                    "DEFAULT_LLM_MODEL": "primary-model",
                    "LLM_FALLBACK_MODELS": "backup-model",
                    "LLM_PLAN_MAX_MODEL_ATTEMPTS": "2",
                },
            ),
        ):
            with pytest.raises(ApplicationError, match="non-retryable"):
                await generate_plan_with_llm("compose a plan", {})

        record_outcome.assert_any_call("all_failed")
        record_outcome.assert_any_call("non_retryable_block")
    finally:
        tools_mod._semantic_cache = old_cache
