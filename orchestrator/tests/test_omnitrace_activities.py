import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from temporalio import activity
from typing import Any

from activities.omnitrace_activities import (
    omnitrace_record_run_start,
    omnitrace_record_run_complete,
    omnitrace_record_event,
    get_omnitrace_activities,
)


@pytest.fixture
def mock_recorder():
    with patch("activities.omnitrace_activities.get_omnitrace_recorder") as mock_get_recorder:
        recorder = MagicMock()
        recorder.should_record.return_value = True
        recorder.record_run_start = AsyncMock()
        recorder.record_run_complete = AsyncMock()
        recorder.record_event = AsyncMock()
        mock_get_recorder.return_value = recorder
        yield recorder, mock_get_recorder


@pytest.mark.asyncio
async def test_omnitrace_record_run_start_recorded(mock_recorder):
    recorder, _ = mock_recorder
    params = {
        "workflow_id": "wf-123",
        "trace_id": "trace-123",
        "user_id": "user-123",
        "input_data": {"test": "data"},
        "status": "running",
    }

    with patch.object(activity, "logger", MagicMock()):
        result = await omnitrace_record_run_start(params)

        assert result == {"recorded": True, "sampled": True}
        recorder.record_run_start.assert_called_once_with(
            user_id="user-123", input_data={"test": "data"}, status="running"
        )


@pytest.mark.asyncio
async def test_omnitrace_record_run_start_not_sampled(mock_recorder):
    recorder, _ = mock_recorder
    recorder.should_record.return_value = False

    with patch.object(activity, "logger", MagicMock()):
        result = await omnitrace_record_run_start({"workflow_id": "123"})
        assert result == {"recorded": False, "sampled": False}
        recorder.record_run_start.assert_not_called()


@pytest.mark.asyncio
async def test_omnitrace_record_run_complete_recorded(mock_recorder):
    recorder, _ = mock_recorder
    params = {
        "workflow_id": "wf-123",
        "trace_id": "trace-123",
        "output_data": {"result": "success"},
        "status": "completed",
    }

    with patch.object(activity, "logger", MagicMock()):
        result = await omnitrace_record_run_complete(params)

        assert result == {"recorded": True}
        recorder.record_run_complete.assert_called_once_with(
            output_data={"result": "success"}, status="completed"
        )


@pytest.mark.asyncio
async def test_omnitrace_record_run_complete_not_sampled(mock_recorder):
    recorder, _ = mock_recorder
    recorder.should_record.return_value = False

    with patch.object(activity, "logger", MagicMock()):
        result = await omnitrace_record_run_complete({})
        assert result == {"recorded": False}


@pytest.mark.asyncio
async def test_omnitrace_record_event_recorded(mock_recorder):
    recorder, _ = mock_recorder
    params = {
        "workflow_id": "wf-123",
        "trace_id": "trace-123",
        "event_key": "event-1",
        "kind": "tool",
        "name": "test-tool",
        "latency_ms": 150,
        "data": {"foo": "bar"},
    }

    with patch.object(activity, "logger", MagicMock()):
        result = await omnitrace_record_event(params)

        assert result == {"recorded": True}
        recorder.record_event.assert_called_once_with(
            event_key="event-1", kind="tool", name="test-tool", latency_ms=150, data={"foo": "bar"}
        )


@pytest.mark.asyncio
async def test_omnitrace_record_event_not_sampled(mock_recorder):
    recorder, _ = mock_recorder
    recorder.should_record.return_value = False

    result = await omnitrace_record_event({})
    assert result == {"recorded": False}


def test_get_omnitrace_activities():
    activities = get_omnitrace_activities()
    assert len(activities) == 3
    assert omnitrace_record_run_start in activities
    assert omnitrace_record_run_complete in activities
    assert omnitrace_record_event in activities
