"""
Temporal Activities for Tool Execution and External I/O.

Activities are the ONLY way workflows can interact with the external world:
- Database queries (Supabase)
- API calls (LLMs, external services)
- File I/O
- Redis operations

Why Activities (not direct calls in workflows):
1. **Determinism**: Workflows must be deterministic for replay. Activities are recorded
   in history, so replay uses cached results instead of re-executing.

2. **Retries**: Activities have independent retry policies. Workflow doesn't need to
   handle transient failures.

3. **Timeouts**: Activities have start-to-close timeouts. Prevents hung workflows.

4. **Heartbeats**: Long-running activities can send heartbeats to detect worker crashes.

Compensation Pattern:
- Each forward activity (e.g., book_flight) has a compensation (e.g., cancel_flight)
- Compensations MUST be idempotent (safe to call multiple times)
- Best-effort rollback (log failures but don't block)
"""

import asyncio
import contextlib
import ipaddress
import json
import os
import time
from datetime import datetime, timezone
from typing import Any, NoReturn
from urllib.parse import urlparse, urlunparse
from uuid import uuid4

import instructor
import jsonschema  # type: ignore
from litellm import acompletion
from pydantic import BaseModel
from temporalio import activity

import metrics
from activities.tool_registry import TOOL_REGISTRY, ToolContract, resolve_tool_name
from models.audit import AuditAction, AuditResourceType, AuditStatus, log_audit_event
from providers.database.base import DatabaseError
from providers.database.factory import get_database_provider
from security.prompt_sanitizer import PromptInjectionError, create_safe_user_message
from security.ssrf import validate_url_with_dns_pin_async

# Global service instances (initialized in setup_activities())
_semantic_cache = None  # SemanticCacheService instance
_redis_client = None


# ============================================================================
# SHARED IDEMPOTENCY GUARD
# ============================================================================


async def _idempotency_guard(
    db: Any,
    idempotency_key: str,
    tool_name: str,
    workflow_id: str,
) -> dict[str, Any] | None:
    """
    Check the idempotency ledger and insert a pending record if not found.

    Returns the stored result dict if the key already completed successfully,
    or None if execution should proceed.  Errors are swallowed and logged so
    that ledger unavailability never blocks the actual work.
    """
    try:
        existing = await db.select(
            table="idempotency_ledger",
            filters={"idempotency_key": idempotency_key},
        )
        if existing and existing[0].get("status") == "completed":
            activity.logger.info(
                "%s already executed successfully. Returning stored result. Key: %s",
                tool_name,
                idempotency_key,
            )
            return json.loads(existing[0].get("result_payload", "{}"))
        # "pending" status: concurrent execution or failed attempt — fall through
    except DatabaseError as e:
        # Log but allow retry — Temporal will retry the activity on transient DB failures
        activity.logger.warning(
            "Idempotency check failed for %s (key=%s): %s — proceeding unguarded",
            tool_name,
            idempotency_key,
            e,
        )

    try:
        await db.upsert(
            table="idempotency_ledger",
            record={
                "idempotency_key": idempotency_key,
                "status": "pending",
                "workflow_id": workflow_id,
                "tool_name": tool_name,
            },
            conflict_columns=["idempotency_key"],
        )
    except DatabaseError as e:
        activity.logger.warning(
            "Failed to insert pending idempotency record for %s: %s", tool_name, e
        )

    return None


# ============================================================================
# ACTIVITY SETUP
# ============================================================================


