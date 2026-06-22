"""
Portable PostgreSQL DatabaseProvider (AWS RDS / Cloud SQL / Azure / self-host).

This is the config-only swap target for the Supabase primary database. It speaks
standard Postgres over asyncpg against a single DATABASE_URL, enforcing the same
table allowlist and identifier validation as the Supabase provider. No
application code changes are required to cut over — only:

    DATABASE_PROVIDER=postgres        # (or 'aws')
    DATABASE_URL=postgresql://user:pass@host:5432/dbname

The same DSN works for AWS RDS, GCP Cloud SQL, Azure Database for PostgreSQL,
or a self-hosted Postgres container — anything that speaks the wire protocol.

asyncpg is imported lazily (only when this provider is actually instantiated and
connects) so selecting Supabase never pays for it.
"""

import asyncio
from typing import Any

from ._validation import validate_column_name, validate_table_name
from .base import DatabaseError, DatabaseProvider, NotFoundError


def _quote_ident(name: str) -> str:
    """Double-quote an already-validated identifier (alnum/underscore only)."""
    return f'"{name}"'


def _build_where(filters: dict[str, Any], start_index: int = 1) -> tuple[str, list[Any]]:
    """
    Build a parameterized ``col = $n AND ...`` clause from an equality filter dict.

    Returns the SQL fragment and the ordered parameter list. Column names are
    validated; values are always passed as bind parameters (never interpolated).
    """
    clauses: list[str] = []
    params: list[Any] = []
    index = start_index
    for key, value in filters.items():
        column = validate_column_name(key)
        clauses.append(f"{_quote_ident(column)} = ${index}")
        params.append(value)
        index += 1
    return " AND ".join(clauses), params


