"""Tests for activities/tools.py."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestSearchDatabase:
    @pytest.mark.asyncio
    async def test_success(self) -> None:
        from activities.tools import search_database

        mock_db = AsyncMock()
        mock_db.select.return_value = [{"id": "1"}]
        with patch("activities.tools.get_database_provider", return_value=mock_db):
            result = await search_database({"table": "users"})
        assert result["success"] is True
        assert len(result["records"]) == 1

    @pytest.mark.asyncio
    async def test_missing_table(self) -> None:
        from temporalio.exceptions import ApplicationError

        from activities.tools import search_database

        with pytest.raises(ApplicationError):
            await search_database({})


class TestCreateRecord:
    @pytest.mark.asyncio
    async def test_success(self) -> None:
        from activities.tools import create_record

        mock_db = AsyncMock()
        mock_db.insert.return_value = {"id": "new-1"}
        with patch("activities.tools.get_database_provider", return_value=mock_db):
            result = await create_record({"table": "users", "record": {"name": "x"}})
        assert result["success"] is True


class TestSendEmail:
    @pytest.mark.asyncio
    async def test_returns_sent(self) -> None:
        from activities.tools import send_email

        result = await send_email({"to": "a@b.com", "subject": "hi", "body": "yo"})
        assert result["status"] == "sent"


class TestSearchYoutube:
    @pytest.mark.asyncio
    async def test_returns_results(self) -> None:
        from activities.tools import search_youtube

        result = await search_youtube({"query": "APEX demo"})
        assert "results" in result


class TestCallWebhook:
    @pytest.mark.asyncio
    async def test_success(self) -> None:
        from activities.tools import call_webhook

        mock_resp = MagicMock(status_code=200, text="ok")
        with (
            patch("activities.tools.validate_url") as mock_val,
            patch("activities.tools.httpx.AsyncClient") as mock_httpx,
        ):
            mock_val.return_value = True
            ctx = MagicMock()
            ctx.__aenter__ = AsyncMock(return_value=ctx)
            ctx.__aexit__ = AsyncMock(return_value=False)
            ctx.request = AsyncMock(return_value=mock_resp)
            mock_httpx.return_value = ctx

            result = await call_webhook(
                {
                    "url": "https://example.com/hook",
                    "method": "POST",
                    "body": "{}",
                }
            )
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_ssrf_blocked(self) -> None:
        from activities.tools import call_webhook

        with patch("activities.tools.validate_url", return_value=False):
            result = await call_webhook(
                {
                    "url": "http://169.254.169.254/metadata",
                    "method": "GET",
                }
            )
        assert result["success"] is False


class TestMintPilotSession:
    @pytest.mark.asyncio
    async def test_missing_params(self) -> None:
        from temporalio.exceptions import ApplicationError

        from activities.tools import mint_pilot_session

        with pytest.raises(ApplicationError):
            await mint_pilot_session({})