async def setup_activities(
    supabase_url: str,
    supabase_key: str,
    redis_url: str,
    redis_password: str | None = None,
    redis_ssl: bool = False,
) -> None:
    """
    Initialize activity dependencies (database provider, Redis, etc.).

    This MUST be called before starting Temporal worker.

    Args:
        supabase_url: Supabase project URL
        supabase_key: Supabase service role key
        redis_url: Redis connection URL
        redis_password: Optional Redis password
        redis_ssl: Whether to use SSL for Redis connection
    """
    global _semantic_cache, _redis_client

    # Set environment variables for database provider factory
    os.environ["SUPABASE_URL"] = supabase_url
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = supabase_key

    # Initialize semantic cache (optional). Mode resolution (FR4):
    #   SEMANTIC_CACHE_ENABLED=false        → off (legacy kill-switch, always wins)
    #   SEMANTIC_CACHE_MODE=off             → off
    #   SEMANTIC_CACHE_MODE=lite            → stdlib LiteEmbedder, fits a 512MB worker
    #   SEMANTIC_CACHE_MODE=full (default)  → sentence-transformers (needs ≥2GB RAM)
    # Off only removes a planning-latency optimization; correctness is unaffected
    # (check_semantic_cache returns a miss).
    mode = _resolve_cache_mode()
    if mode == "off":
        activity.logger.info("Semantic cache DISABLED (mode=off) - skipping embedding model load")
    else:
        from infrastructure.cache import SemanticCacheService

        if mode == "lite":
            from infrastructure.lite_embedder import LiteEmbedder

            embedding_model: str | LiteEmbedder = LiteEmbedder()
        else:
            embedding_model = os.getenv("CACHE_EMBEDDING_MODEL", "all-MiniLM-L6-v2")

        _semantic_cache = SemanticCacheService(
            redis_url=redis_url,
            redis_password=redis_password,
            redis_ssl=redis_ssl,
            embedding_model=embedding_model,
            similarity_threshold=float(os.getenv("CACHE_SIMILARITY_THRESHOLD", "0.85")),
        )
        await _semantic_cache.initialize()
        activity.logger.info(f"✓ Semantic cache initialized (mode={mode})")


def _resolve_cache_mode() -> str:
    """
    Resolve the semantic-cache mode from environment (FR4).

    Returns one of "off" | "lite" | "full". The legacy SEMANTIC_CACHE_ENABLED
    kill-switch (false/0/no) always wins so the existing production config
    keeps its exact behavior until the owner flips it deliberately.
    """
    if os.getenv("SEMANTIC_CACHE_ENABLED", "true").lower() in ("false", "0", "no"):
        return "off"
    mode = os.getenv("SEMANTIC_CACHE_MODE", "full").lower()
    return mode if mode in ("off", "lite", "full") else "full"


# ============================================================================
# PLANNING ACTIVITIES
# ============================================================================


