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
    # Aliases that all resolve to the portable standard-Postgres provider.
    # 'aws'/'rds' are accepted so the documented swap reads naturally.
    _POSTGRES_ALIASES = frozenset({"postgres", "postgresql", "aws", "rds"})

    @staticmethod
    def get_provider() -> DatabaseProvider:
        """
        Build the PRIMARY database provider from DATABASE_PROVIDER.

        Valid values:
        - 'supabase' (default): managed Supabase Postgres + API layer.
        - 'postgres' / 'postgresql' / 'aws' / 'rds': portable standard Postgres
          over asyncpg, using DATABASE_URL. Works for AWS RDS, GCP Cloud SQL,
          Azure Database, or self-hosted Postgres — the config-only swap target.

        Setting DATABASE_PROVIDER=tidb is a fatal misconfiguration (TiDB is a
        vector store, configured separately via VECTOR_PROVIDER).
        """
        provider_type = os.getenv("DATABASE_PROVIDER", "supabase").lower()

        if provider_type == "tidb":
            raise ValueError(
                "FATAL: DATABASE_PROVIDER=tidb is not allowed. "
                "TiDB is a vector store, not a relational CRUD provider. "
                "Use VECTOR_PROVIDER=tidb instead. "
                "Primary DB must be 'supabase' or 'postgres'."
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

        if provider_type in DatabaseFactory._POSTGRES_ALIASES:
            # Standard Postgres DSN. SUPABASE_DB_URL is accepted as a fallback so
            # an existing direct-Postgres connection string can be reused as-is.
            dsn = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
            if not dsn:
                raise ValueError(
                    f"DATABASE_PROVIDER='{provider_type}' requires DATABASE_URL "
                    "(standard postgresql:// DSN; works for AWS RDS, GCP Cloud SQL, "
                    "Azure Database, or self-hosted Postgres)."
                )
            # Imported lazily so the Supabase path never imports asyncpg.
            from .postgres_provider import PostgresDatabaseProvider

            return PostgresDatabaseProvider(dsn=dsn)

        raise ValueError(
            f"CRITICAL: Unknown DATABASE_PROVIDER '{provider_type}'. "
            "Must be 'supabase' or 'postgres' (aliases: postgresql, aws, rds)."
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

_vector_provider: object | None = None


def get_vector_provider() -> object | None:
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

    raise ValueError(f"Unknown VECTOR_PROVIDER '{vector_type}'. Supported: 'tidb'.")


def reset_vector_provider() -> None:
    """Reset the vector provider singleton (for testing)."""
    global _vector_provider
    _vector_provider = None
