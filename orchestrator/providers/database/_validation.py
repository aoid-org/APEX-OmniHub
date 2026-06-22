"""
Shared validation for database providers (SQL-injection guards).

Single source of truth for the table allowlist and identifier validation,
shared by every DatabaseProvider implementation (Supabase, Postgres/AWS, ...).
Keeping this in one module means a provider swap can never silently widen the
attack surface — both providers enforce the identical allowlist and patterns.
"""

import re

from .base import DatabaseError

# SECURITY: Allowlist of valid table names (SQL injection prevention)
ALLOWED_TABLES = frozenset(
    [
        "users",
        "profiles",
        "wallets",
        "wallet_identities",
        "wallet_nonces",
        "files",
        "links",
        "integrations",
        "automations",
        "automation_logs",
        "todos",
        "notifications",
        "audit_logs",
        "rate_limits",
        "omni_policies",
        "sessions",
        "user_data",
        "settings",
        "events",
        "provider_registry",
        "connections",
        "workflows",
        "workflow_runs",
        # MAN Mode tables
        "man_tasks",
        "man_notifications",
        # OmniTrace tables
        "omni_runs",
        "omni_run_events",
        # BYOM Cockpit tables
        "provider_connections",
        "pilot_sessions",
        # Monetization tables
        "usage_metering",
        # Agent execution tables
        "agent_runs",
        "idempotency_ledger",
        # PhysiOmni Pilot tables
        "physiomni_devices",
        "physiomni_telemetry",
        "physiomni_alerts",
        "physiomni_baselines",
    ]
)

# Valid column/identifier name pattern (alphanumeric and underscore only)
VALID_COLUMN_PATTERN = re.compile(r"^[a-zA-Z_]\w*$")


def validate_table_name(table: str) -> str:
    """
    Validate table name against allowlist.
    Raises DatabaseError if table is not allowed.
    """
    if not table or not isinstance(table, str):
        raise DatabaseError("Table name must be a non-empty string")

    normalized = table.strip().lower()
    if normalized not in ALLOWED_TABLES:
        raise DatabaseError(f"Table '{table}' is not in the allowed list")

    return normalized


def validate_column_name(column: str) -> str:
    """
    Validate column/identifier name format to prevent injection.
    """
    if not column or not isinstance(column, str):
        raise DatabaseError("Column name must be a non-empty string")

    if not VALID_COLUMN_PATTERN.match(column):
        raise DatabaseError(f"Invalid column name format: '{column}'")

    return column
