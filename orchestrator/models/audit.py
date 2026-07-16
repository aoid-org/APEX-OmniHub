"""
# Force CI sync
Enterprise Compliance Audit Logging Schema.

This module defines the strict schema for audit logging to ensure future
compliance with SOC2, GDPR, and other enterprise compliance frameworks.

All audit events must be logged using this schema to maintain:
- Complete audit trails
- Structured data for compliance reporting
- Immutable records for forensic analysis
- Standardized metadata for enterprise integration
"""

import asyncio
from datetime import datetime, timezone
from typing import Any, cast

from providers.database.factory import get_database_provider

from .audit_types import (
    AuditAction,
    AuditActor,
    AuditLogEntry,
    AuditMetadata,
    AuditResource,
    AuditResourceType,
    AuditStatus,
)

__all__ = [
    "AuditAction",
    "AuditActor",
    "AuditLogEntry",
    "AuditLogger",
    "AuditMetadata",
    "AuditPersistenceError",
    "AuditQueryError",
    "AuditResource",
    "AuditResourceType",
    "AuditStatus",
    "audit_logger",
    "log_audit_event",
]

UTC = timezone.utc


class AuditPersistenceError(RuntimeError):
    """Raised when a compliance event cannot be durably persisted."""


class AuditQueryError(RuntimeError):
    """Raised when stored audit events cannot be queried reliably."""


class AuditLogger:
    """
    Enterprise audit logger with compliance guarantees.

    Features:
    - Immutable log entries
    - Cryptographic integrity
    - Compliance-ready structure
    - Structured metadata
    - High-performance async logging
    """

    def __init__(self, storage_backend: str = "supabase"):
        """
        Initialize audit logger.

        Args:
            storage_backend: Where to store audit logs ('supabase', 'file', 'external')
        """
        self.storage_backend = storage_backend
        self._integrity_chain: list[str] = []

    async def log_event(self, event: AuditLogEntry) -> str:
        """
        Log an audit event with compliance guarantees.

        Args:
            event: The audit event to log

        Returns:
            Log entry ID

        Raises:
            AuditFailureException: If logging fails (critical for compliance)
        """
        # Set processing timestamp
        event.processed_at = datetime.now(timezone.utc)

        # Generate integrity hash
        event.integrity_hash = self._generate_integrity_hash(event)

        # Link to previous entry for chain integrity
        if self._integrity_chain:
            event.previous_hash = self._integrity_chain[-1]

        # Store the event
        await self._store_event(event)

        # Update integrity chain
        self._integrity_chain.append(event.integrity_hash)

        return event.id

    def _generate_integrity_hash(self, event: AuditLogEntry) -> str:
        """Generate cryptographic hash for tamper detection."""
        import hashlib
        import json

        # Create canonical JSON representation (exclude mutable hash fields)
        event_dict = event.model_dump(exclude={"integrity_hash", "processed_at"})
        canonical_json = json.dumps(event_dict, sort_keys=True, default=str)

        # Generate SHA-256 hash
        return hashlib.sha256(canonical_json.encode()).hexdigest()

    async def _store_event(self, event: AuditLogEntry) -> None:
        """Store audit event (implementation depends on backend)."""
        if self.storage_backend == "supabase":
            await self._store_supabase(event)
        elif self.storage_backend == "file":
            await self._store_file(event)
        else:
            raise ValueError(f"Unsupported storage backend: {self.storage_backend}")

    async def _store_supabase(self, event: AuditLogEntry) -> None:
        """
        Store audit event in Supabase with fallback logging.

        CRITICAL: Audit events must never be silently lost. If database
        persistence fails, we log to stderr as a fallback.
        """
        try:
            db = get_database_provider()

            event_dict = event.model_dump(mode="json")
            # The live audit_logs contract has seven columns. Preserve the
            # richer compliance envelope under metadata instead of attempting
            # to insert fields that do not exist in the table.
            record = {
                "id": event.id,
                "actor_id": event.actor_id,
                "action_type": str(event.action),
                "resource_type": str(event.resource_type),
                "resource_id": event.resource_id,
                "metadata": {
                    **event.metadata.model_dump(mode="json"),
                    "_audit": {
                        key: value
                        for key, value in event_dict.items()
                        if key
                        not in {
                            "id",
                            "actor_id",
                            "action",
                            "resource_type",
                            "resource_id",
                            "metadata",
                            "timestamp",
                        }
                    },
                },
                "created_at": event.timestamp.isoformat(),
            }

            # Store in audit_logs table
            await db.insert(
                table="audit_logs",
                record=record,
            )

        except Exception as e:
            # CRITICAL: Never silently lose audit logs
            import sys

            # Log critical error to stderr
            print(
                f"CRITICAL: Audit persistence failed: {type(e).__name__}",
                file=sys.stderr,
            )
            # Emit only essential non-secret fields, then fail closed so the
            # caller cannot mistake a lost compliance event for success.
            print(
                f"AUDIT_FALLBACK: id={event.id} "
                f"action={event.action} "
                f"resource_type={event.resource_type} "
                f"resource_id={event.resource_id} "
                f"actor_id={event.actor_id} "
                f"status={event.status} "
                f"timestamp={event.timestamp.isoformat()}",
                file=sys.stderr,
            )
            raise AuditPersistenceError("Audit persistence failed") from e

    async def _store_file(self, event: AuditLogEntry) -> None:
        """Store audit event in local file (for development/testing)."""
        import importlib
        import json

        aiofiles: Any = importlib.import_module("aiofiles")
        log_file = f"audit_logs_{event.timestamp.date()}.jsonl"

        async with aiofiles.open(log_file, "a") as f:
            await f.write(json.dumps(event.model_dump(), default=str) + "\n")

    async def query_events(
        self,
        actor_id: str | None = None,
        action: AuditAction | None = None,
        resource_type: AuditResourceType | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int = 100,
    ) -> list[AuditLogEntry]:
        """
        Query audit events for compliance reporting.

        Args:
            actor_id: Filter by actor (interface placeholder)
            action: Filter by action type (interface placeholder)
            resource_type: Filter by resource type (interface placeholder)
            start_date: Start date for query (interface placeholder)
            end_date: End date for query (interface placeholder)
            limit: Maximum results to return (interface placeholder)

        Returns:
            List of matching audit events
        """
        from providers.database.factory import get_database_provider
        from providers.database.supabase_provider import SupabaseDatabaseProvider

        try:
            db = cast(SupabaseDatabaseProvider, get_database_provider())
            query = db.client.table("audit_logs").select(
                "id,actor_id,action_type,resource_type,resource_id,metadata,created_at"
            )

            if actor_id:
                query = query.eq("actor_id", actor_id)
            if action:
                query = query.eq(
                    "action_type", action.value if hasattr(action, "value") else str(action)
                )
            if resource_type:
                query = query.eq(
                    "resource_type",
                    resource_type.value if hasattr(resource_type, "value") else str(resource_type),
                )
            if start_date:
                query = query.gte("created_at", start_date.isoformat())
            if end_date:
                query = query.lte("created_at", end_date.isoformat())

            query = query.order("created_at", desc=True).limit(limit)

            # Execute sync DB call off the event loop.
            response = await asyncio.to_thread(query.execute)
            data = response.data

            events: list[AuditLogEntry] = []
            for row in data:
                if not isinstance(row, dict):
                    raise ValueError("Invalid audit row")
                raw_metadata = row.get("metadata")
                metadata = (
                    cast(dict[str, Any], raw_metadata) if isinstance(raw_metadata, dict) else {}
                )
                raw_envelope = metadata.get("_audit")
                envelope = (
                    cast(dict[str, Any], raw_envelope) if isinstance(raw_envelope, dict) else {}
                )
                public_metadata = {key: value for key, value in metadata.items() if key != "_audit"}
                events.append(
                    AuditLogEntry(
                        **envelope,
                        id=row["id"],
                        actor_id=row["actor_id"],
                        action=row["action_type"],
                        resource_type=row["resource_type"],
                        resource_id=row["resource_id"],
                        timestamp=row["created_at"],
                        metadata=AuditMetadata(**public_metadata),
                    )
                )
            return events
        except Exception as exc:
            import logging

            logging.exception("Failed to query audit events")
            raise AuditQueryError("Failed to query audit events") from exc

    def validate_integrity(self, events: list[AuditLogEntry]) -> bool:
        """
        Validate the integrity of audit log chain.

        Args:
            events: Chronologically ordered audit events

        Returns:
            True if integrity is maintained, False if tampered
        """
        for i, event in enumerate(events):
            expected_hash = self._generate_integrity_hash(event)

            if event.integrity_hash != expected_hash:
                return False

            if i > 0 and event.previous_hash != events[i - 1].integrity_hash:
                return False

        return True