class PostgresDatabaseProvider(DatabaseProvider):
    """
    Standard PostgreSQL implementation of the DatabaseProvider protocol.

    Security features (identical guarantees to the Supabase provider):
    - Table names validated against the shared allowlist
    - Column/identifier names validated against a strict pattern
    - All values passed as bind parameters (parameterized queries)
    """

    def __init__(self, dsn: str, *, min_size: int = 1, max_size: int = 10):
        if not dsn or not isinstance(dsn, str):
            raise DatabaseError("PostgresDatabaseProvider requires a non-empty DSN")
        self._dsn = dsn
        self._min_size = min_size
        self._max_size = max_size
        self._pool: Any = None
        self._lock = asyncio.Lock()

    async def _get_pool(self) -> Any:
        """Lazily create the connection pool on first use (thread/coroutine safe)."""
        if self._pool is not None:
            return self._pool
        async with self._lock:
            if self._pool is None:
                try:
                    import asyncpg
                except ImportError as e:  # pragma: no cover - dependency guard
                    raise DatabaseError(
                        "asyncpg is required for DATABASE_PROVIDER=postgres. "
                        "Install it (it is already declared in requirements)."
                    ) from e
                self._pool = await asyncpg.create_pool(
                    dsn=self._dsn,
                    min_size=self._min_size,
                    max_size=self._max_size,
                )
        return self._pool

    async def connect(self) -> None:
        await self._get_pool()

    async def disconnect(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    async def select(
        self,
        table: str,
        filters: dict[str, Any] | None = None,
        select_fields: str | None = None,
    ) -> list[dict[str, Any]]:
        validated_table = validate_table_name(table)
        if select_fields and select_fields.strip() != "*":
            columns = [validate_column_name(c.strip()) for c in select_fields.split(",")]
            fields_sql = ", ".join(_quote_ident(c) for c in columns)
        else:
            fields_sql = "*"

        sql = f"SELECT {fields_sql} FROM {_quote_ident(validated_table)}"
        params: list[Any] = []
        if filters:
            where_sql, params = _build_where(filters)
            sql += f" WHERE {where_sql}"

        try:
            pool = await self._get_pool()
            rows = await pool.fetch(sql, *params)
            return [dict(row) for row in rows]
        except DatabaseError:
            raise
        except Exception as e:
            raise DatabaseError(f"Database select failed: {e!s}") from e

    async def get(self, table: str, query_params: dict[str, Any]) -> list[dict[str, Any]]:
        return await self.select(table, filters=query_params)

    async def select_one(self, table: str, query_params: dict[str, Any]) -> dict[str, Any]:
        results = await self.get(table, query_params)
        if not results:
            params_str = ", ".join(f"{k}={v}" for k, v in query_params.items())
            raise NotFoundError(f"Record not found in {table} matching: {params_str}")
        return results[0]

    async def insert(self, table: str, record: dict[str, Any]) -> dict[str, Any]:
        validated_table = validate_table_name(table)
        if not record:
            raise DatabaseError("Insert requires a non-empty record")

        columns = [validate_column_name(c) for c in record]
        placeholders = ", ".join(f"${i}" for i in range(1, len(columns) + 1))
        columns_sql = ", ".join(_quote_ident(c) for c in columns)
        sql = (
            f"INSERT INTO {_quote_ident(validated_table)} ({columns_sql}) "
            f"VALUES ({placeholders}) RETURNING *"
        )
        try:
            pool = await self._get_pool()
            row = await pool.fetchrow(sql, *record.values())
            if row is None:
                raise DatabaseError(f"Insert failed: no row returned from {validated_table}")
            return dict(row)
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
        validated_table = validate_table_name(table)
        if not record:
            raise DatabaseError("Upsert requires a non-empty record")

        columns = [validate_column_name(c) for c in record]
        placeholders = ", ".join(f"${i}" for i in range(1, len(columns) + 1))
        columns_sql = ", ".join(_quote_ident(c) for c in columns)
        sql = (
            f"INSERT INTO {_quote_ident(validated_table)} ({columns_sql}) "
            f"VALUES ({placeholders})"
        )

        if conflict_columns:
            conflict = [validate_column_name(c) for c in conflict_columns]
            conflict_sql = ", ".join(_quote_ident(c) for c in conflict)
            update_cols = [c for c in columns if c not in conflict]
            if update_cols:
                set_sql = ", ".join(
                    f"{_quote_ident(c)} = EXCLUDED.{_quote_ident(c)}" for c in update_cols
                )
                sql += f" ON CONFLICT ({conflict_sql}) DO UPDATE SET {set_sql}"
            else:
                sql += f" ON CONFLICT ({conflict_sql}) DO NOTHING"
        sql += " RETURNING *"

        try:
            pool = await self._get_pool()
            row = await pool.fetchrow(sql, *record.values())
            if row is None:
                raise DatabaseError(f"Upsert failed: no row returned from {validated_table}")
            return dict(row)
        except DatabaseError:
            raise
        except Exception as e:
            raise DatabaseError(f"Database upsert failed: {e!s}") from e

    async def update(
        self,
        table: str,
        updates: dict[str, Any],
        filters: dict[str, Any],
    ) -> dict[str, Any]:
        if not filters:
            raise DatabaseError("Update requires at least one filter")
        if not updates:
            raise DatabaseError("Update requires fields to update")
        validated_table = validate_table_name(table)

        set_columns = [validate_column_name(c) for c in updates]
        set_sql = ", ".join(
            f"{_quote_ident(c)} = ${i}" for i, c in enumerate(set_columns, start=1)
        )
        set_params = list(updates.values())
        where_sql, where_params = _build_where(filters, start_index=len(set_columns) + 1)
        sql = (
            f"UPDATE {_quote_ident(validated_table)} SET {set_sql} "
            f"WHERE {where_sql} RETURNING *"
        )

        try:
            pool = await self._get_pool()
            row = await pool.fetchrow(sql, *set_params, *where_params)
            if row is None:
                raise NotFoundError(f"No records to update in {validated_table} with {filters}")
            return dict(row)
        except (DatabaseError, NotFoundError):
            raise
        except Exception as e:
            raise DatabaseError(f"Database update failed: {e!s}") from e

    async def delete(self, table: str, filters: dict[str, Any]) -> int:
        if not filters:
            raise DatabaseError("Delete requires at least one filter")
        validated_table = validate_table_name(table)
        where_sql, params = _build_where(filters)
        sql = f"DELETE FROM {_quote_ident(validated_table)} WHERE {where_sql}"

        try:
            pool = await self._get_pool()
            # asyncpg returns a status string like "DELETE 3"
            status = await pool.execute(sql, *params)
            return _parse_rowcount(status)
        except DatabaseError:
            raise
        except Exception as e:
            raise DatabaseError(f"Database delete failed: {e!s}") from e

    async def rpc(self, function_name: str, params: dict[str, Any]) -> Any:
        fn = validate_column_name(function_name)
        if params:
            keys = [validate_column_name(k) for k in params]
            args_sql = ", ".join(f"{k} => ${i}" for i, k in enumerate(keys, start=1))
            sql = f"SELECT * FROM {_quote_ident(fn)}({args_sql})"
            values = list(params.values())
        else:
            sql = f"SELECT * FROM {_quote_ident(fn)}()"
            values = []

        try:
            pool = await self._get_pool()
            rows = await pool.fetch(sql, *values)
            return [dict(row) for row in rows]
        except DatabaseError:
            raise
        except Exception as e:
            raise DatabaseError(f"RPC call to {function_name} failed: {e!s}") from e


def _parse_rowcount(status: str | None) -> int:
    """Parse the affected-row count from an asyncpg command status (e.g. 'DELETE 3')."""
    if not status:
        return 0
    parts = status.split()
    if parts and parts[-1].isdigit():
        return int(parts[-1])
    return 0


# Backwards compatibility alias (mirrors SupabaseProvider naming)
PostgresProvider = PostgresDatabaseProvider
