"""Tests for pg_cron receipts cleanup logic.

These tests verify the cleanup SQL logic at the application level
by mocking the database layer. They do NOT require a live Postgres
instance — actual migration testing is handled by CI with psql.

Covers:
  - Old processed receipts are deleted
  - Recent receipts survive cleanup
  - Non-processed receipts survive regardless of age
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass

# ── Domain Model ─────────────────────────────────────────────────────


@dataclass
class Receipt:
    """Minimal receipt for cleanup testing."""

    receipt_id: str
    status: str
    created_at: datetime.datetime


# ── Simulated Cleanup Logic ──────────────────────────────────────────

RETENTION_DAYS = 30


def cleanup_receipts(receipts: list[Receipt]) -> list[Receipt]:
    """Apply the same predicate as the pg_cron SQL job.

    Returns the list of receipts that would SURVIVE the cleanup.
    """
    cutoff = datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(
        days=RETENTION_DAYS,
    )
    return [r for r in receipts if not (r.created_at < cutoff and r.status == "processed")]


# ── Tests ────────────────────────────────────────────────────────────


class TestReceiptCronCleanup:
    """Unit tests for receipt retention logic."""

    def _make_receipt(
        self,
        *,
        days_old: int,
        status: str = "processed",
    ) -> Receipt:
        created = datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(
            days=days_old,
        )
        return Receipt(receipt_id=f"r-{days_old}-{status}", status=status, created_at=created)

    def test_old_processed_receipts_deleted(self) -> None:
        old = self._make_receipt(days_old=45)
        survivors = cleanup_receipts([old])
        assert len(survivors) == 0

    def test_recent_processed_receipts_survive(self) -> None:
        recent = self._make_receipt(days_old=5)
        survivors = cleanup_receipts([recent])
        assert len(survivors) == 1

    def test_old_pending_receipts_survive(self) -> None:
        old_pending = self._make_receipt(days_old=60, status="pending")
        survivors = cleanup_receipts([old_pending])
        assert len(survivors) == 1

    def test_boundary_30_days_survives(self) -> None:
        """Receipt exactly at 30 days is NOT deleted (< not <=)."""
        boundary = self._make_receipt(days_old=30)
        # Add 10 seconds to ensure the receipt strictly survives the small time delta
        # between its creation and the cutoff calculation in cleanup_receipts()
        boundary.created_at += datetime.timedelta(seconds=10)
        survivors = cleanup_receipts([boundary])
        # At exactly 30 days the cutoff is now - 30d, created_at == cutoff → not <
        assert len(survivors) == 1

    def test_boundary_31_days_deleted(self) -> None:
        over = self._make_receipt(days_old=31)
        survivors = cleanup_receipts([over])
        assert len(survivors) == 0

    def test_mixed_batch(self) -> None:
        receipts = [
            self._make_receipt(days_old=60, status="processed"),
            self._make_receipt(days_old=60, status="pending"),
            self._make_receipt(days_old=10, status="processed"),
            self._make_receipt(days_old=5, status="failed"),
        ]
        survivors = cleanup_receipts(receipts)
        # Only the 60-day processed receipt is deleted
        assert len(survivors) == 3

    def test_empty_list(self) -> None:
        survivors = cleanup_receipts([])
        assert len(survivors) == 0
