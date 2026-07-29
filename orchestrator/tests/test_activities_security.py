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
    keys_to_delete = [k for k in sys.modules if k.startswith("activities")]
    for key in keys_to_delete:
        del sys.modules[key]

    with patch.dict(sys.modules, modules):
        yield

    # Restore the original module references to prevent downstream test pollution
    keys_to_delete = [k for k in sys.modules if k.startswith("activities")]
    for key in keys_to_delete:
        del sys.modules[key]
    sys.modules.update(saved_modules)


@pytest.mark.asyncio
@pytest.mark.usefixtures("mock_dependencies")
async def test_call_webhook_ssrf_blocked():
    """Test that call_webhook blocks SSRF attempts."""

    from activities.tools import call_webhook

    with patch("activities.tools.get_database_provider") as mock_provider:
        from unittest.mock import AsyncMock

        db = AsyncMock()
        db.select.return_value = []
        mock_provider.return_value = db

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

    with patch("activities.tools.get_database_provider") as mock_provider:
        from unittest.mock import AsyncMock

        db = AsyncMock()
        db.select.return_value = []
        mock_provider.return_value = db

        with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = MagicMock(status_code=200, text="OK")

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
                mock_request.assert_called_once()
                request_kwargs = mock_request.call_args.kwargs
                assert request_kwargs["url"] == "https://resolved-target.example/webhook"
                assert request_kwargs["headers"] == {"Host": "example.com"}


@pytest.mark.asyncio
@pytest.mark.usefixtures("mock_dependencies")
async def test_call_webhook_redirects_not_followed():
    """Test that call_webhook does not follow redirects."""

    from activities.tools import call_webhook

    with patch("activities.tools.get_database_provider") as mock_provider:
        from unittest.mock import AsyncMock

        db = AsyncMock()
        db.select.return_value = []
        mock_provider.return_value = db

        with patch("httpx.AsyncClient.request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = MagicMock(
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
                result = await call_webhook({
                    "url": "https://example.com/redirect",
                    "method": "GET",
                })

                assert result["success"] is True
                assert result["status_code"] == 302
                mock_request.assert_called_once()


@pytest.mark.asyncio
async def test_evaluate_policy_activity_delegates_to_evaluate_policy():
    """Line 17 in activities/omni_policy.py: verify evaluate_policy_activity calls evaluate_policy."""
    from unittest.mock import AsyncMock

    with patch("activities.omni_policy.evaluate_policy", new_callable=AsyncMock) as mock_eval:
        mock_eval.return_value = {"allowed": True, "lane": "GREEN"}

        from activities.omni_policy import evaluate_policy_activity

        ctx = {"tool": "search_database", "actor": "user-123"}
        result = await evaluate_policy_activity(ctx)

        mock_eval.assert_called_once_with(ctx)
        assert result == {"allowed": True, "lane": "GREEN"}
