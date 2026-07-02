"""
Tool execution activities: database, email, webhook, YouTube,
user-response, and agent-run-completion tools.

Split from activities/tools.py (S6, 600-line law) — pure structural move.
Names that tests patch on the activities.tools namespace (get_database_provider,
create_safe_user_message, validate_url_with_dns_pin_async, log_audit_event, and
the whole ``activity`` module binding) resolve late through ``_ns()`` so existing
patches keep governing this code exactly as before the split.
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from temporalio import activity

from models.audit import AuditAction, AuditResourceType, AuditStatus


def _ns():
    """Late-bound activities.tools module namespace.

    Resolved through ``sys.modules`` — the same way ``unittest.mock.patch``
    resolves dotted targets — so existing test patches on activities.tools
    govern this code exactly as before the S6 split.
    """
    return sys.modules["activities.tools"]


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

    _ns().activity.logger.info(f"Searching {table} with filters: {filters}")

    error_msg = None
    result_count = 0

    try:
        # Get database provider instance
        db = _ns().get_database_provider()

        # Perform select operation
        data = await db.select(table=table, filters=filters, select_fields=select_fields)

        result_count = len(data)

        # Audit success
        await _ns().log_audit_event(
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
        _ns().activity.logger.error(f"Database search failed: {error_msg}")

        # Audit failure
        await _ns().log_audit_event(
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

    _ns().activity.logger.info(f"Creating record in {table}")

    error_msg = None
    record_id = None

    try:
        # Get database provider instance
        db = _ns().get_database_provider()

        # Perform insert operation
        created = await db.insert(table=table, record=data)

        record_id = created.get("id")

        # Audit success
        await _ns().log_audit_event(
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
        _ns().activity.logger.error(f"Record creation failed: {error_msg}")

        # Audit failure
        await _ns().log_audit_event(
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

    _ns().activity.logger.info(f"Deleting record from {table}: {record_id}")

    error_msg = None

    try:
        # Get database provider instance
        db = _ns().get_database_provider()

        # Delete record by ID filter
        deleted_count = await db.delete(table=table, filters={"id": record_id})

        # Audit success
        await _ns().log_audit_event(
            actor_id="orchestrator",
            action=AuditAction.DATA_DELETE,
            resource_type=AuditResourceType.DATABASE,
            resource_id=f"{table}:{record_id}",
            status=AuditStatus.SUCCESS,
            duration_ms=int((time.time() - start_time) * 1000),
            workflow_id=params.get("workflow_id", ""),
        )

        if deleted_count == 0:
            _ns().activity.logger.info("Record already deleted - idempotent success")
            return {"success": True, "already_deleted": True}

        return {
            "success": True,
            "deleted_id": record_id,
        }

    except Exception as e:
        error_msg = str(e)
        _ns().activity.logger.error(f"Record deletion failed: {error_msg}")

        # Audit failure (best-effort - don't block compensation)
        try:
            await _ns().log_audit_event(
                actor_id="orchestrator",
                action=AuditAction.DATA_DELETE,
                resource_type=AuditResourceType.DATABASE,
                resource_id=f"{table}:{record_id}",
                status=AuditStatus.FAILURE,
                duration_ms=int((time.time() - start_time) * 1000),
                workflow_id=params.get("workflow_id", ""),
            )
        except Exception as audit_error:
            _ns().activity.logger.warning(f"Audit logging failed: {audit_error}")

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
        info = _ns().activity.info()
        workflow_id = info.workflow_id or ""
        step_id = params.get("step_id", info.activity_id)
    except Exception:
        # Fallback for testing environments without temporal context
        workflow_id = "test-workflow"
        step_id = params.get("step_id", "test-step")

    idempotency_key = f"{workflow_id}:{step_id}:send_email"

    db = _ns().get_database_provider()

    cached = await _ns()._idempotency_guard(db, idempotency_key, "send_email", workflow_id)
    if cached is not None:
        return cached

    _ns().activity.logger.info(f"Sending email to: {to}")

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
            _ns().activity.logger.error(f"Email send via edge function failed: {e}")
            raise
    else:
        # Development/test fallback: simulate delivery
        _ns().activity.logger.warning(
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
        _ns().activity.logger.warning(f"Failed to record email success in ledger: {e}")

    return result


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
    _ns().activity.logger.info("respond_to_user: returning direct answer")
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

    _ns().activity.logger.info(f"Updating agent_run completion: {trace_id} -> {status}")

    try:
        # Get database provider instance
        db = _ns().get_database_provider()

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

        _ns().activity.logger.info(f"✓ Updated agent_run {trace_id} with status {status}")

        return {
            "success": True,
            "updated_id": trace_id,
            "status": status,
        }

    except Exception as e:
        error_msg = str(e)
        _ns().activity.logger.error(f"Failed to update agent_run completion: {error_msg}")

        # Don't raise - this is best-effort notification to UI
        return {
            "success": False,
            "error": error_msg,
            "trace_id": trace_id,
        }
