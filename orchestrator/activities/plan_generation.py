"""
LLM plan generation: schema models, validation, and the
generate_plan_with_llm activity.

Split from activities/tools.py (S6, 600-line law) — pure structural move.
Names that tests patch on the activities.tools namespace (get_database_provider,
create_safe_user_message, validate_url_with_dns_pin_async, log_audit_event, and
the whole ``activity`` module binding) resolve late through ``_ns()`` so existing
patches keep governing this code exactly as before the split.
"""

import os
import sys
from typing import Any, NoReturn

import instructor
import jsonschema  # type: ignore
from litellm import acompletion
from pydantic import BaseModel
from temporalio import activity

import metrics
from activities.tool_registry import TOOL_REGISTRY, ToolContract, resolve_tool_name
from security.prompt_sanitizer import PromptInjectionError


def _ns():
    """Late-bound activities.tools module namespace.

    Resolved through ``sys.modules`` — the same way ``unittest.mock.patch``
    resolves dotted targets — so existing test patches on activities.tools
    govern this code exactly as before the S6 split.
    """
    return sys.modules["activities.tools"]


def _semantic_cache():
    """Resolve the shared semantic-cache instance from activities.tools.

    Checks the ``sys.modules`` entry first, then the ``activities`` package
    attribute: reload-style test fixtures can leave those as two different
    module objects, and the cache may have been assigned on either.
    """
    cache = getattr(_ns(), "_semantic_cache", None)
    if cache is not None:
        return cache
    attr_mod = getattr(sys.modules.get("activities"), "tools", None)
    return getattr(attr_mod, "_semantic_cache", None)


class PlanStep(BaseModel):
    """Plan step schema for LLM generation."""

    id: str
    name: str
    tool: str
    input: dict[str, Any]
    depends_on: list[str] = []
    compensation: str | None = None
    compensation_input: dict[str, Any] | None = None


class GeneratedPlan(BaseModel):
    """LLM-generated plan schema."""

    plan_id: str
    steps: list[PlanStep]
    reasoning: str


def _raise_non_retryable_plan_error(message: str) -> NoReturn:
    from temporalio.exceptions import ApplicationError

    raise ApplicationError(message, non_retryable=True)


def _resolve_llm_model(context: dict[str, Any]) -> str:
    """
    Resolve the LLM model for plan generation.

    APEX Policy:
    - Default provider: Anthropic
    - Forbidden: any gpt-* or openai/* model
    - Source priority: requested_model > tenant_model > ANTHROPIC_PLANNER
    """
    system_default_model = (
        os.getenv("ANTHROPIC_PLANNER_MODEL")
        or os.getenv("ANTHROPIC_DEFAULT_MODEL")
        or "anthropic/claude-sonnet-4-5"
    )
    tenant_model = context.get("tenant_model")
    requested_model = context.get("requested_model")
    resolved_model = requested_model or tenant_model or system_default_model

    # APEX governance: reject GPT/OpenAI models as non-retryable violations
    forbidden_prefixes = ("gpt-", "openai/", "text-davinci", "o1-", "o3-")
    if any(str(resolved_model).startswith(p) for p in forbidden_prefixes):
        _raise_non_retryable_plan_error(
            f"Model '{resolved_model}' is forbidden by APEX provider policy. "
            "Only Anthropic and Groq models are permitted for plan generation."
        )

    allowed_models = context.get("allowed_models", [])
    if allowed_models and resolved_model not in allowed_models:
        _raise_non_retryable_plan_error(f"Model {resolved_model} is not approved for this tenant")

    return resolved_model


def _has_dependency_cycle(dependencies: dict[str, list[str]]) -> bool:
    visited: set[str] = set()
    path: set[str] = set()

    def visit(node: str) -> bool:
        if node in path:
            return True
        if node in visited:
            return False
        visited.add(node)
        path.add(node)
        for neighbor in dependencies.get(node, []):
            if visit(neighbor):
                return True
        path.remove(node)
        return False

    return any(visit(node) for node in dependencies)


def _validate_plan_dependencies(plan: GeneratedPlan) -> None:
    step_ids = {step.id for step in plan.steps}
    dependencies = {step.id: step.depends_on for step in plan.steps}
    missing_deps = [
        f"Step {step_id} depends on unknown step {dep}"
        for step_id, deps in dependencies.items()
        for dep in deps
        if dep not in step_ids
    ]

    if missing_deps:
        _raise_non_retryable_plan_error(
            f"Plan validation failed (Missing dependencies): {missing_deps}"
        )

    if _has_dependency_cycle(dependencies):
        _raise_non_retryable_plan_error("Plan validation failed (DAG Cycle detected)")


def _resolve_step_tool(step: PlanStep, invalid_tools: list[str]) -> ToolContract | None:
    resolved_tool = resolve_tool_name(step.tool)
    if not resolved_tool:
        invalid_tools.append(step.tool)
        return None

    step.tool = resolved_tool
    return TOOL_REGISTRY[step.tool]