@activity.defn(name="check_semantic_cache")
async def check_semantic_cache(goal: str) -> dict[str, Any] | None:
    """
    Check semantic cache for existing plan template.

    Returns:
        Cached plan with injected parameters if hit, else None

    Example:
        goal = "Book flight to Paris tomorrow"
        → Cache returns plan with "Paris" and "tomorrow" injected
    """
    if not _semantic_cache:
        activity.logger.info("Semantic cache disabled/unavailable - treating as cache miss")
        metrics.record_cache_lookup("disabled")
        return None

    activity.logger.info(f"Checking semantic cache for: {goal}")

    cached = await _semantic_cache.get_plan(goal)

    if cached:
        activity.logger.info(
            f"✓ Cache HIT (similarity={cached.similarity_score:.3f}, template={cached.template_id})"
        )
        metrics.record_cache_lookup("hit")
        # Convert Pydantic model to dict for workflow
        return cached.model_dump()

    activity.logger.info("✗ Cache MISS")
    metrics.record_cache_lookup("miss")
    return None


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
        return create_safe_user_message(goal, context)
    except PromptInjectionError as err:
        activity.logger.warning(f"Prompt injection blocked: {err.pattern}")
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
    activity.logger.info(f"Generating plan for goal: {goal}")

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

        activity.logger.info(f"✓ Plan generated: {len(plan.steps)} steps")
        _validate_generated_plan(plan)

        # Store in semantic cache for future hits
        if _semantic_cache:
            await _semantic_cache.store_plan(
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
        activity.logger.error(f"Plan generation failed: {e!s}")
        raise


# ============================================================================
# TOOL EXECUTION ACTIVITIES (Examples)
# ============================================================================


@activity.defn(name="search_database")
async def search_database(params: dict[str, Any]) -> dict[str, Any]:
    """
    Search database using provider interface.

    Example tool demonstrating database integration with Temporal resilience.

    Args:
        params: {
            "table": "profiles",
            "filters": {"email": "user@example.com"},
            "select": "id,full_name,avatar_url"
        }

    Returns:
        Query results
    """
    table = str(params.get("table", ""))
    filters = params.get("filters", {})
    select_fields = params.get("select", "*")
    start_time = time.time()

    activity.logger.info(f"Searching {table} with filters: {filters}")

    error_msg = None
    result_count = 0

    try:
        # Get database provider instance
        db = get_database_provider()

        # Perform select operation
        data = await db.select(table=table, filters=filters, select_fields=select_fields)

        result_count = len(data)

        # Audit success
        await log_audit_event(
            actor_id="orchestrator",
            action=AuditAction.DATA_ACCESS,
            resource_type=AuditResourceType.DATABASE,
            resource_id=f"{table}:{json.dumps(filters)}",
            status=AuditStatus.SUCCESS,
            duration_ms=int((time.time() - start_time) * 1000),
            workflow_id=params.get("workflow_id", ""),
        )

        return {
            "success": True,
            "data": data,
            "count": result_count,
        }

    except Exception as e:
        error_msg = str(e)
        activity.logger.error(f"Database search failed: {error_msg}")

        # Audit failure
        await log_audit_event(
            actor_id="orchestrator",
            action=AuditAction.DATA_ACCESS,
            resource_type=AuditResourceType.DATABASE,
            resource_id=f"{table}:{json.dumps(filters)}",
            status=AuditStatus.FAILURE,
            duration_ms=int((time.time() - start_time) * 1000),
            workflow_id=params.get("workflow_id", ""),
        )

        # Use ApplicationError for retryable failures (network timeouts, temporary unavailability)
        from temporalio.exceptions import ApplicationError

        raise ApplicationError(f"Database search failed: {error_msg}", non_retryable=False) from e


@activity.defn(name="create_record")
async def create_record(params: dict[str, Any]) -> dict[str, Any]:
    """
    Create record in database.

    Compensation: delete_record

    Args:
        params: {
            "table": "integrations",
            "data": {"type": "slack", "name": "My Slack", "config": {...}}
        }

    Returns:
        Created record with ID
    """
    table = str(params.get("table", ""))
    data = dict(params.get("data", {}))
    start_time = time.time()

    activity.logger.info(f"Creating record in {table}")

    error_msg = None
    record_id = None

    try:
        # Get database provider instance
        db = get_database_provider()

        # Perform insert operation
        created = await db.insert(table=table, record=data)

        record_id = created.get("id")

        # Audit success
        await log_audit_event(
            actor_id="orchestrator",
            action=AuditAction.DATA_MODIFY,
            resource_type=AuditResourceType.DATABASE,
            resource_id=f"{table}:{record_id}",
            status=AuditStatus.SUCCESS,
            duration_ms=int((time.time() - start_time) * 1000),
            workflow_id=params.get("workflow_id", ""),
        )

        return {
            "success": True,
            "id": record_id,
            "data": created,
        }

    except Exception as e:
        error_msg = str(e)
        activity.logger.error(f"Record creation failed: {error_msg}")

        # Audit failure
        await log_audit_event(
            actor_id="orchestrator",
            action=AuditAction.DATA_MODIFY,
            resource_type=AuditResourceType.DATABASE,
            resource_id=f"{table}:create",
            status=AuditStatus.FAILURE,
            duration_ms=int((time.time() - start_time) * 1000),
            workflow_id=params.get("workflow_id", ""),
        )

        raise


@activity.defn(name="delete_record")
async def delete_record(params: dict[str, Any]) -> dict[str, Any]:
    """
    Delete record from database (compensation for create_record).

    IMPORTANT: This is idempotent - safe to call multiple times.

    Args:
        params: {
            "table": "integrations",
            "id": "uuid-here"
        }

    Returns:
        Deletion result
    """
    table = str(params.get("table", ""))
    record_id = params.get("id")
    start_time = time.time()

    activity.logger.info(f"Deleting record from {table}: {record_id}")

    error_msg = None

    try:
        # Get database provider instance
        db = get_database_provider()

        # Delete record by ID filter
        deleted_count = await db.delete(table=table, filters={"id": record_id})

        # Audit success
        await log_audit_event(
            actor_id="orchestrator",
            action=AuditAction.DATA_DELETE,
            resource_type=AuditResourceType.DATABASE,
            resource_id=f"{table}:{record_id}",
            status=AuditStatus.SUCCESS,
            duration_ms=int((time.time() - start_time) * 1000),
            workflow_id=params.get("workflow_id", ""),
        )

        if deleted_count == 0:
            activity.logger.info("Record already deleted - idempotent success")
            return {"success": True, "already_deleted": True}

        return {
            "success": True,
            "deleted_id": record_id,
        }

    except Exception as e:
        error_msg = str(e)
        activity.logger.error(f"Record deletion failed: {error_msg}")

        # Audit failure (best-effort - don't block compensation)
        try:
            await log_audit_event(
                actor_id="orchestrator",
                action=AuditAction.DATA_DELETE,
                resource_type=AuditResourceType.DATABASE,
                resource_id=f"{table}:{record_id}",
                status=AuditStatus.FAILURE,
                duration_ms=int((time.time() - start_time) * 1000),
                workflow_id=params.get("workflow_id", ""),
            )
        except Exception as audit_error:
            activity.logger.warning(f"Audit logging failed: {audit_error}")

        # Don't raise - best-effort compensation
        return {"success": False, "error": error_msg}


@activity.defn(name="send_email")
async def send_email(params: dict[str, Any]) -> dict[str, Any]:
    """
    Send email via Supabase Edge Function.

    No compensation (emails can't be unsent).
    Durable idempotency protection included.
    """
    to = params.get("to")
    _subject = params.get("subject", "Welcome!")
    _body = params.get("body", "Hello world")

    # Generate idempotency key based on workflow and step
    try:
        if not hasattr(activity, "info"):
            raise RuntimeError("mocked")
        info = activity.info()
        workflow_id = info.workflow_id or ""
        step_id = params.get("step_id", info.activity_id)
    except Exception:
        # Fallback for testing environments without temporal context
        workflow_id = "test-workflow"
        step_id = params.get("step_id", "test-step")

    idempotency_key = f"{workflow_id}:{step_id}:send_email"

    db = get_database_provider()

    cached = await _idempotency_guard(db, idempotency_key, "send_email", workflow_id)
    if cached is not None:
        return cached

    activity.logger.info(f"Sending email to: {to}")

    result: dict[str, Any]

    # Production path: delegate to Supabase Edge Function for actual delivery
    edge_function_url = os.getenv("SUPABASE_EDGE_FUNCTION_URL")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "")

    if edge_function_url and supabase_anon_key:
        import httpx

        send_url = f"{edge_function_url}/send-email"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    send_url,
                    json={"to": to, "subject": _subject, "body": _body},
                    headers={
                        "Authorization": f"Bearer {supabase_anon_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=15.0,
                )
                response.raise_for_status()
                resp_data = response.json()
                result = {
                    "success": True,
                    "message_id": resp_data.get("message_id", str(uuid4())),
                    "to": to,
                }
        except Exception as e:
            activity.logger.error(f"Email send via edge function failed: {e}")
            raise
    else:
        # Development/test fallback: simulate delivery
        activity.logger.warning(
            "Email provider not configured (SUPABASE_EDGE_FUNCTION_URL / SUPABASE_ANON_KEY). "
            "Using simulated delivery. Set these env vars for production email."
        )
        await asyncio.sleep(0.1)
        result = {
            "success": True,
            "message_id": str(uuid4()),
            "to": to,
            "simulated": True,
        }

    # Record success
    try:
        await db.update(
            table="idempotency_ledger",
            updates={"status": "completed", "result_payload": json.dumps(result)},
            filters={"idempotency_key": idempotency_key},
        )
    except Exception as e:
        activity.logger.warning(f"Failed to record email success in ledger: {e}")

    return result


