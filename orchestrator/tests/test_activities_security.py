"""Tests for activity security."""

import sys
from unittest.mock import MagicMock, patch

import pytest

from security.ssrf import ValidatedURL


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

    # Snapshot ALL activities.* modules so we can restore them after the test
    saved_modules = {k: v for k, v in sys.modules.items() if k.startswith("activities")}

    # Remove activities.tools so it gets freshly imported under our mocked deps
    for key in list(sys.modules):
        if key.startswith("activities"):
            del sys.modules[key]

    with patch.dict(sys.modules, modules):
        yield

    # Restore the original module references to prevent downstream test pollution
    for key in list(sys.modules):
        if key.startswith("activities"):
            del sys.modules[key]
    sys.modules.update(saved_modules)


@pytest.mark.asyncio
@pytest.mark.usefixtures("mock_dependencies")
async def test_call_webhook_ssrf_blocked():
    """Test that call_webhook blocks SSRF attempts."""

    from activities.tools import call_webhook

    # We patch httpx.AsyncClient to ensure it's NOT called.
    with patch("httpx.AsyncClient") as mock_client_cls:
        params = {
            "url": "http://127.0.0.1/sensitive",  # NOSONAR
            "method": "GET",
        }

        result = await call_webhook(params)

        assert result["success"] is False
        assert result["status_code"] == 403
        assert "Security violation" in result["error"]

        # Verify httpx was NOT called
        mock_client_cls.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.usefixtures("mock_dependencies")
async def test_call_webhook_valid_url():
    """Test that call_webhook allows valid URLs."""

    from activities.tools import call_webhook

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__aenter__.return_value
        mock_client.request.return_value = MagicMock(status_code=200, text="OK")

        with patch("activities.tools.validate_url_with_dns_pin_async") as mock_validate:
            mock_validate.return_value = ValidatedURL(
                original_url="https://example.com/webhook",
                resolved_ip="resolved-target.example",
                host_header="example.com",
            )

            params = {
                "url": "https://example.com/webhook",
                "method": "POST",
            }

            result = await call_webhook(params)

            assert result["success"] is True
            assert result["status_code"] == 200

            # Verify httpx WAS called
            mock_client.request.assert_called_once()
            mock_client_cls.assert_called_once_with(follow_redirects=False)

            request_kwargs = mock_client.request.call_args.kwargs
            assert request_kwargs["url"] == "https://resolved-target.example/webhook"
            assert request_kwargs["headers"] == {"Host": "example.com"}


@pytest.mark.asyncio
@pytest.mark.usefixtures("mock_dependencies")
async def test_call_webhook_redirects_not_followed():
    """Test that call_webhook does not follow redirects."""

    from activities.tools import call_webhook

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__aenter__.return_value
        mock_client.request.return_value = MagicMock(
            status_code=302,
            text="redirect",
            headers={"Location": "http://127.0.0.1/internal"},  # NOSONAR
        )

        with patch("activities.tools.validate_url_with_dns_pin_async") as mock_validate:
            mock_validate.return_value = ValidatedURL(
                original_url="https://example.com/redirect",
                resolved_ip="resolved-target.example",
                host_header="example.com",
            )
            result = await call_webhook(
                {
                    "url": "https://example.com/redirect",
                    "method": "GET",
                }
            )

            assert result["success"] is True
            assert result["status_code"] == 302
            mock_client_cls.assert_called_once_with(follow_redirects=False)
            mock_client.request.assert_called_once()
