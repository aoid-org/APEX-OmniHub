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
from typing import Any
from urllib.parse import urlparse, urlunparse
from uuid import uuid4

import instructor
from litellm import acompletion
from pydantic import BaseModel
from temporalio import activity

from models.audit import AuditAction, AuditResourceType, AuditStatus, log_audit_event
from providers.database.base import DatabaseError
from providers.database.factory import get_database_provider
from security.prompt_sanitizer import PromptInjectionError, create_safe_user_message
from security.ssrf import validate_url_with_dns_pin_async

# Canonical set of allowed tools (must match registered Temporal activities)
# Central Tool Registry
from activities.tool_registry import TOOL_REGISTRY, resolve_tool_name  # noqa: E402
from models.audit import AuditAction, AuditResourceType, AuditStatus, log_audit_event  # noqa: E402
from providers.database.factory import get_database_provider  # noqa: E402
from security.prompt_sanitizer import PromptInjectionError, create_safe_user_message  # noqa: E402

# Global service instances (initialized in setup_activities())
_semantic_cache = None  # SemanticCacheService instance
_redis_client = None


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

    # Initialize semantic cache
    from infrastructure.cache import SemanticCacheService

    _semantic_cache = SemanticCacheService(
        redis_url=redis_url,
        redis_password=redis_password,
        redis_ssl=redis_ssl,
        embedding_model=os.getenv("CACHE_EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
        similarity_threshold=float(os.getenv("CACHE_SIMILARITY_THRESHOLD", "0.85")),
    )
    await _semantic_cache.initialize()
    activity.logger.info("✓ Semantic cache initialized")


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
        raise RuntimeError("Semantic cache not initialized - call setup_activities() first")

    activity.logger.info(f"Checking semantic cache for: {goal}")

    cached = await _semantic_cache.get_plan(goal)

    if cached:
        activity.logger.info(
            f"✓ Cache HIT (similarity={cached.similarity_score:.3f}, template={cached.template_id})"
        )
        # Convert Pydantic model to dict for workflow
        return cached.model_dump()

    activity.logger.info("✗ Cache MISS")
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
   - search_database
   - create_record
   - delete_record
   - send_email
   - call_webhook
   - search_youtube

Example:
Goal: "Create a new integration and notify the team"
Plan:
- Step 1: create_record (table=integrations, data={...}), compensation=delete_record
- Step 2: send_email (to=team@example.com, body=notification)

Output valid JSON matching the PlanStep schema."""

    # Use instructor to get structured output
    client = instructor.from_litellm(acompletion)

    try:
        # SECURITY: Sanitize user input to prevent prompt injection
        # CVE fix: Never interpolate raw user input into prompts
        try:
            safe_user_message = create_safe_user_message(goal, context)
        except PromptInjectionError as e:
            activity.logger.warning(f"Prompt injection blocked: {e.pattern}")
            from temporalio.exceptions import ApplicationError

            raise ApplicationError(
                "Request rejected: potential prompt injection detected",
                non_retryable=True,  # Don't retry injection attempts
            ) from e

        # Phase 7: Tenant-aware model resolution
        system_default_model = os.getenv("DEFAULT_LLM_MODEL", "gpt-4-turbo-preview")
        tenant_model = context.get("tenant_model")
        requested_model = context.get("requested_model")

        # Resolve by precedence: explicit request -> tenant default -> system default
        resolved_model = requested_model or tenant_model or system_default_model

        # Enforce tenant allowlists
        allowed_models = context.get("allowed_models", [])
        if allowed_models and resolved_model not in allowed_models:
            from temporalio.exceptions import ApplicationError

            raise ApplicationError(
                f"Model {resolved_model} is not approved for this tenant", non_retryable=True
            )

        plan = await client.chat.completions.create(
            model=resolved_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": safe_user_message},
            ],
            response_model=GeneratedPlan,
            temperature=float(os.getenv("DEFAULT_LLM_TEMPERATURE", "0.0")),
        )

        activity.logger.info(f"✓ Plan generated: {len(plan.steps)} steps")

        # Phase 1 & 2: Structural validation via ToolRegistry
        invalid_tools = []
        invalid_compensations = []
        invalid_schemas = []

        # Track steps and dependencies for DAG validation
        step_ids = {s.id for s in plan.steps}
        dependencies = {s.id: s.depends_on for s in plan.steps}
        missing_deps = []

        # Fast fail on missing dependency references
        for step_id, deps in dependencies.items():
            for dep in deps:
                if dep not in step_ids:
                    missing_deps.append(f"Step {step_id} depends on unknown step {dep}")

        if missing_deps:
            from temporalio.exceptions import ApplicationError

            raise ApplicationError(
                f"Plan validation failed (Missing dependencies): {missing_deps}", non_retryable=True
            )

        # Detect DAG cycles via topological sort check
        def has_cycle(deps_map):
            visited = set()
            path = set()

            def visit(node):
                if node in path:
                    return True
                if node in visited:
                    return False
                visited.add(node)
                path.add(node)
                for neighbor in deps_map.get(node, []):
                    if visit(neighbor):
                        return True
                path.remove(node)
                return False

            return any(visit(node) for node in deps_map)

        if has_cycle(dependencies):
            from temporalio.exceptions import ApplicationError

            raise ApplicationError(
                "Plan validation failed (DAG Cycle detected)", non_retryable=True
            )

        for step in plan.steps:
            # Resolve canonical tool name
            resolved_tool = resolve_tool_name(step.tool)
            if not resolved_tool:
                invalid_tools.append(step.tool)
                continue

            step.tool = resolved_tool
            tool_contract = TOOL_REGISTRY[step.tool]

            # Input schema validation
            try:
                if tool_contract.input_schema:
                    jsonschema.validate(instance=step.input, schema=tool_contract.input_schema)
            except jsonschema.exceptions.ValidationError as e:
                invalid_schemas.append(f"Step {step.id} ({step.tool}) schema error: {e.message}")

            # Validate compensation if specified
            if step.compensation:
                resolved_comp = resolve_tool_name(step.compensation)
                if not resolved_comp:
                    invalid_compensations.append(f"{step.compensation} (unknown tool)")
                    continue

                step.compensation = resolved_comp
                if not tool_contract.compensable:
                    invalid_compensations.append(
                        f"{step.compensation} (tool {step.tool} does not support compensation)"
                    )
                elif step.compensation not in tool_contract.compensation_tools_allowed:
                    invalid_compensations.append(
                        f"{step.compensation} (not allowed for {step.tool})"
                    )

        if invalid_tools:
            from temporalio.exceptions import ApplicationError

            raise ApplicationError(
                f"Plan contains unknown tools: {invalid_tools}", non_retryable=True
            )

        if invalid_compensations:
            from temporalio.exceptions import ApplicationError

            raise ApplicationError(
                f"Plan contains invalid compensations: {invalid_compensations}", non_retryable=True
            )

        if invalid_schemas:
            from temporalio.exceptions import ApplicationError

            raise ApplicationError(
                f"Plan contains invalid tool inputs: {invalid_schemas}", non_retryable=True
            )

        # Store in semantic cache for future hits
        if _semantic_cache:
            await _semantic_cache.store_plan(
                goal=goal,
                plan_steps=[step.model_dump() for step in plan.steps],
            )

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
        workflow_id = info.workflow_id
        step_id = params.get("step_id", info.activity_id)
    except Exception:
        # Fallback for testing environments without temporal context
        workflow_id = "test-workflow"
        step_id = params.get("step_id", "test-step")

    idempotency_key = f"{workflow_id}:{step_id}:send_email"

    db = get_database_provider()

    # Check if a successful execution already exists
    try:
        existing = await db.select(
            table="idempotency_ledger",
            filters={"idempotency_key": idempotency_key},
        )
        if existing and existing[0].get("status") == "completed":
            activity.logger.info(
                f"Email already sent successfully. Returning stored result. Key: {idempotency_key}"
            )
            return json.loads(existing[0].get("result_payload", "{}"))
        if existing and existing[0].get("status") == "pending":
            # Concurrent execution or failed attempt that left a pending record
            pass
    except DatabaseError as e:
        activity.logger.warning(f"Failed to check idempotency ledger for send_email: {e}")

    # Insert pending record
    try:
        await db.upsert(
            table="idempotency_ledger",
            record={
                "idempotency_key": idempotency_key,
                "status": "pending",
                "workflow_id": workflow_id,
                "tool_name": "send_email",
            },
            conflict_columns=["idempotency_key"],
        )
    except DatabaseError as e:
        activity.logger.warning(f"Failed to insert pending idempotency record for send_email: {e}")

    activity.logger.info(f"Sending email to: {to}")

    # In production, call Supabase Edge Function or email service
    # For now, simulate success
    await asyncio.sleep(0.5)  # Simulate network latency

    result = {
        "success": True,
        "message_id": str(uuid4()),
        "to": to,
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
    import json  # noqa: E402

    import httpx
    from temporalio import activity  # noqa: E402

    url = str(params.get("url", ""))
    method = params.get("method", "POST")
    payload = params.get("payload", {})

    # Generate idempotency key based on workflow and step
    try:
        if not hasattr(activity, "info"):
            raise RuntimeError("mocked")
        info = activity.info()
        workflow_id = info.workflow_id
        step_id = params.get("step_id", info.activity_id)
    except Exception:
        # Fallback for testing environments without temporal context
        workflow_id = "test-workflow"
        step_id = params.get("step_id", "test-step")

    idempotency_key = f"{workflow_id}:{step_id}:call_webhook"

    db = get_database_provider()

    # Check if a successful execution already exists
    try:
        existing = await db.select(
            table="idempotency_ledger",
            filters={"idempotency_key": idempotency_key},
        )
        if existing and existing[0].get("status") == "completed":
            activity.logger.info(
                f"Webhook already executed. Returning stored result. Key: {idempotency_key}"
            )
            return json.loads(existing[0].get("result_payload", "{}"))
        if existing and existing[0].get("status") == "pending":
            # Concurrent execution or failed attempt that left a pending record
            pass
    except DatabaseError as e:
        activity.logger.warning(f"Failed to check idempotency ledger: {e}")
        # Continue execution if ledger is unavailable to maintain availability

    # Insert pending record
    try:
        await db.upsert(
            table="idempotency_ledger",
            record={
                "idempotency_key": idempotency_key,
                "status": "pending",
                "workflow_id": workflow_id,
                "tool_name": "call_webhook",
            },
            conflict_columns=["idempotency_key"],
        )
    except DatabaseError as e:
        activity.logger.warning(f"Failed to insert pending idempotency record: {e}")

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
    activity.logger.info(f"Searching YouTube for: {query}")

    # Mock response
    return {
        "success": True,
        "videos": [
            {
                "title": f"Video about {query}",
                "url": "https://youtube.com/watch?v=mock123",
                "description": "A very interesting video",
            }
        ],
    }


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

        # Prepare update data
        update_data = {
            "status": status,
            "end_time": "now()",  # Use database function for current timestamp
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
