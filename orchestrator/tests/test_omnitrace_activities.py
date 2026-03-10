"""Tests for activities/omnitrace_activities.py."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from activities.omnitrace_activities import (
    omnitrace_record_event,
    omnitrace_record_run_complete,
    omnitrace_record_run_start,
)

_PATCH = "activities.omnitrace_activities.get_omnitrace_recorder"


def _recorder(sampled: bool = True) -> MagicMock:
    r = MagicMock()
    r.should_record.return_value = sampled
    r.record_run_start = AsyncMock()
    r.record_run_complete = AsyncMock()
    r.record_event = AsyncMock()
    return r


@pytest.mark.asyncio
async def test_record_run_start() -> None:
    with patch(_PATCH, return_value=_recorder()):
        res = await omnitrace_record_run_start(
            {"workflow_id": "w", "trace_id": "t", "user_id": "u", "input_data": {}}
        )
    assert res["recorded"] is True


@pytest.mark.asyncio
async def test_record_run_complete() -> None:
    with patch(_PATCH, return_value=_recorder()):
        res = await omnitrace_record_run_complete(
            {"workflow_id": "w", "trace_id": "t", "status": "done", "output_data": {}}
        )
    assert res["recorded"] is True


@pytest.mark.asyncio
async def test_record_event() -> None:
    with patch(_PATCH, return_value=_recorder()):
        res = await omnitrace_record_event(
            {"workflow_id": "w", "trace_id": "t", "event_key": "k", "kind": "tool", "name": "n"}
        )
    assert res["recorded"] is True


@pytest.mark.asyncio
async def test_record_event_not_sampled() -> None:
    with patch(_PATCH, return_value=_recorder(False)):
        res = await omnitrace_record_event(
            {"workflow_id": "w", "trace_id": "t", "event_key": "k", "kind": "tool", "name": "n"}
        )
    assert res["recorded"] is False
