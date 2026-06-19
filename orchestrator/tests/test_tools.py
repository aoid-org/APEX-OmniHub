from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from temporalio.exceptions import ApplicationError

from activities.tools import (
    call_webhook,
    create_record,
    delete_record,
    mint_pilot_session,
    search_database,
    search_youtube,
    send_email,
    update_agent_run_completion,
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
    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.select.return_value = []
        mock_provider.return_value = db

        result = await send_email(params)
        assert result["success"] is True
        assert "message_id" in result
        assert result["to"] == "test@example.com"


@pytest.mark.asyncio
async def test_call_webhook_success():
    params = {"url": "https://api.example.com", "method": "GET"}

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.select.return_value = []
        mock_provider.return_value = db

        with patch(
            "activities.tools.validate_url_with_dns_pin_async", new_callable=AsyncMock
        ) as mock_validate:
            validated = MagicMock()
            validated.original_url = "https://api.example.com"
            validated.resolved_ip = "192.0.2.1"
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
    params = {"url": "http://169.254.169.254"}  # NOSONAR

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        db.select.return_value = []
        mock_provider.return_value = db

        with patch(
            "activities.tools.validate_url_with_dns_pin_async", new_callable=AsyncMock
        ) as mock_validate:
            mock_validate.side_effect = ValueError("Blocked internal IP")

            result = await call_webhook(params)
            assert result["success"] is False
            assert "Security violation" in result["error"]


@pytest.mark.asyncio
async def test_search_youtube_no_api_key(monkeypatch):
    monkeypatch.delenv("YOUTUBE_API_KEY", raising=False)
    result = await search_youtube({"query": "cats"})
    assert result["success"] is False
    assert "YOUTUBE_API_KEY" in result["error"]
    assert result["videos"] == []


@pytest.mark.asyncio
async def test_search_youtube_success(monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "test-key")
    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {
        "items": [
            {
                "id": {"videoId": "abc123"},
                "snippet": {
                    "title": "Funny cats compilation",
                    "description": "Very cute cats",
                    "channelTitle": "CatsChannel",
                    "publishedAt": "2024-01-01T00:00:00Z",
                },
            }
        ]
    }
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=fake_response)
    with patch("httpx.AsyncClient", return_value=mock_client):
        result = await search_youtube({"query": "cats"})
    assert result["success"] is True
    assert len(result["videos"]) == 1
    assert result["videos"][0]["title"] == "Funny cats compilation"
    assert "abc123" in result["videos"][0]["url"]


@pytest.mark.asyncio
async def test_update_agent_run_completion():
    params = {"trace_id": "trace-1", "status": "completed", "agent_response": {"msg": "done"}}

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        mock_provider.return_value = db

        result = await update_agent_run_completion(params)
        assert result["success"] is True
        db.update.assert_called_once()
        _, kwargs = db.update.call_args
        assert kwargs["table"] == "agent_runs"
        assert kwargs["updates"]["status"] == "completed"


@pytest.mark.asyncio
async def test_update_agent_run_completion_uses_iso_end_time():
    """end_time must be a real ISO-8601 UTC timestamp, not the literal string 'now()'."""
    from datetime import datetime

    params = {"trace_id": "trace-iso", "status": "completed", "agent_response": {"result": "ok"}}

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        mock_provider.return_value = db

        await update_agent_run_completion(params)

        _, kwargs = db.update.call_args
        end_time = kwargs["updates"]["end_time"]

        assert end_time != "now()", "end_time must not be the literal string 'now()'"
        # Must be parseable as ISO-8601
        parsed = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
        assert parsed is not None
        # Must be timezone-aware (UTC)
        assert parsed.tzinfo is not None


@pytest.mark.asyncio
async def test_update_agent_run_completion_sets_agent_response_for_completed():
    """Completed status must write agent_response, not error_message."""
    params = {
        "trace_id": "trace-2",
        "status": "completed",
        "agent_response": {"status": "success", "goal": "hello"},
    }

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        mock_provider.return_value = db

        result = await update_agent_run_completion(params)
        assert result["success"] is True

        _, kwargs = db.update.call_args
        assert "agent_response" in kwargs["updates"]
        assert "error_message" not in kwargs["updates"]


@pytest.mark.asyncio
async def test_update_agent_run_completion_sets_error_message_for_failed():
    """Failed status must write error_message, not agent_response."""
    params = {
        "trace_id": "trace-3",
        "status": "failed",
        "agent_response": {"error": "Something broke", "status": "failed"},
    }

    with patch("activities.tools.get_database_provider") as mock_provider:
        db = AsyncMock()
        mock_provider.return_value = db

        result = await update_agent_run_completion(params)
        assert result["success"] is True

        _, kwargs = db.update.call_args
        assert "error_message" in kwargs["updates"]
        assert "agent_response" not in kwargs["updates"]


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
