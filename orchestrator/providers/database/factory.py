"""
Database Provider Factory.

Provides singleton instances for:
- DATABASE_PROVIDER: Primary relational DB (Supabase/Postgres). CRUD, auth, session state.
- VECTOR_PROVIDER: Secondary vector DB (TiDB). Embeddings only.

ARCHITECTURE MANDATE: TiDB must NEVER be mapped as the primary DatabaseProvider.
The two concerns are decoupled via separate environment variables and singletons.
"""

import os

from .base import DatabaseProvider
from .supabase_provider import SupabaseDatabaseProvider


class DatabaseFactory:
    @staticmethod
    def get_provider() -> DatabaseProvider:
        """
        Build the PRIMARY database provider (Supabase only).

        DATABASE_PROVIDER env var is accepted for forward-compatibility
        but currently only 'supabase' is a valid value.
        Setting DATABASE_PROVIDER=tidb is a fatal misconfiguration.
        """
        provider_type = os.getenv("DATABASE_PROVIDER", "supabase").lower()

        if provider_type == "tidb":
            raise ValueError(
                "FATAL: DATABASE_PROVIDER=tidb is not allowed. "
                "TiDB is a vector store, not a relational CRUD provider. "
                "Use VECTOR_PROVIDER=tidb instead. "
                "Primary DB must be 'supabase'."
            )

        if provider_type == "supabase":
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if not supabase_url or not supabase_key:
                raise ValueError(
                    "Supabase database provider requires SUPABASE_URL and "
                    "SUPABASE_SERVICE_ROLE_KEY environment variables"
                )
            return SupabaseDatabaseProvider(url=supabase_url, key=supabase_key)

        raise ValueError(
            f"CRITICAL: Unknown DATABASE_PROVIDER '{provider_type}'. "
            "Must be 'supabase'."
        )


# ---------------------------------------------------------------------------
# Primary DatabaseProvider singleton (Supabase — CRUD, auth, session state)
# ---------------------------------------------------------------------------

_db_provider: DatabaseProvider | None = None


def get_database_provider() -> DatabaseProvider:
    """
    Get the primary (Supabase) database provider singleton.

    Returns:
        Configured DatabaseProvider instance

    Raises:
        ValueError: If required configuration is missing or provider is invalid
    """
    global _db_provider

    if _db_provider is not None:
        return _db_provider

    _db_provider = DatabaseFactory.get_provider()
    return _db_provider


def reset_database_provider() -> None:
    """Reset the primary database provider singleton (for testing)."""
    global _db_provider
    _db_provider = None


# ---------------------------------------------------------------------------
# Vector Provider singleton (TiDB — embeddings only)
# ---------------------------------------------------------------------------

_vector_provider = None  # TiDBVectorPersistence | None


def get_vector_provider():
    """
    Get the vector persistence provider singleton.

    Controlled by VECTOR_PROVIDER env var. Returns None if not configured.
    Only 'tidb' is currently supported.

    Returns:
        TiDBVectorPersistence instance, or None if VECTOR_PROVIDER is unset
    """
    global _vector_provider

    if _vector_provider is not None:
        return _vector_provider

    vector_type = os.getenv("VECTOR_PROVIDER", "").lower()

    if not vector_type:
        return None

    if vector_type == "tidb":
        from infrastructure.tidb_persistence import TiDBVectorPersistence

        _vector_provider = TiDBVectorPersistence()
        return _vector_provider

    raise ValueError(
        f"Unknown VECTOR_PROVIDER '{vector_type}'. Supported: 'tidb'."
    )


def reset_vector_provider() -> None:
    """Reset the vector provider singleton (for testing)."""
    global _vector_provider
    _vector_provider = None
