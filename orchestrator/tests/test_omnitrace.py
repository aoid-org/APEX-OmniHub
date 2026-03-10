import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from observability.omnitrace import (
    get_sample_rate,
    get_max_events_per_run,
    get_max_event_bytes,
    is_omnitrace_enabled,
    canonical_json,
    compute_hash,
    redact_value,
    redact_dict,
    truncate_payload,
    OmniTraceRecorder,
    get_omnitrace_recorder,
    clear_recorder,
)


def test_config_defaults():
    with patch("os.getenv", return_value=None):
        assert get_sample_rate() == 1.0  # Dev default
        assert get_max_events_per_run() == 200
        assert get_max_event_bytes() == 8192
        assert is_omnitrace_enabled() is True


def test_canonical_json_and_hash():
    data1 = {"b": 2, "a": 1}
    data2 = {"a": 1, "b": 2}  # Different order

    # Should produce exact same json string and hash
    assert canonical_json(data1) == '{"a":1,"b":2}'
    assert compute_hash(data1) == compute_hash(data2)


def test_redact_value():
    # Dropped fields return None
    assert redact_value("password", "secret123") is None
    assert redact_value("token", "abc") is None
    assert redact_value("access_token", "jwt") is None

    # Allowlisted fields return exactly original value
    assert redact_value("workflow_id", "wf-123") == "wf-123"
    assert redact_value("latency_ms", 150) == 150
    assert redact_value("success", True) is True

    # Other values are hashed (primitive redaction)
    res = redact_value("unknown_field", "some string data")
    assert "<redacted:" in res

    res_num = redact_value("unknown_num", 1234)
    assert res_num == 1234  # Small numbers are left as is

    res_big_num = redact_value("unknown_num", 9999999)
    assert "<number:" in res_big_num


def test_redact_dict():
    data = {"password": "foo", "workflow_id": "wf-1", "user_email": "test@test.com"}
    redacted = redact_dict(data)

    assert "password" not in redacted
    assert redacted["workflow_id"] == "wf-1"
    assert "<redacted:" in str(redacted["user_email"])


def test_truncate_payload():
    data = {"workflow_id": "wf-1", "huge_string": "A" * 15000, "nested": {"key": "B" * 10000}}

    truncated = truncate_payload(data, max_bytes=1000)

    # Truncation logic kicks in
    assert "workflow_id" in truncated
    assert "A" * 50 in str(truncated.get("huge_string"))
    assert "<truncated>" in str(truncated.get("huge_string"))
    assert truncated.get("nested", {}).get("_truncated") is True


@pytest.fixture
def mock_db():
    with patch("observability.omnitrace.OmniTraceRecorder._get_db") as mock_get_db:
        mock_client = AsyncMock()
        mock_get_db.return_value = mock_client
        yield mock_client


@pytest.fixture
def recorder():
    # Make sure to clear cache if needed
    clear_recorder("wf-test")
    rec = get_omnitrace_recorder("wf-test", "trace-test")
    # Force sample rate to 100%
    with patch("observability.omnitrace.get_sample_rate", return_value=1.0):
        yield rec


@pytest.mark.asyncio
async def test_omnitrace_record_run_start(recorder, mock_db):
    await recorder.record_run_start("user-1", {"test": "data"}, "running")
    mock_db.rpc.assert_called_once()
    args, kwargs = mock_db.rpc.call_args
    assert args[0] == "omnitrace_upsert_run"
    assert kwargs[0]["p_workflow_id"] == "wf-test"
    assert kwargs[0]["p_user_id"] == "user-1"
    assert kwargs[0]["p_status"] == "running"


@pytest.mark.asyncio
async def test_omnitrace_record_run_complete(recorder, mock_db):
    await recorder.record_run_complete({"output": "data"}, "completed")
    mock_db.rpc.assert_called_once()
    args, kwargs = mock_db.rpc.call_args
    assert args[0] == "omnitrace_upsert_run"
    assert kwargs[0]["p_status"] == "completed"


@pytest.mark.asyncio
async def test_omnitrace_record_event(recorder, mock_db):
    await recorder.record_event("evt-1", "tool", "test-tool", 100, {"foo": "bar"})
    mock_db.rpc.assert_called_once()
    args, kwargs = mock_db.rpc.call_args
    assert args[0] == "omnitrace_insert_event"
    assert kwargs[0]["p_event_key"] == "evt-1"
    assert kwargs[0]["p_kind"] == "tool"
    assert kwargs[0]["p_name"] == "test-tool"
    assert kwargs[0]["p_latency_ms"] == 100


@pytest.mark.asyncio
async def test_omnitrace_record_event_cap(recorder, mock_db):
    # Artificially set event count to max
    with patch("observability.omnitrace.get_max_events_per_run", return_value=5):
        recorder._event_count = 5
        await recorder.record_event("evt-1", "tool", "test-tool")

    mock_db.rpc.assert_not_called()


def test_omnitrace_not_sampled():
    rec = OmniTraceRecorder("wf-skip", "trace-skip")
    with patch("observability.omnitrace.get_sample_rate", return_value=0.0):
        # 0.0 sample rate always drops
        assert rec.should_record() is False
