import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from temporalio import activity
from temporalio.exceptions import ApplicationError

from activities.tools import (
    search_database,
    create_record,
    delete_record,
    send_email,
    call_webhook,
    search_youtube,
    update_agent_run_completion,
    mint_pilot_session,
    check_semantic_cache,
    setup_activities,
    _semantic_cache,
)


@pytest.fixture(autouse=True)
def mock_logger():
    with patch("activities.tools.activity.logger", MagicMock()):
        yield


@pytest.mark.asyncio
async def test_search_database_success():
    params = {"table": "users", "filters": {"id": "123"}, "select": "name"}

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.select.return_value = [{"name": "test"}]
        mock_provider.return_value = db

        with patch("activities.tools.log_audit_event", new_callable=AsyncMock) as mock_audit:
            result = await search_database(params)

            assert result["success"] is True
            assert result["data"] == [{"name": "test"}]
            assert result["count"] == 1
            mock_audit.assert_called_once()


@pytest.mark.asyncio
async def test_search_database_failure():
    params = {"table": "users"}

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.select.side_effect = Exception("DB connection failed")
        mock_provider.return_value = db

        with patch("activities.tools.log_audit_event", new_callable=AsyncMock):
            with pytest.raises(ApplicationError) as exc:
                await search_database(params)
            assert "DB connection failed" in str(exc.value)


@pytest.mark.asyncio
async def test_create_record_success():
    params = {"table": "users", "data": {"name": "test"}}

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.insert.return_value = {"id": "new-id", "name": "test"}
        mock_provider.return_value = db

        with patch("activities.tools.log_audit_event", new_callable=AsyncMock) as mock_audit:
            result = await create_record(params)

            assert result["success"] is True
            assert result["id"] == "new-id"
            mock_audit.assert_called_once()


@pytest.mark.asyncio
async def test_delete_record_success():
    params = {"table": "users", "id": "uuid-123"}

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.delete.return_value = 1
        mock_provider.return_value = db

        with patch("activities.tools.log_audit_event", new_callable=AsyncMock):
            result = await delete_record(params)
            assert result["success"] is True
            assert result["deleted_id"] == "uuid-123"


@pytest.mark.asyncio
async def test_delete_record_already_deleted():
    params = {"table": "users", "id": "uuid-123"}

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.delete.return_value = 0
        mock_provider.return_value = db

        with patch("activities.tools.log_audit_event", new_callable=AsyncMock):
            result = await delete_record(params)
            assert result["success"] is True
            assert result.get("already_deleted") is True


@pytest.mark.asyncio
async def test_send_email():
    params = {"to": "test@example.com"}
    result = await send_email(params)
    assert result["success"] is True
    assert "message_id" in result
    assert result["to"] == "test@example.com"


@pytest.mark.asyncio
async def test_call_webhook_success():
    params = {"url": "https://api.example.com", "method": "GET"}

    with patch(
        "activities.tools.validate_url_with_dns_pin_async", new_callable=AsyncMock
    ) as mock_validate:
        validated = MagicMock()
        validated.original_url = "https://api.example.com"
        validated.resolved_ip = "1.2.3.4"
        validated.host_header = "api.example.com"
        mock_validate.return_value = validated

        with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_request:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.text = '{"data": "ok"}'
            mock_request.return_value = mock_response

            result = await call_webhook(params)
            assert result["success"] is True
            assert result["status_code"] == 200


@pytest.mark.asyncio
async def test_call_webhook_ssrf_blocked():
    params = {"url": "http://169.254.169.254"}

    with patch(
        "activities.tools.validate_url_with_dns_pin_async", new_callable=AsyncMock
    ) as mock_validate:
        mock_validate.side_effect = ValueError("Blocked internal IP")

        result = await call_webhook(params)
        assert result["success"] is False
        assert "Security violation" in result["error"]


@pytest.mark.asyncio
async def test_search_youtube():
    result = await search_youtube({"query": "cats"})
    assert result["success"] is True
    assert len(result["videos"]) == 1
    assert "cats" in result["videos"][0]["title"]


@pytest.mark.asyncio
async def test_update_agent_run_completion():
    params = {"trace_id": "trace-1", "status": "completed", "agent_response": {"msg": "done"}}

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        mock_provider.return_value = db

        result = await update_agent_run_completion(params)
        assert result["success"] is True
        db.update.assert_called_once()
        args, kwargs = db.update.call_args
        assert kwargs["table"] == "agent_runs"
        assert kwargs["updates"]["status"] == "completed"


@pytest.mark.asyncio
async def test_mint_pilot_session_success():
    params = {
        "user_id": "user-1",
        "tenant_id": "tenant-1",
        "connection_id": "conn-1",
        "trace_id": "trace-1",
    }

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.select.return_value = [{"connection_id": "conn-1"}]
        db.insert.return_value = {"pilot_session_id": "sess-1", "expires_at": "later"}
        mock_provider.return_value = db

        result = await mint_pilot_session(params)
        assert result["success"] is True
        assert result["pilot_session_id"] == "sess-1"


@pytest.mark.asyncio
async def test_mint_pilot_session_missing_params():
    result = await mint_pilot_session({"user_id": "user-1"})
    assert result["success"] is False
    assert "Missing" in result["error"]
