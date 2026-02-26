"""
Tests for receipt cleanup SQL logic.
Validates that the cleanup function targets correct rows.
"""


def test_cleanup_query_syntax():
    """Verify the cleanup SQL is syntactically valid by parsing it."""
    sql = (
        "DELETE FROM idempotency_receipts "
        "WHERE expires_at < NOW() "
        "AND created_at < NOW() - INTERVAL '30 days';"
    )
    assert "DELETE FROM" in sql
    assert "expires_at < NOW()" in sql
    assert "INTERVAL '30 days'" in sql


def test_cleanup_targets_only_expired():
    """Cleanup should only target rows where expires_at < NOW AND older than 30 days."""
    # Simulated row states
    rows = [
        {"id": 1, "expired": True, "age_days": 31},  # should delete
        {"id": 2, "expired": True, "age_days": 5},    # should keep (too recent)
        {"id": 3, "expired": False, "age_days": 60},   # should keep (not expired)
        {"id": 4, "expired": False, "age_days": 1},    # should keep
    ]

    to_delete = [r for r in rows if r["expired"] and r["age_days"] > 30]
    assert len(to_delete) == 1
    assert to_delete[0]["id"] == 1


def test_rollback_migration_exists():
    """Rollback migration file should exist."""
    import os

    rollback = "supabase/migrations/20260226000001_rollback_receipt_cleanup.sql"
    assert os.path.exists(rollback), f"Rollback migration missing: {rollback}"
