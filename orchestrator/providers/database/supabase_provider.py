from typing import Any

from supabase import Client, create_client

from ._validation import (
    ALLOWED_TABLES,
    VALID_COLUMN_PATTERN,
    validate_column_name,
    validate_table_name,
)
from .base import DatabaseError, DatabaseProvider, NotFoundError

# Validation helpers live in ._validation (shared with every provider) but are
# re-exported here so existing imports keep working:
#   from providers.database.supabase_provider import validate_table_name, ...
__all__ = [
    "ALLOWED_TABLES",
    "VALID_COLUMN_PATTERN",
    "validate_column_name",
    "validate_table_name",
    "SupabaseDatabaseProvider",
    "SupabaseProvider",
]


class SupabaseDatabaseProvider(DatabaseProvider):
    """
    Supabase implementation of the DatabaseProvider.

    Security features:
    - Table name validation against allowlist
    - Column name format validation
    - Parameterized queries via Supabase SDK
    """

    def __init__(self, url: str, key: str):
        self.client: Client = create_client(url, key)

    async def connect(self) -> None:
        """
        Supabase client is stateless/HTTP-based, so explicit connection
        is often not needed, but we validate credentials here.
        """
        if not self.client:
            raise DatabaseError("Supabase client not initialized")

    async def disconnect(self) -> None:
        """
        No-op for Supabase HTTP client.
        """
        pass

    async def insert(self, table: str, record: dict[str, Any]) -> dict[str, Any]:
        try:
            # SECURITY: Validate table name against allowlist
            validated_table = validate_table_name(table)

            response = self.client.table(validated_table).insert(record).execute()
            if not response.data:
                raise DatabaseError(f"Insert failed: No data from {validated_table}")
            return response.data[0]  # type: ignore[return-value]
        except DatabaseError:
            raise
        except Exception as e:
            raise DatabaseError(f"Database insert failed: {e!s}") from e

    async def upsert(
        self,
        table: str,
        record: dict[str, Any],
        conflict_columns: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Perform an upsert (insert or update on conflict).
        """
        try:
            # SECURITY: Validate table name against allowlist
            validated_table = validate_table_name(table)

            upsert_kwargs = {}
            if conflict_columns:
                # SECURITY: Validate conflict column names
                valid_conflict_columns = [validate_column_name(col) for col in conflict_columns]
                upsert_kwargs["on_conflict"] = ",".join(valid_conflict_columns)

            query = self.client.table(validated_table).upsert(record, **upsert_kwargs)  # type: ignore
            response = query.execute()

            if not response.data:
                raise DatabaseError(f"Upsert failed: No data from {validated_table}")
            return response.data[0]  # type: ignore[return-value]
        except DatabaseError:
            raise
        except Exception as e:
            raise DatabaseError(f"Database upsert failed: {e!s}") from e

    async def get(self, table: str, query_params: dict[str, Any]) -> list[dict[str, Any]]:
        try:
            # SECURITY: Validate table name against allowlist
            validated_table = validate_table_name(table)

            query = self.client.table(validated_table).select("*")

            # SECURITY: Validate column names in query params
            for key, value in query_params.items():
                validated_key = validate_column_name(key)
                query = query.eq(validated_key, value)

            response = query.execute()
            return response.data  # type: ignore[return-value]
        except DatabaseError:
            raise
        except Exception as e:
            raise DatabaseError(f"Database get failed: {e!s}") from e

    async def select(
        self,
        table: str,
        filters: dict[str, Any] | None = None,
        select_fields: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Select records from a table with optional filtering.

        Args:
            table: Table name to query
            filters: Dictionary of field-value pairs to filter by
            select_fields: Comma-separated field names to select (None = all)

        Returns:
            List of matching records as dictionaries

        Raises:
            DatabaseError: For database errors including disallowed tables
        """
        try:
            validated_table = validate_table_name(table)
            fields = select_fields if select_fields else "*"
            query = self.client.table(validated_table).select(fields)

            if filters:
                for key, value in filters.items():
                    validated_key = validate_column_name(key)
                    query = query.eq(validated_key, value)

            response = query.execute()
            return response.data or []  # type: ignore[return-value]
        except DatabaseError:
            raise
        except Exception as e:
            raise DatabaseError(f"Database select failed: {e!s}") from e

    async def select_one(self, table: str, query_params: dict[str, Any]) -> dict[str, Any]:
        """
        Retrieve a single record. Raises NotFoundError if not found.
        """
        results = await self.get(table, query_params)
        if not results:
            params_str = ", ".join(f"{k}={v}" for k, v in query_params.items())
            raise NotFoundError(f"Record not found in {table} matching: {params_str}")
        return results[0]

    async def update(
        self, table: str, updates: dict[str, Any], filters: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Update records matching filters.
        """
        try:
            if not filters:
                raise DatabaseError("Update requires at least one filter")

            # SECURITY: Validate table name against allowlist
            validated_table = validate_table_name(table)

            query = self.client.table(validated_table).update(updates)

            # SECURITY: Validate column names in filters
            for key, value in filters.items():
                validated_key = validate_column_name(key)
                query = query.eq(validated_key, value)

            response = query.execute()

            if not response.data:
                raise NotFoundError(f"No records to update in {validated_table} with {filters}")

            return response.data[0]  # type: ignore[return-value]
        except Exception as e:
            if isinstance(e, (DatabaseError, NotFoundError)):
                raise
            raise DatabaseError(f"Database update failed: {e!s}") from e

    async def delete(self, table: str, filters: dict[str, Any]) -> int:
        """
        Delete records from table matching filters.

        Returns:
            Number of records deleted (0..n)
        """
        try:
            if not filters:
                raise DatabaseError("Delete requires at least one filter")

            # SECURITY: Validate table name against allowlist
            validated_table = validate_table_name(table)

            query = self.client.table(validated_table).delete()

            # SECURITY: Validate column names in filters
            for key, value in filters.items():
                validated_key = validate_column_name(key)
                query = query.eq(validated_key, value)

            response = query.execute()

            return len(response.data) if response.data else 0
        except Exception as e:
            # Catch-all for database errors, including DatabaseError
            raise DatabaseError(f"Database delete failed: {e!s}") from e

    async def rpc(self, function_name: str, params: dict[str, Any]) -> Any:
        """
        Call a Supabase RPC function.

        Args:
            function_name: Name of the RPC function to call
            params: Parameters to pass to the function

        Returns:
            Function result

        Raises:
            DatabaseError: For RPC call failures
        """
        try:
            response = self.client.rpc(function_name, params).execute()
            return response.data
        except Exception as e:
            raise DatabaseError(f"RPC call to {function_name} failed: {e!s}") from e


# Backwards compatibility alias
SupabaseProvider = SupabaseDatabaseProvider
