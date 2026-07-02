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

# Patch surface (S6 split): tests patch these names on activities.tools
# (e.g. activities.tools.asyncio.sleep, activities.tools.instructor.from_litellm,
# activities.tools.create_safe_user_message). The implementations moved to
# sibling modules, which read them back through this namespace at call time,
# so the bindings must stay here. Redundant aliases mark them as re-exports.
import asyncio as asyncio
import json
import os
from typing import Any

import instructor as instructor
from temporalio import activity

import metrics

# S6 structural split (600-line law): plan generation and tool executors live in
# sibling modules; redundant-alias imports re-export them so every existing
# import path (tests, main.py worker registration) is unchanged. Those modules
# read this module's globals only at call time via sys.modules, so importing
# them here is cycle-safe.
from activities.plan_generation import (
    GeneratedPlan as GeneratedPlan,
)
from activities.plan_generation import (
    PlanStep as PlanStep,
)
from activities.plan_generation import (
    generate_plan_with_llm as generate_plan_with_llm,
)
from activities.tool_executors import (
    create_record as create_record,
)
from activities.tool_executors import (
    delete_record as delete_record,
)
from activities.tool_executors import (
    respond_to_user as respond_to_user,
)
from activities.tool_executors import (
    search_database as search_database,
)
from activities.tool_executors import (
    send_email as send_email,
)
from activities.tool_executors import (
    update_agent_run_completion as update_agent_run_completion,
)
from activities.tool_network import (
    call_webhook as call_webhook,
)
from activities.tool_network import (
    search_youtube as search_youtube,
)
from activities.tool_registry import (
    TOOL_REGISTRY as TOOL_REGISTRY,
)
from activities.tool_registry import (
    resolve_tool_name as resolve_tool_name,
)
from models.audit import log_audit_event as log_audit_event
from providers.database.base import DatabaseError
from providers.database.factory import get_database_provider
from security.prompt_sanitizer import (
    create_safe_user_message as create_safe_user_message,
)
from security.ssrf import (
    validate_url_with_dns_pin_async as validate_url_with_dns_pin_async,
)

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


# S6 structural split (600-line law): plan generation and the tool executors
# live in sibling modules. Re-exported here so every existing import path
# (tests, main.py worker registration) is unchanged.

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