def _validate_step_input_schema(
    step: PlanStep, tool_contract: ToolContract, invalid_schemas: list[str]
) -> None:
    if not tool_contract.input_schema:
        return

    try:
        jsonschema.validate(instance=step.input, schema=tool_contract.input_schema)
    except jsonschema.exceptions.ValidationError as err:
        invalid_schemas.append(f"Step {step.id} ({step.tool}) schema error: {err.message}")


def _validate_step_compensation(
    step: PlanStep, tool_contract: ToolContract, invalid_compensations: list[str]
) -> None:
    if not step.compensation:
        return

    resolved_comp = resolve_tool_name(step.compensation)
    if not resolved_comp:
        invalid_compensations.append(f"{step.compensation} (unknown tool)")
        return

    step.compensation = resolved_comp
    if not tool_contract.compensable:
        invalid_compensations.append(
            f"{step.compensation} (tool {step.tool} does not support compensation)"
        )
        return

    if step.compensation not in tool_contract.compensation_tools_allowed:
        invalid_compensations.append(f"{step.compensation} (not allowed for {step.tool})")


def _raise_plan_validation_errors(
    invalid_tools: list[str], invalid_compensations: list[str], invalid_schemas: list[str]
) -> None:
    if invalid_tools:
        _raise_non_retryable_plan_error(f"Plan contains unknown tools: {invalid_tools}")
    if invalid_compensations:
        _raise_non_retryable_plan_error(
            f"Plan contains invalid compensations: {invalid_compensations}"
        )
    if invalid_schemas:
        _raise_non_retryable_plan_error(f"Plan contains invalid tool inputs: {invalid_schemas}")


def _validate_generated_plan(plan: GeneratedPlan) -> None:
    invalid_tools: list[str] = []
    invalid_compensations: list[str] = []
    invalid_schemas: list[str] = []

    _validate_plan_dependencies(plan)

    for step in plan.steps:
        tool_contract = _resolve_step_tool(step, invalid_tools)
        if not tool_contract:
            continue

        _validate_step_input_schema(step, tool_contract, invalid_schemas)
        _validate_step_compensation(step, tool_contract, invalid_compensations)

    _raise_plan_validation_errors(invalid_tools, invalid_compensations, invalid_schemas)


def _build_safe_user_message(goal: str, context: dict[str, Any]) -> str:
    try:
        return _ns().create_safe_user_message(goal, context)
    except PromptInjectionError as err:
        _ns().activity.logger.warning(f"Prompt injection blocked: {err.pattern}")
        _raise_non_retryable_plan_error("Request rejected: potential prompt injection detected")


@activity.defn(name="generate_plan_with_llm")
async def generate_plan_with_llm(goal: str, context: dict[str, Any]) -> dict[str, Any]:
    """
    Generate execution plan using LLM with structured output (instructor).

    This activity:
    1. Calls LLM with structured output (Pydantic schema)
    2. Validates plan structure
    3. Stores plan in semantic cache for future hits
    4. Returns plan to workflow

    Args:
        goal: User's natural language goal
        context: Additional context (user prefs, history)

    Returns:
        Generated plan with steps

    Why instructor + litellm:
    - instructor: Forces LLM to return structured Pydantic objects (no parsing needed)
    - litellm: Vendor-agnostic (OpenAI, Anthropic, Cohere, etc. with same interface)
    """
    _ns().activity.logger.info(f"Generating plan for goal: {goal}")

    # Build prompt
    system_prompt = """You are an AI task planner. Given a user goal, generate an execution plan.

Rules:
1. Break goal into sequential steps (each step = one tool call)
2. Define dependencies (steps that must complete before this one)
3. Assign compensation activities for reversible actions
4. Use ONLY the available tools listed below:
   - respond_to_user
   - search_database
   - create_record
   - delete_record
   - send_email
   - call_webhook
   - search_youtube
5. For greetings, questions, explanations, summaries, or ANY request that needs no
   external action, output a SINGLE step using respond_to_user, with input.message
   set to the complete, final, user-facing answer. Do NOT use other tools for these.

Example:
Goal: "Create a new integration and notify the team"
Plan:
- Step 1: create_record (table=integrations, data={...}), compensation=delete_record
- Step 2: send_email (to=team@example.com, body=notification)

Output valid JSON matching the PlanStep schema."""

    # Use instructor to get structured output
    client = instructor.from_litellm(acompletion)

    try:
        safe_user_message = _build_safe_user_message(goal, context)
        resolved_model = _resolve_llm_model(context)

        plan = await client.chat.completions.create(
            model=resolved_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": safe_user_message},
            ],
            response_model=GeneratedPlan,
            temperature=float(os.getenv("DEFAULT_LLM_TEMPERATURE", "0.0")),  # type: ignore[misc]
        )

        _ns().activity.logger.info(f"✓ Plan generated: {len(plan.steps)} steps")
        _validate_generated_plan(plan)

        # Store in semantic cache for future hits
        if _semantic_cache():
            await _semantic_cache().store_plan(
                goal=goal,
                plan_steps=[step.model_dump() for step in plan.steps],
            )
            metrics.record_cache_store()

        # Return as dict for workflow
        return {
            "plan_id": plan.plan_id,
            "steps": [step.model_dump() for step in plan.steps],
        }

    except Exception as e:
        _ns().activity.logger.error(f"Plan generation failed: {e!s}")
        raise