@activity.defn(name="call_webhook")
async def call_webhook(params: dict[str, Any]) -> dict[str, Any]:
    """
    Call external webhook. Durable idempotency protection included.
    """
    import httpx

    url = str(params.get("url", ""))
    method = params.get("method", "POST")
    payload = params.get("payload", {})

    # Generate idempotency key based on workflow and step
    try:
        if not hasattr(activity, "info"):
            raise RuntimeError("mocked")
        info = activity.info()
        workflow_id = info.workflow_id or ""
        step_id = params.get("step_id", info.activity_id)
    except Exception:
        # Fallback for testing environments without temporal context
        workflow_id = "test-workflow"
        step_id = params.get("step_id", "test-step")

    idempotency_key = f"{workflow_id}:{step_id}:call_webhook"

    db = get_database_provider()

    cached = await _idempotency_guard(db, idempotency_key, "call_webhook", workflow_id)
    if cached is not None:
        return cached

    try:
        validated_url = await validate_url_with_dns_pin_async(url)
    except ValueError as e:
        activity.logger.error(f"Blocked SSRF attempt: {e}")
        result = {
            "success": False,
            "error": f"Security violation: {e!s}",
            "status_code": 403,
        }

        # Record failure
        with contextlib.suppress(Exception):
            await db.update(
                table="idempotency_ledger",
                updates={"status": "failed", "result_payload": json.dumps(result)},
                filters={"idempotency_key": idempotency_key},
            )

        return result

    request_headers: dict[str, str] = {}
    parsed = urlparse(validated_url.original_url)
    request_url = validated_url.original_url
    if parsed.hostname and not _is_ip_literal(parsed.hostname):
        pinned_netloc = parsed.netloc.replace(parsed.hostname, validated_url.resolved_ip, 1)
        request_url = urlunparse(parsed._replace(netloc=pinned_netloc))
        request_headers["Host"] = validated_url.host_header

    activity.logger.info(f"Calling webhook: {method} {validated_url.original_url}")

    async with httpx.AsyncClient(follow_redirects=False) as client:
        try:
            response = await client.request(  # NOSONAR - URL validated by SSRF guard above
                method=method,
                url=request_url,
                json=payload,
                headers=request_headers,
                timeout=15.0,
            )

            result = {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "body": response.text,
            }

            # Record success
            try:
                await db.update(
                    table="idempotency_ledger",
                    updates={"status": "completed", "result_payload": json.dumps(result)},
                    filters={"idempotency_key": idempotency_key},
                )
            except Exception as e:
                activity.logger.warning(f"Failed to record webhook success in ledger: {e}")

            return result

        except Exception as e:
            result = {"success": False, "error": str(e)}
            # Record failure
            with contextlib.suppress(Exception):
                await db.update(
                    table="idempotency_ledger",
                    updates={"status": "failed", "result_payload": json.dumps(result)},
                    filters={"idempotency_key": idempotency_key},
                )
            raise


