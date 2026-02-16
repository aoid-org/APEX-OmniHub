"""
Database Provider Factory.

Provides a singleton database provider instance based on configuration.
This enables runtime switching between different database backends.
"""

import os

from infrastructure.tidb_persistence import TiDBVectorPersistence

from .base import DatabaseProvider
from .supabase_provider import SupabaseDatabaseProvider


class DatabaseFactory:
    @staticmethod
    def get_provider() -> DatabaseProvider:
        provider_type = os.getenv("DATABASE_PROVIDER", "supabase").lower()

        if provider_type == "supabase":
            # Get Supabase configuration
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if not supabase_url or not supabase_key:
                raise ValueError(
                    "Supabase database provider requires SUPABASE_URL and "
                    "SUPABASE_SERVICE_ROLE_KEY environment variables"
                )
            return SupabaseDatabaseProvider(url=supabase_url, key=supabase_key)

        if provider_type == "tidb":
            return TiDBVectorPersistence()  # type: ignore # APEX-DEV G2: Portability

        raise ValueError(
            f"CRITICAL: Unknown DATABASE_PROVIDER '{provider_type}'. Must be 'supabase' or 'tidb'."
        )


# Global singleton instance for backward compatibility
_db_provider: DatabaseProvider | None = None


def get_database_provider() -> DatabaseProvider:
    """
    Get the configured database provider instance.

    Uses singleton pattern to ensure consistent provider across the application.
    Configuration is read from environment variables.

    Returns:
        Configured DatabaseProvider instance

    Raises:
        ValueError: If required configuration is missing or invalid provider specified
    """
    global _db_provider

    if _db_provider is not None:
        return _db_provider

    _db_provider = DatabaseFactory.get_provider()
    return _db_provider


def reset_database_provider() -> None:
    """
    Reset the database provider singleton.

    Useful for testing or when configuration changes.
    """
    global _db_provider
    _db_provider = None
