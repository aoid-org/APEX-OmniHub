from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest

from models.audit import (
    AuditLogger,
    AuditLogEntry,
    AuditAction,
    AuditResourceType,
    AuditStatus,
    AuditMetadata,
    log_audit_event,
    audit_logger,
)


def test_audit_metadata():
    metadata = AuditMetadata(user_agent="TestAgent", custom_fields={"key": "value"})
    assert metadata.user_agent == "TestAgent"
    assert metadata.custom_fields["key"] == "value"


def test_audit_log_entry():
    entry = AuditLogEntry(
        id="123",
        correlation_id="corr-123",
        timestamp=datetime.now(UTC),
        event_sequence=1,
        actor_id="user-123",
        action=AuditAction.LOGIN,
        status=AuditStatus.SUCCESS,
        resource_type=AuditResourceType.USER,
        resource_id="res-123",
    )
    assert entry.actor_type == "user"
    assert entry.action == "login"
    assert entry.integrity_hash is None


@pytest.fixture
def logger():
    return AuditLogger(storage_backend="supabase")


def test_generate_integrity_hash(logger):
    entry = AuditLogEntry(
        id="123",
        correlation_id="corr",
        timestamp=datetime(2023, 1, 1, tzinfo=UTC),
        event_sequence=1,
        actor_id="actor",
        action=AuditAction.READ,
        status=AuditStatus.SUCCESS,
        resource_type=AuditResourceType.DOCUMENT,
        resource_id="doc-1",
    )

    hash_val = logger._generate_integrity_hash(entry)
    assert isinstance(hash_val, str)
    assert len(hash_val) == 64  # SHA-256 hex digest length


@pytest.mark.asyncio
async def test_log_event_supabase(logger):
    entry = AuditLogEntry(
        id="123",
        correlation_id="corr",
        timestamp=datetime(2023, 1, 1, tzinfo=UTC),
        event_sequence=1,
        actor_id="actor",
        action=AuditAction.READ,
        status=AuditStatus.SUCCESS,
        resource_type=AuditResourceType.DOCUMENT,
        resource_id="doc-1",
    )

    with patch("models.audit.get_database_provider") as mock_db_provider:
        mock_db = AsyncMock()
        mock_db_provider.return_value = mock_db

        result_id = await logger.log_event(entry)

        assert result_id == "123"
        assert entry.integrity_hash is not None
        assert entry.processed_at is not None
        mock_db.insert.assert_called_once()
        args, kwargs = mock_db.insert.call_args
        assert kwargs["table"] == "audit_logs"
        assert kwargs["record"]["id"] == "123"


@pytest.mark.asyncio
async def test_log_event_supabase_fallback(logger, capsys):
    entry = AuditLogEntry(
        id="123",
        correlation_id="corr",
        timestamp=datetime(2023, 1, 1, tzinfo=UTC),
        event_sequence=1,
        actor_id="actor",
        action=AuditAction.READ,
        status=AuditStatus.SUCCESS,
        resource_type=AuditResourceType.DOCUMENT,
        resource_id="doc-1",
    )

    with patch("models.audit.get_database_provider", side_effect=Exception("DB Error")):
        await logger.log_event(entry)

        # Check stderr for fallback logs
        captured = capsys.readouterr()
        assert "CRITICAL: Audit persistence failed: DB Error" in captured.err
        assert "AUDIT_FALLBACK: id=123" in captured.err


@pytest.mark.asyncio
async def test_log_event_file():
    logger = AuditLogger(storage_backend="file")
    entry = AuditLogEntry(
        id="123",
        correlation_id="corr",
        timestamp=datetime(2023, 1, 1, tzinfo=UTC),
        event_sequence=1,
        actor_id="actor",
        action=AuditAction.READ,
        status=AuditStatus.SUCCESS,
        resource_type=AuditResourceType.DOCUMENT,
        resource_id="doc-1",
    )

    mock_file = AsyncMock()
    mock_file.write = AsyncMock()

    # We need to mock aiofiles.open
    class AsyncContextManager:
        async def __aenter__(self):
            return mock_file

        async def __aexit__(self, exc_type, exc, tb):
            pass

    with patch("aiofiles.open", return_value=AsyncContextManager()):
        await logger.log_event(entry)
        mock_file.write.assert_called_once()
        assert "123" in mock_file.write.call_args[0][0]


@pytest.mark.asyncio
async def test_log_audit_event_helper():
    with patch.object(audit_logger, "log_event", new_callable=AsyncMock) as mock_log_event:
        mock_log_event.return_value = "auto-uuid"

        # Call the helper method directly
        result = await log_audit_event(
            actor_id="user1",
            action=AuditAction.LOGIN,
            resource_type=AuditResourceType.USER,
            resource_id="user1",
            status=AuditStatus.SUCCESS,
            ip_address="127.0.0.1",
        )

        assert result == "auto-uuid"
        mock_log_event.assert_called_once()
        event_arg = mock_log_event.call_args[0][0]
        assert isinstance(event_arg, AuditLogEntry)
        assert event_arg.actor_id == "user1"
        assert event_arg.action == "login"
        assert event_arg.metadata.ip_address == "127.0.0.1"


def test_validate_integrity():
    logger = AuditLogger()
    entry1 = AuditLogEntry(
        id="1",
        correlation_id="c",
        timestamp=datetime(2023, 1, 1, tzinfo=UTC),
        event_sequence=1,
        actor_id="a",
        action=AuditAction.READ,
        status=AuditStatus.SUCCESS,
        resource_type=AuditResourceType.DOCUMENT,
        resource_id="d",
    )
    entry1.integrity_hash = logger._generate_integrity_hash(entry1)

    entry2 = AuditLogEntry(
        id="2",
        correlation_id="c",
        timestamp=datetime(2023, 1, 1, tzinfo=UTC),
        event_sequence=2,
        actor_id="a",
        action=AuditAction.READ,
        status=AuditStatus.SUCCESS,
        resource_type=AuditResourceType.DOCUMENT,
        resource_id="d",
    )
    entry2.previous_hash = entry1.integrity_hash
    entry2.integrity_hash = logger._generate_integrity_hash(entry2)

    assert logger.validate_integrity([entry1, entry2]) is True

    # Test tamper
    entry2.actor_id = "hacker"
    assert logger.validate_integrity([entry1, entry2]) is False