def _is_ip_literal(value: str) -> bool:
    try:
        ipaddress.ip_address(value.strip("[]"))
        return True
    except ValueError:
        return False


@activity.defn(name="search_youtube")
async def search_youtube(params: dict[str, Any]) -> dict[str, Any]:
    """
    Search YouTube for videos.

    Args:
        params: {
            "query": "funny cats"
        }

    Returns:
        List of videos
    """
    query = params.get("query")
    if not query:
        return {"success": False, "error": "query parameter is required", "videos": []}

    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        return {
            "success": False,
            "error": "YouTube integration not configured — YOUTUBE_API_KEY env var is missing",
            "videos": [],
        }

    activity.logger.info(f"Searching YouTube for: {query}")

    import httpx

    max_results = int(params.get("max_results", 5))
    url = "https://www.googleapis.com/youtube/v3/search"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            url,
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": max_results,
                "key": api_key,
            },
        )
        if resp.status_code != 200:
            activity.logger.error(f"YouTube API error {resp.status_code}: {resp.text[:200]}")
            return {
                "success": False,
                "error": f"YouTube API returned HTTP {resp.status_code}",
                "videos": [],
            }
        data = resp.json()

    videos = [
        {
            "title": item["snippet"]["title"],
            "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            "description": item["snippet"]["description"],
            "channel": item["snippet"]["channelTitle"],
            "published_at": item["snippet"]["publishedAt"],
        }
        for item in data.get("items", [])
        if item.get("id", {}).get("videoId")
    ]

    return {"success": True, "videos": videos, "total_results": len(videos)}


@activity.defn(name="respond_to_user")
async def respond_to_user(params: dict[str, Any]) -> dict[str, Any]:
    """Return a direct conversational answer to the user.

    For informational / Q&A / greeting / summary requests that need no external
    action. The planner writes the complete answer into params["message"]; this
    activity returns it verbatim as the reply (deterministic, no I/O).
    """
    message = str(params.get("message", "")).strip()
    if not message:
        message = "I'm online, but I didn't have anything specific to add."
    activity.logger.info("respond_to_user: returning direct answer")
    return {"success": True, "reply": message}


@activity.defn(name="update_agent_run_completion")
async def update_agent_run_completion(params: dict[str, Any]) -> dict[str, Any]:
    """
    Update agent_runs table with workflow completion status and response.

    Called when workflow completes successfully to notify UI via realtime subscription.

    Args:
        params: {
            "trace_id": "uuid-of-agent-run",
            "status": "completed" | "failed",
            "agent_response": {...}  # Final workflow result or error details
        }

    Returns:
        Update result
    """
    trace_id = params.get("trace_id")
    status = params.get("status")
    agent_response = params.get("agent_response", {})

    activity.logger.info(f"Updating agent_run completion: {trace_id} -> {status}")

    try:
        # Get database provider instance
        db = get_database_provider()

        # Prepare update data — use real ISO UTC timestamp, not the literal string "now()"
        update_data = {
            "status": status,
            "end_time": datetime.now(timezone.utc).isoformat(),
        }

        if status == "completed":
            update_data["agent_response"] = json.dumps(agent_response)
        elif status == "failed":
            update_data["error_message"] = str(agent_response.get("error", "Unknown error"))

        # Update the agent_run record
        await db.update(table="agent_runs", updates=update_data, filters={"id": trace_id})

        activity.logger.info(f"✓ Updated agent_run {trace_id} with status {status}")

        return {
            "success": True,
            "updated_id": trace_id,
            "status": status,
        }

    except Exception as e:
        error_msg = str(e)
        activity.logger.error(f"Failed to update agent_run completion: {error_msg}")

        # Don't raise - this is best-effort notification to UI
        return {
            "success": False,
            "error": error_msg,
            "trace_id": trace_id,
        }