# Global audit logger instance
audit_logger = AuditLogger()


async def log_audit_event(
    actor_id: str,
    action: AuditAction,
    resource_type: AuditResourceType,
    resource_id: str,
    status: AuditStatus = AuditStatus.SUCCESS,
    metadata: AuditMetadata | None = None,
    **kwargs: Any,
) -> str:
    """
    Convenience function for logging audit events.

    This is the primary interface for logging audit events throughout the application.

    Args:
        actor_id: ID of the actor performing the action
        action: Type of action being performed
        resource_type: Type of resource being acted upon
        resource_id: ID of the specific resource
        status: Outcome status of the action
        metadata: Additional structured metadata
        **kwargs: Additional fields for metadata

    Returns:
        Audit log entry ID

    Example:
        await log_audit_event(
            actor_id="user_123",
            action=AuditAction.LOGIN,
            resource_type=AuditResourceType.USER,
            resource_id="user_123",
            status=AuditStatus.SUCCESS,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0..."
        )
    """
    import uuid
    from datetime import datetime

    # Create metadata if not provided
    if metadata is None:
        metadata = AuditMetadata(**kwargs)
    else:
        # Update metadata with additional kwargs
        for key, value in kwargs.items():
            setattr(metadata, key, value)

    # Create audit event
    event = AuditLogEntry(
        id=str(uuid.uuid4()),
        correlation_id=str(uuid.uuid4()),  # In practice, this would be passed from request context
        timestamp=datetime.now(timezone.utc),
        event_sequence=1,  # Would be incremented per correlation_id
        actor_id=actor_id,
        actor_type="user",
        actor_ip=None,
        actor_user_agent=None,
        action=action,
        status=status,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_owner=None,
        metadata=metadata,
        data_classification="internal",
        retention_period_days=2555,
        integrity_hash=None,
        previous_hash=None,
        processed_at=None,
        storage_location=None,
        backup_location=None,
    )

    # Log the event
    return await audit_logger.log_event(event)
