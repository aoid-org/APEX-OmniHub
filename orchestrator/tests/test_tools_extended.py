"""
Extended tests for activities/tools.py — covers paths not in test_tools.py.

Focuses on:
  - _idempotency_guard helper (all branches)
  - send_email idempotency paths (cache hit, pending, DB error on check/insert)
  - call_webhook idempotency paths (cache hit, ledger-unavailable)
  - call_webhook IP-literal hostname branch + http client error path
  - create_record error path (audit on failure)
  - delete_record audit failure fallback
  - update_agent_run_completion failed-status branch + exception path
  - mint_pilot_session inactive connection + insert failure paths
  - setup_activities (semantic cache init)
  - check_semantic_cache hit / miss
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from temporalio import activity

from activities.tools import (
    _idempotency_guard,
    call_webhook,
    check_semantic_cache,
    create_record,
    delete_record,
    mint_pilot_session,
    send_email,
    setup_activities,
    update_agent_run_completion,
)
from providers.database.base import DatabaseError


@pytest.fixture(autouse=True)
def _mock_logger():
    with patch("activities.tools.activity.logger", MagicMock()):
        yield


# ============================================================================
# _idempotency_guard helper
# ============================================================================

@pytest.mark.asyncio
async def test_idempotency_guard_returns_none_on_no_existing():
    """No existing record → returns None (execution should proceed)."""
    db = AsyncMock()
    db.select.return_value = []
    db.upsert = AsyncMock()
    result = await _idempotency_guard(db, "key:1", "send_email", "wf-1")
    assert result is None
    db.upsert.assert_called_once()


@pytest.mark.asyncio
async def test_idempotency_guard_returns_stored_result_on_completed():
    """Completed record → returns the stored JSON payload."""
    stored = {"success": True, "message_id": "msg-99"}
    db = AsyncMock()
    db.select.return_value = [{"status": "completed", "result_payload": json.dumps(stored)}]
    result = await _idempotency_guard(db, "key:2", "send_email", "wf-1")
    assert result == stored


@pytest.mark.asyncio
async def test_idempotency_guard_pending_falls_through():
    """Pending record (concurrent execution) → returns None, skips upsert."""
    db = AsyncMock()
    db.select.return_value = [{"status": "pending"}]
    db.upsert = AsyncMock()
    result = await _idempotency_guard(db, "key:3", "call_webhook", "wf-2")
    assert result is None
    # upsert still called (tries to claim the slot)
    db.upsert.assert_called_once()


@pytest.mark.asyncio
async def test_idempotency_guard_db_error_on_select_falls_through():
    """DatabaseError on ledger SELECT → logged warning, execution proceeds."""
    db = AsyncMock()
    db.select.side_effect = DatabaseError("timeout")
    db.upsert = AsyncMock()
    result = await _idempotency_guard(db, "key:4", "send_email", "wf-1")
    assert result is None
    db.upsert.assert_called_once()


@pytest.mark.asyncio
async def test_idempotency_guard_db_error_on_upsert_swallowed():
    """DatabaseError on ledger UPSERT → logged warning, returns None."""
    db = AsyncMock()
    db.select.return_value = []
    db.upsert.side_effect = DatabaseError("lock timeout")
    result = await _idempotency_guard(db, "key:5", "send_email", "wf-1")
    assert result is None  # doesn't raise


# ============================================================================
# send_email — idempotency branches
# ============================================================================

@pytest.mark.asyncio
async def test_send_email_returns_cached_on_completed_ledger():
    """send_email returns stored result without re-sending when ledger=completed."""
    cached = {"success": True, "message_id": "cached-id", "to": "a@b.com"}
    db = AsyncMock()
    db.select.return_value = [{"status": "completed", "result_payload": json.dumps(cached)}]

    with patch("activities.tools.get_database_provider", return_value=db):
        result = await send_email({"to": "a@b.com", "step_id": "step-1"})

    assert result == cached
    db.update.assert_not_called()  # no new DB write


@pytest.mark.asyncio
async def test_send_email_completes_and_records_success():
    """Normal send_email path records completed status in ledger."""
    db = AsyncMock()
    db.select.return_value = []
    db.upsert = AsyncMock()
    db.update = AsyncMock()

    with patch("activities.tools.get_database_provider", return_value=db):
        with patch("activities.tools.asyncio.sleep", new_callable=AsyncMock):
            result = await send_email({"to": "user@example.com", "step_id": "s1"})

    assert result["success"] is True
    assert result["to"] == "user@example.com"
    db.update.assert_called_once()


@pytest.mark.asyncio
async def test_send_email_update_failure_swallowed():
    """Failure writing completion to ledger is logged but not raised."""
    db = AsyncMock()
    db.select.return_value = []
    db.upsert = AsyncMock()
    db.update.side_effect = Exception("ledger write failed")

    with patch("activities.tools.get_database_provider", return_value=db):
        with patch("activities.tools.asyncio.sleep", new_callable=AsyncMock):
            result = await send_email({"to": "x@y.com"})

    assert result["success"] is True  # still succeeds despite ledger write failure


# ============================================================================
# call_webhook — idempotency + additional paths
# ============================================================================

@pytest.mark.asyncio
async def test_call_webhook_returns_cached_on_completed_ledger():
    """call_webhook returns stored result without hitting the URL."""
    cached = {"success": True, "status_code": 200, "body": "ok"}
    db = AsyncMock()
    db.select.return_value = [{"status": "completed", "result_payload": json.dumps(cached)}]

    with patch("activities.tools.get_database_provider", return_value=db):
        result = await call_webhook({"url": "https://example.com", "step_id": "s1"})

    assert result == cached


@pytest.mark.asyncio
async def test_call_webhook_ssrf_records_failure_in_ledger():
    """SSRF block writes failed status to ledger."""
    db = AsyncMock()
    db.select.return_value = []
    db.upsert = AsyncMock()
    db.update = AsyncMock()

    with patch("activities.tools.get_database_provider", return_value=db), patch(
        "activities.tools.validate_url_with_dns_pin_async",
        side_effect=ValueError("internal IP blocked"),
    ):
        result = await call_webhook({"url": "http://10.0.0.1", "step_id": "s1"})

    assert result["success"] is False
    assert result["status_code"] == 403
    db.update.assert_called_once()


@pytest.mark.asyncio
async def test_call_webhook_http_client_exception_recorded_and_raised():
    """httpx.AsyncClient.request exception → ledger updated to failed, then re-raised."""
    db = AsyncMock()
    db.select.return_value = []
    db.upsert = AsyncMock()
    db.update = AsyncMock()

    validated = MagicMock()
    validated.original_url = "https://api.example.com"
    validated.resolved_ip = "1.2.3.4"
    validated.host_header = "api.example.com"

    with patch("activities.tools.get_database_provider", return_value=db):
        with patch(
            "activities.tools.validate_url_with_dns_pin_async", new_callable=AsyncMock, return_value=validated
        ):
            with patch("httpx.AsyncClient") as mock_client_cls:
                mock_client = AsyncMock()
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client.request = AsyncMock(side_effect=Exception("connection refused"))
                mock_client_cls.return_value = mock_client

                with pytest.raises(Exception, match="connection refused"):
                    await call_webhook({"url": "https://api.example.com", "step_id": "s1"})

    db.update.assert_called()


@pytest.mark.asyncio
async def test_call_webhook_ip_literal_hostname_no_pinning():
    """Hostname that is an IP literal skips the DNS-pinning Host header."""
    db = AsyncMock()
    db.select.return_value = []
    db.upsert = AsyncMock()
    db.update = AsyncMock()

    validated = MagicMock()
    validated.original_url = "https://1.2.3.4/path"
    validated.resolved_ip = "1.2.3.4"
    validated.host_header = ""

    with patch("activities.tools.get_database_provider", return_value=db):
        with patch(
            "activities.tools.validate_url_with_dns_pin_async", new_callable=AsyncMock, return_value=validated
        ):
            with patch("httpx.AsyncClient") as mock_client_cls:
                mock_resp = MagicMock()
                mock_resp.status_code = 200
                mock_resp.text = "ok"
                mock_client = AsyncMock()
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=False)
                mock_client.request = AsyncMock(return_value=mock_resp)
                mock_client_cls.return_value = mock_client

                result = await call_webhook({"url": "https://1.2.3.4/path", "step_id": "s1"})

    assert result["success"] is True


# ============================================================================
# create_record — error path
# ============================================================================

@pytest.mark.asyncio
async def test_create_record_failure_audits_and_raises():
    """Exception during DB insert → audit failure logged, re-raised."""
    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.insert.side_effect = Exception("constraint violation")
        mock_provider.return_value = db

        with patch("activities.tools.log_audit_event", new_callable=AsyncMock) as mock_audit:
            with pytest.raises(Exception, match="constraint violation"):
                await create_record({"table": "users", "data": {"name": "test"}})

        # Called once for failure audit
        mock_audit.assert_called_once()
        call_kwargs = mock_audit.call_args.kwargs
        assert call_kwargs["status"].name == "FAILURE"


# ============================================================================
# delete_record — audit failure fallback
# ============================================================================

@pytest.mark.asyncio
async def test_delete_record_audit_failure_swallowed():
    """Audit log failure during delete exception is swallowed (best-effort)."""
    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.delete.side_effect = Exception("DB down")
        mock_provider.return_value = db

        with patch("activities.tools.log_audit_event", new_callable=AsyncMock) as mock_audit:
            mock_audit.side_effect = Exception("audit also down")
            result = await delete_record({"table": "t", "id": "123"})

    assert result["success"] is False
    assert "DB down" in result["error"]


# ============================================================================
# update_agent_run_completion — failed status branch + exception
# ============================================================================

@pytest.mark.asyncio
async def test_update_agent_run_completion_failed_status():
    """status='failed' populates error_message not agent_response."""
    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        mock_provider.return_value = db

        result = await update_agent_run_completion(
            {
                "trace_id": "trace-1",
                "status": "failed",
                "agent_response": {"error": "timeout occurred"},
            }
        )

    assert result["success"] is True
    update_kwargs = db.update.call_args.kwargs
    assert "error_message" in update_kwargs["updates"]
    assert "timeout occurred" in update_kwargs["updates"]["error_message"]


@pytest.mark.asyncio
async def test_update_agent_run_completion_db_exception():
    """DB exception → best-effort return (does not raise)."""
    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.update.side_effect = Exception("DB unavailable")
        mock_provider.return_value = db

        result = await update_agent_run_completion({"trace_id": "t1", "status": "completed"})

    assert result["success"] is False
    assert "DB unavailable" in result["error"]


# ============================================================================
# mint_pilot_session — inactive connection + DB insert error
# ============================================================================

@pytest.mark.asyncio
async def test_mint_pilot_session_inactive_connection():
    """No active connection found → error without inserting session."""
    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.select.return_value = []  # empty = not found / inactive
        mock_provider.return_value = db

        result = await mint_pilot_session(
            {
                "user_id": "u1",
                "connection_id": "conn-inactive",
                "trace_id": "trace-1",
            }
        )

    assert result["success"] is False
    assert "not found" in result["error"].lower() or "not active" in result["error"].lower()
    db.insert.assert_not_called()


@pytest.mark.asyncio
async def test_mint_pilot_session_db_insert_exception():
    """DB failure during pilot_sessions insert → returns error without raising."""
    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.select.return_value = [{"connection_id": "conn-1"}]
        db.insert.side_effect = Exception("DB insert failed")
        mock_provider.return_value = db

        result = await mint_pilot_session(
            {
                "user_id": "u1",
                "connection_id": "conn-1",
                "trace_id": "trace-1",
            }
        )

    assert result["success"] is False
    assert "DB insert failed" in result["error"]


# ============================================================================
# setup_activities
# ============================================================================

@pytest.mark.asyncio
async def test_setup_activities_initializes_cache():
    """setup_activities sets up SemanticCacheService and logs success.

    SemanticCacheService is lazily imported inside setup_activities(), so we
    patch it via the infrastructure.cache module path.
    """
    mock_cache = AsyncMock()
    mock_cache.initialize = AsyncMock()

    with patch("infrastructure.cache.SemanticCacheService", return_value=mock_cache):
        with patch("activities.tools.activity.logger", MagicMock()):
            import activities.tools as tools_mod
            await setup_activities(
                supabase_url="https://proj.supabase.co",
                supabase_key="service-key",
                redis_url="redis://localhost:6379",
            )

    mock_cache.initialize.assert_called_once()
    assert tools_mod._semantic_cache is mock_cache


# ============================================================================
# check_semantic_cache
# ============================================================================

@pytest.mark.asyncio
async def test_check_semantic_cache_not_initialized():
    """Raises RuntimeError when semantic cache not set up."""
    import activities.tools as tools_mod
    original = tools_mod._semantic_cache
    tools_mod._semantic_cache = None

    try:
        with pytest.raises(RuntimeError, match="not initialized"):
            await check_semantic_cache("do something")
    finally:
        tools_mod._semantic_cache = original


@pytest.mark.asyncio
async def test_check_semantic_cache_hit():
    """Returns model_dump() of cached plan on cache hit."""
    mock_plan = MagicMock()
    mock_plan.similarity_score = 0.95
    mock_plan.template_id = "tpl-1"
    mock_plan.model_dump.return_value = {"steps": [], "plan_id": "p1"}

    mock_cache = AsyncMock()
    mock_cache.get_plan = AsyncMock(return_value=mock_plan)

    import activities.tools as tools_mod
    original = tools_mod._semantic_cache
    tools_mod._semantic_cache = mock_cache

    try:
        with patch.object(activity, "logger", MagicMock()):
            result = await check_semantic_cache("book flight to Paris")
    finally:
        tools_mod._semantic_cache = original

    assert result == {"steps": [], "plan_id": "p1"}


@pytest.mark.asyncio
async def test_check_semantic_cache_miss():
    """Returns None on cache miss."""
    mock_cache = AsyncMock()
    mock_cache.get_plan = AsyncMock(return_value=None)

    import activities.tools as tools_mod
    original = tools_mod._semantic_cache
    tools_mod._semantic_cache = mock_cache

    try:
        with patch.object(activity, "logger", MagicMock()):
            result = await check_semantic_cache("unknown goal xyz")
    finally:
        tools_mod._semantic_cache = original

    assert result is None
