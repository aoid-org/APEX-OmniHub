from datetime import datetime, timezone

from unittest.mock import AsyncMock, patch

import pytest

from models.audit import (
    AuditAction,
    AuditLogEntry,
    AuditLogger,
    AuditMetadata,
    AuditResourceType,
    AuditStatus,
    audit_logger,
    log_audit_event,
)


def test_audit_metadata():
    metadata = AuditMetadata(user_agent="TestAgent", custom_fields={"key": "value"})
    assert metadata.user_agent == "TestAgent"
    assert metadata.custom_fields["key"] == "value"


def test_audit_log_entry():
    entry = AuditLogEntry(
        id="123",
        correlation_id="corr-123",
        timestamp=datetime.now(timezone.utc),
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
        timestamp=datetime(2023, 1, 1, tzinfo=timezone.utc),
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
        timestamp=datetime(2023, 1, 1, tzinfo=timezone.utc),
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
        _, kwargs = mock_db.insert.call_args
        assert kwargs["table"] == "audit_logs"
        assert kwargs["record"]["id"] == "123"


@pytest.mark.asyncio
async def test_log_event_supabase_fallback(logger, capsys):
    entry = AuditLogEntry(
        id="123",
        correlation_id="corr",
        timestamp=datetime(2023, 1, 1, tzinfo=timezone.utc),
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
        timestamp=datetime(2023, 1, 1, tzinfo=timezone.utc),
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
            # Propagate any exception raised in the context body.
            return False

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
        timestamp=datetime(2023, 1, 1, tzinfo=timezone.utc),
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
        timestamp=datetime(2023, 1, 1, tzinfo=timezone.utc),
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


def _make_entry(**kwargs):
    """Helper to create a minimal AuditLogEntry."""
    defaults = {
        "id": "123",
        "correlation_id": "corr",
        "timestamp": datetime(2023, 1, 1, tzinfo=timezone.utc),
        "event_sequence": 1,
        "actor_id": "actor",
        "action": AuditAction.READ,
        "status": AuditStatus.SUCCESS,
        "resource_type": AuditResourceType.DOCUMENT,
        "resource_id": "doc-1",
    }
    defaults.update(kwargs)
    return AuditLogEntry(**defaults)


@pytest.mark.asyncio
async def test_log_event_sets_previous_hash_when_chain_not_empty():
    """Line 238: previous_hash is set when _integrity_chain is non-empty."""
    logger = AuditLogger(storage_backend="supabase")

    with patch("models.audit.get_database_provider") as mock_db_provider:
        mock_db = AsyncMock()
        mock_db_provider.return_value = mock_db

        # Log two events so the second uses the chain
        entry1 = _make_entry(id="e1")
        await logger.log_event(entry1)

        entry2 = _make_entry(id="e2", event_sequence=2)
        await logger.log_event(entry2)

        # After the second log_event, previous_hash should be the first entry's hash
        assert entry2.previous_hash == entry1.integrity_hash


@pytest.mark.asyncio
async def test_store_event_unsupported_backend():
    """Line 267: ValueError raised for unsupported storage backend."""
    logger = AuditLogger(storage_backend="unsupported")
    entry = _make_entry()

    with pytest.raises(ValueError, match="Unsupported storage backend"):
        await logger._store_event(entry)


@pytest.mark.asyncio
async def test_query_events_basic():
    """Lines 345-376: query_events with all filters exercised."""
    import sys
    from unittest.mock import MagicMock

    logger = AuditLogger()

    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_db.client.table.return_value.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.gte.return_value = mock_query
    mock_query.lte.return_value = mock_query
    mock_query.limit.return_value = mock_query

    # Return one valid row from execute()
    row = {
        "id": "r1",
        "correlation_id": "c",
        "timestamp": datetime(2023, 1, 1, tzinfo=timezone.utc).isoformat(),
        "event_sequence": 1,
        "actor_id": "a",
        "action": "read",
        "status": "success",
        "resource_type": "document",
        "resource_id": "d",
        "metadata": {},
    }
    mock_query.execute.return_value.data = [row]

    # query_events does local imports inside the function body, so we
    # patch the modules in sys.modules so local 'from ... import ...' picks them up.
    mock_factory = MagicMock()
    mock_factory.get_database_provider.return_value = mock_db
    mock_supabase_provider = MagicMock()

    with patch.dict(
        sys.modules,
        {
            "providers.database.factory": mock_factory,
            "providers.database.supabase_provider": mock_supabase_provider,
        },
    ):
        results = await logger.query_events(
            actor_id="a",
            action=AuditAction.READ,
            resource_type=AuditResourceType.DOCUMENT,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
            limit=10,
        )
    assert isinstance(results, list)


@pytest.mark.asyncio
async def test_query_events_exception_returns_empty():
    """Lines 377-381: exception in query_events returns empty list."""
    logger = AuditLogger()

    with patch("models.audit.get_database_provider", side_effect=Exception("DB down")):
        results = await logger.query_events()

    assert results == []


def test_validate_integrity_broken_chain():
    """Line 400: broken previous_hash chain returns False."""
    logger = AuditLogger()

    entry1 = _make_entry(id="1", event_sequence=1)
    entry1.integrity_hash = logger._generate_integrity_hash(entry1)

    entry2 = _make_entry(id="2", event_sequence=2)
    # Intentionally set wrong previous_hash to simulate broken chain
    entry2.previous_hash = "wrong_hash"
    entry2.integrity_hash = logger._generate_integrity_hash(entry2)

    # Chain should be invalid because entry2.previous_hash != entry1.integrity_hash
    assert logger.validate_integrity([entry1, entry2]) is False


@pytest.mark.asyncio
async def test_log_audit_event_with_existing_metadata_and_kwargs():
    """Lines 454-455: log_audit_event with existing metadata updates it via kwargs."""
    existing_metadata = AuditMetadata(user_agent="OldAgent")

    with patch.object(audit_logger, "log_event", new_callable=AsyncMock) as mock_log:
        mock_log.return_value = "test-id"

        result = await log_audit_event(
            actor_id="user2",
            action=AuditAction.WRITE,
            resource_type=AuditResourceType.DOCUMENT,
            resource_id="doc-2",
            status=AuditStatus.SUCCESS,
            metadata=existing_metadata,
            user_agent="NewAgent",
        )

    assert result == "test-id"
    event_arg = mock_log.call_args[0][0]
    # The metadata object should have been updated with the kwarg
    assert event_arg.metadata.user_agent == "NewAgent"
