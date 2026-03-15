import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from temporalio import activity
from temporalio.exceptions import ApplicationError

from activities.iron_law_verify import verify_deductive_path


class MockProcess:
    def __init__(self, stdout_data=b"", stderr_data=b"", returncode=0, sleep_delay=0):
        self._stdout_data = stdout_data
        self._stderr_data = stderr_data
        self.returncode = returncode
        self.sleep_delay = sleep_delay

    async def communicate(self):
        if self.sleep_delay > 0:
            await asyncio.sleep(self.sleep_delay)
        return self._stdout_data, self._stderr_data

    def kill(self):
        pass

    async def wait(self):
        pass


@pytest.mark.asyncio
async def test_iron_law_verify_success():
    params = {
        "intent": "open_door",
        "target_state": {"door": "open"},
        "device_id": "door-123",
        "workflow_id": "wf-123",
    }

    expected_result = {
        "verified": True,
        "logicDelta": 0.1,
        "escalateToMan": False,
        "reason": "Deductive path verified",
    }

    mock_process = MockProcess(stdout_data=json.dumps(expected_result).encode(), returncode=0)

    with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = mock_process
        # Mock temporal logger to avoid context errors without an active context
        with patch.object(activity, "logger", MagicMock()):
            result = await verify_deductive_path(params)
            assert result["verified"] is True
            assert result["logicDelta"] == 0.1


@pytest.mark.asyncio
async def test_iron_law_verify_timeout():
    params = {"intent": "test"}
    # Simulate the TimeoutError directly instead of sleeping past the 10.0s timeout.

    with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
        mock_process = MagicMock()
        mock_process.communicate = AsyncMock(side_effect=TimeoutError("timeout"))
        mock_process.wait = AsyncMock()
        mock_exec.return_value = mock_process

        with patch.object(activity, "logger", MagicMock()):
            with pytest.raises(ApplicationError) as exc_info:
                await verify_deductive_path(params)
            assert "timeout" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_iron_law_verify_subprocess_error():
    params = {"intent": "test"}
    mock_process = MockProcess(stderr_data=b"SyntaxError", returncode=1)

    with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = mock_process

        with patch.object(activity, "logger", MagicMock()):
            with pytest.raises(ApplicationError) as exc_info:
                await verify_deductive_path(params)
            assert "SyntaxError" in str(exc_info.value)


@pytest.mark.asyncio
async def test_iron_law_verify_json_decode_error():
    params = {"intent": "test"}
    mock_process = MockProcess(stdout_data=b"invalid json", returncode=0)

    with patch("asyncio.create_subprocess_exec", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = mock_process

        with patch.object(activity, "logger", MagicMock()):
            with pytest.raises(ApplicationError) as exc_info:
                await verify_deductive_path(params)
            assert "parsing failed" in str(exc_info.value).lower()