# ============================================================================
# BYOM PILOT SESSION MINTING (Context Binding)
# ============================================================================


@activity.defn(name="mint_pilot_session")
async def mint_pilot_session(params: dict[str, Any]) -> dict[str, Any]:
    """
    Mint a pilot session for BYOM credential binding.

    Called at workflow start when run_context.credential_type == 'byom'.
    Inserts a new record into pilot_sessions and returns the pilot_session_id
    for binding to the active AgentRunContext.

    Args:
        params: {
            "user_id": "uuid",
            "tenant_id": "uuid",
            "connection_id": "uuid (from provider_connections)",
            "trace_id": "uuid (agent_runs.id)",
            "model": "gpt-4o",
            "sovereignty_mode": "standard" | "byom_sovereign" | "strict_region",
            "policy_snapshot_hash": "sha256-hex-string"
        }

    Returns:
        {
            "success": True,
            "pilot_session_id": "uuid",
            "connection_id": "uuid",
            "expires_at": "iso-timestamp"
        }
    """
    user_id = params.get("user_id")
    tenant_id = params.get("tenant_id", user_id)
    connection_id = params.get("connection_id")
    trace_id = params.get("trace_id")
    model = params.get("model", "gpt-4o")
    sovereignty_mode = params.get("sovereignty_mode", "standard")
    policy_snapshot_hash = params.get("policy_snapshot_hash", "")

    if not connection_id or not trace_id or not user_id:
        activity.logger.warning("mint_pilot_session: missing required params, skipping")
        return {"success": False, "error": "Missing connection_id, trace_id, or user_id"}

    activity.logger.info(
        f"Minting pilot session: user={user_id}, connection={connection_id}, "
        f"trace={trace_id}, model={model}"
    )

    try:
        db = get_database_provider()

        # Verify credential is active
        connections = await db.select(
            table="provider_connections",
            filters={"connection_id": connection_id, "status": "active"},
            select_fields="connection_id",
        )
        if not connections:
            return {
                "success": False,
                "error": f"Connection {connection_id} not found or not active",
            }

        # Insert pilot session (1-hour expiry)
        record = {
            "connection_id": connection_id,
            "trace_id": trace_id,
            "user_id": user_id,
            "tenant_id": tenant_id,
            "model": model,
            "sovereignty_mode": sovereignty_mode,
            "policy_snapshot_hash": policy_snapshot_hash,
            "expires_at": "now() + interval '1 hour'",
        }

        created = await db.insert(table="pilot_sessions", record=record)
        pilot_session_id = created.get("pilot_session_id")

        activity.logger.info(f"✓ Pilot session minted: {pilot_session_id}")

        return {
            "success": True,
            "pilot_session_id": pilot_session_id,
            "connection_id": connection_id,
            "expires_at": created.get("expires_at"),
        }

    except Exception as e:
        error_msg = str(e)
        activity.logger.error(f"Pilot session mint failed: {error_msg}")
        return {"success": False, "error": error_msg}


# ============================================================================
# DISTRIBUTED RELIABILITY - Using Temporal's Built-in Mechanisms
# ============================================================================

# NOTE: Manual distributed locking removed. Use Temporal's built-in workflow
# serialization and Signals for critical sections instead of Redis-based locks.
# This eliminates race conditions and simplifies the architecture.

# For critical sections requiring serialization:
# 1. Use Workflow Signals to coordinate between workflow instances
# 2. Use Temporal's built-in workflow mutexes for resource locking
# 3. Leverage Saga patterns for compensation-based error handling

# Example: Instead of manual locking, use workflow signals:
# await workflow.wait_condition(lambda: workflow_state.is_ready)
# signal = workflow.get_external_signal("resource_available")
# await signal
