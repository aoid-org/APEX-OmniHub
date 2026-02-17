"""Tests for activity security."""

import sys
from unittest.mock import MagicMock, patch

import pytest

@pytest.fixture
def mock_dependencies():
    """Mock heavy dependencies using patch.dict to avoid global pollution."""
    mock_redis = MagicMock()

    modules = {
        "redis": mock_redis,
        "redis.asyncio": MagicMock(),
        "redis.commands": MagicMock(),
        "redis.commands.search": MagicMock(),
        "redis.commands.search.field": MagicMock(),
        "redis.commands.search.query": MagicMock(),
        "redis.commands.search.index": MagicMock(),
        "sentence_transformers": MagicMock(),
        "instructor": MagicMock(),
        "litellm": MagicMock(),
        "supabase": MagicMock(),
        "numpy": MagicMock(),
    }

    # Ensure activities.tools is re-imported with mocks
    if "activities.tools" in sys.modules:
        del sys.modules["activities.tools"]

    with patch.dict(sys.modules, modules):
        yield

    # Cleanup: remove activities.tools so subsequent tests re-import it with real deps
    if "activities.tools" in sys.modules:
        del sys.modules["activities.tools"]

@pytest.mark.asyncio
async def test_call_webhook_ssrf_blocked(mock_dependencies):
    """Test that call_webhook blocks SSRF attempts."""

    from activities.tools import call_webhook

    # We patch httpx.AsyncClient to ensure it's NOT called.
    with patch("httpx.AsyncClient") as mock_client_cls:
        params = {
            "url": "http://127.0.0.1/sensitive",  # NOSONAR: Test URL
            "method": "GET"
        }

        result = await call_webhook(params)

        assert result["success"] is False
        assert result["status_code"] == 403
        assert "Security violation" in result["error"]

        # Verify httpx was NOT called
        mock_client_cls.assert_not_called()

@pytest.mark.asyncio
async def test_call_webhook_valid_url(mock_dependencies):
    """Test that call_webhook allows valid URLs."""

    from activities.tools import call_webhook

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__aenter__.return_value
        mock_client.request.return_value = MagicMock(status_code=200, text="OK")

        # Mock DNS resolution
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.return_value = [
                (2, 1, 6, "", ("93.184.216.34", 80))
            ]

            params = {
                "url": "http://example.com/webhook",  # NOSONAR: Test URL
                "method": "POST"
            }

            result = await call_webhook(params)

            assert result["success"] is True
            assert result["status_code"] == 200

            # Verify httpx WAS called
            mock_client.request.assert_called_once()
