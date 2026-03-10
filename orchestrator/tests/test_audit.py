"""Tests for models/audit.py — AuditLogEntry + AuditLogger."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest

from models.audit import (
    AuditAction,
    AuditLogEntry,
    AuditLogger,
    AuditMetadata,
    AuditResourceType,
    AuditStatus,
)


def _make_entry(**overrides: object) -> AuditLogEntry:
    defaults: dict = {
        "id": "evt-1",
        "correlation_id": "corr-1",
        "timestamp": datetime.now(UTC),
        "event_sequence": 1,
        "actor_id": "user-1",
        "action": AuditAction.DATA_ACCESS,
        "status": AuditStatus.SUCCESS,
        "resource_type": AuditResourceType.DATABASE,
        "resource_id": "wf-1",
    }
    defaults.update(overrides)
    return AuditLogEntry(**defaults)


class TestAuditLogEntry:
    def test_defaults(self) -> None:
        entry = _make_entry()
        assert entry.actor_type == "user"
        assert entry.data_classification == "internal"
        assert "soc2" in entry.compliance_frameworks

    def test_metadata_defaults(self) -> None:
        meta = AuditMetadata()
        assert meta.compliance_flags == []
        assert meta.custom_fields == {}


class TestAuditLogger:
    @pytest.mark.asyncio
    async def test_log_event_sets_hash(self) -> None:
        logger = AuditLogger(storage_backend="file")
        entry = _make_entry()
        with patch.object(logger, "_store_event", new_callable=AsyncMock):
            await logger.log_event(entry)
        assert entry.integrity_hash is not None
        assert entry.processed_at is not None

    @pytest.mark.asyncio
    async def test_chain_integrity(self) -> None:
        logger = AuditLogger(storage_backend="file")
        e1 = _make_entry(id="e1")
        e2 = _make_entry(id="e2")
        with patch.object(logger, "_store_event", new_callable=AsyncMock):
            await logger.log_event(e1)
            await logger.log_event(e2)
        assert e2.previous_hash == e1.integrity_hash

    @pytest.mark.asyncio
    async def test_supabase_fallback(self) -> None:
        logger = AuditLogger(storage_backend="supabase")
        entry = _make_entry()
        with patch(
            "models.audit.get_database_provider",
            side_effect=Exception("db down"),
        ):
            await logger.log_event(entry)
        # Should not raise — fallback to stderr

    def test_validate_integrity_pass(self) -> None:
        logger = AuditLogger()
        e1 = _make_entry(id="e1")
        e1.integrity_hash = logger._generate_integrity_hash(e1)
        assert logger.validate_integrity([e1]) is True

    def test_validate_integrity_tampered(self) -> None:
        logger = AuditLogger()
        e1 = _make_entry(id="e1")
        e1.integrity_hash = "bad-hash"
        assert logger.validate_integrity([e1]) is False

    def test_query_events_returns_list(self) -> None:
        logger = AuditLogger()
        result = logger.query_events()
        # query_events catches DB errors and returns []
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_unsupported_backend_raises(self) -> None:
        logger = AuditLogger(storage_backend="s3")
        entry = _make_entry()
        with pytest.raises(ValueError, match="Unsupported"):
            await logger.log_event(entry)
