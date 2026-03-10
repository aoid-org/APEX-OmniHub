"""Tests for activities/omnitrace_activities.py."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from activities.omnitrace_activities import (
    omnitrace_record_event,
    omnitrace_record_run_complete,
    omnitrace_record_run_start,
)


@pytest.mark.asyncio
async def test_record_run_start() -> None:
    with patch("activities.omnitrace_activities.get_database_provider") as mock_db:
        mock_db.return_value = AsyncMock()
        mock_db.return_value.upsert = AsyncMock(return_value={"id": "1"})
        result = await omnitrace_record_run_start(
            {
                "run_id": "r1",
                "workflow_id": "wf-1",
                "goal": "test",
                "user_id": "u1",
            }
        )
    assert result["recorded"] is True


@pytest.mark.asyncio
async def test_record_run_complete() -> None:
    with patch("activities.omnitrace_activities.get_database_provider") as mock_db:
        mock_db.return_value = AsyncMock()
        mock_db.return_value.upsert = AsyncMock(return_value={"id": "1"})
        result = await omnitrace_record_run_complete(
            {
                "run_id": "r1",
                "status": "completed",
                "result": {"ok": True},
            }
        )
    assert result["recorded"] is True


@pytest.mark.asyncio
async def test_record_event() -> None:
    with patch("activities.omnitrace_activities.get_database_provider") as mock_db:
        mock_db.return_value = AsyncMock()
        mock_db.return_value.upsert = AsyncMock(return_value={"id": "1"})
        result = await omnitrace_record_event(
            {
                "run_id": "r1",
                "event_key": "tool:s1:noop:1",
                "kind": "tool",
                "name": "noop",
                "latency_ms": 42,
                "data": {},
            }
        )
    assert result["recorded"] is True


@pytest.mark.asyncio
async def test_record_event_db_failure_is_best_effort() -> None:
    with patch("activities.omnitrace_activities.get_database_provider") as mock_db:
        mock_db.return_value = AsyncMock()
        mock_db.return_value.upsert = AsyncMock(side_effect=Exception("db down"))
        result = await omnitrace_record_event(
            {
                "run_id": "r1",
                "event_key": "k",
                "kind": "tool",
                "name": "n",
                "latency_ms": 0,
                "data": {},
            }
        )
    assert result["recorded"] is False
