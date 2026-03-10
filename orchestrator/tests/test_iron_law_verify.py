"""Tests for activities/iron_law_verify.py."""

from __future__ import annotations
from unittest.mock import AsyncMock, patch
import pytest
from activities.iron_law_verify import verify_deductive_path


class TestVerifyDeductivePath:
    @pytest.mark.asyncio
    async def test_verified_result(self) -> None:
        mock_proc = AsyncMock()
        mock_proc.returncode = 0
        mock_proc.communicate.return_value = (
            b'{"verified": true, "logicDelta": 0.02}',
            b"",
        )

        with patch(
            "activities.iron_law_verify.asyncio.create_subprocess_exec",
            return_value=mock_proc,
        ):
            result = await verify_deductive_path(
                {
                    "intent": "unlock_door",
                    "target_state": {"locked": False},
                    "device_id": "lock-1",
                    "workflow_id": "wf-1",
                }
            )
        assert result["verified"] is True

    @pytest.mark.asyncio
    async def test_rejected_result(self) -> None:
        mock_proc = AsyncMock()
        mock_proc.returncode = 0
        mock_proc.communicate.return_value = (
            b'{"verified": false, "reason": "unsafe"}',
            b"",
        )

        with patch(
            "activities.iron_law_verify.asyncio.create_subprocess_exec",
            return_value=mock_proc,
        ):
            result = await verify_deductive_path(
                {
                    "intent": "move_robot",
                    "target_state": {},
                    "device_id": "arm-1",
                    "workflow_id": "wf-2",
                }
            )
        assert result["verified"] is False

    @pytest.mark.asyncio
    async def test_subprocess_crash_returns_unverified(self) -> None:
        mock_proc = AsyncMock()
        mock_proc.returncode = 1
        mock_proc.communicate.return_value = (b"", b"segfault")

        with patch(
            "activities.iron_law_verify.asyncio.create_subprocess_exec",
            return_value=mock_proc,
        ):
            result = await verify_deductive_path(
                {
                    "intent": "actuate_valve",
                    "target_state": {},
                    "device_id": "v-1",
                    "workflow_id": "wf-3",
                }
            )
        assert result["verified"] is False
