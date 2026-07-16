from unittest.mock import AsyncMock, Mock, patch

import pytest

import worker_healthcheck


@pytest.mark.asyncio
async def test_check_worker_dependencies_checks_temporal_health():
    client = AsyncMock()
    client.service_client.check_health = AsyncMock(return_value=True)
    with patch("worker_healthcheck.Client.connect", new=AsyncMock(return_value=client)) as connect:
        await worker_healthcheck.check_worker_dependencies()
    connect.assert_awaited_once()
    client.service_client.check_health.assert_awaited_once()


@pytest.mark.asyncio
async def test_check_worker_dependencies_rejects_unhealthy_temporal():
    client = AsyncMock()
    client.service_client.check_health = AsyncMock(return_value=False)
    with patch("worker_healthcheck.Client.connect", new=AsyncMock(return_value=client)):
        with pytest.raises(RuntimeError, match="reported unhealthy"):
            await worker_healthcheck.check_worker_dependencies()


def test_main_returns_failure_without_leaking_error_details(capsys):
    with (
        patch("worker_healthcheck.check_worker_dependencies", new=Mock(return_value=object())),
        patch("worker_healthcheck.asyncio.run", side_effect=ConnectionError("secret-host")),
    ):
        assert worker_healthcheck.main() == 1
    captured = capsys.readouterr()
    assert "ConnectionError" in captured.out
    assert "secret-host" not in captured.out
