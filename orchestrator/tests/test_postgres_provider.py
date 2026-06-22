"""
Tests for the portable Postgres/AWS DatabaseProvider and factory selection.

These tests do not require a live database: the connection pool is replaced with
a fake that records the SQL and bind parameters, so we verify query construction,
validation guards, and the config-only factory swap without asyncpg/Postgres.
"""

import pytest

from providers.database.base import DatabaseError, NotFoundError
from providers.database.postgres_provider import (
    PostgresDatabaseProvider,
    _build_where,
    _parse_rowcount,
    _quote_ident,
)


class FakePool:
    """Records calls; returns canned results for fetch/fetchrow/execute."""

    def __init__(self, *, fetch=None, fetchrow=None, execute="DELETE 0"):
        self.calls: list[tuple[str, str, tuple]] = []
        self._fetch = fetch if fetch is not None else []
        self._fetchrow = fetchrow
        self._execute = execute

    async def fetch(self, sql, *params):
        self.calls.append(("fetch", sql, params))
        return self._fetch

    async def fetchrow(self, sql, *params):
        self.calls.append(("fetchrow", sql, params))
        return self._fetchrow

    async def execute(self, sql, *params):
        self.calls.append(("execute", sql, params))
        return self._execute


def _provider_with(pool: FakePool) -> PostgresDatabaseProvider:
    provider = PostgresDatabaseProvider(dsn="postgresql://user:pass@host:5432/db")

    async def _get_pool():
        return pool

    provider._get_pool = _get_pool  # type: ignore[assignment]
    return provider


# ---------------------------------------------------------------------------
# Construction + helpers
# ---------------------------------------------------------------------------


def test_requires_non_empty_dsn():
    with pytest.raises(DatabaseError):
        PostgresDatabaseProvider(dsn="")


def test_quote_ident():
    assert _quote_ident("users") == '"users"'


def test_build_where_parameterizes():
    clause, params = _build_where({"id": "x", "active": True})
    assert clause == '"id" = $1 AND "active" = $2'
    assert params == ["x", True]


def test_build_where_respects_start_index():
    clause, params = _build_where({"id": "x"}, start_index=3)
    assert clause == '"id" = $3'
    assert params == ["x"]


def test_parse_rowcount():
    assert _parse_rowcount("DELETE 3") == 3
    assert _parse_rowcount("UPDATE 0") == 0
    assert _parse_rowcount(None) == 0
    assert _parse_rowcount("INSERT 0 1") == 1


# ---------------------------------------------------------------------------
# Query construction
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_select_builds_parameterized_sql():
    pool = FakePool(fetch=[{"id": "x", "active": True}])
    provider = _provider_with(pool)

    result = await provider.select("users", filters={"id": "x"})

    assert result == [{"id": "x", "active": True}]
    kind, sql, params = pool.calls[0]
    assert kind == "fetch"
    assert sql == 'SELECT * FROM "users" WHERE "id" = $1'
    assert params == ("x",)


@pytest.mark.asyncio
async def test_select_validates_fields():
    pool = FakePool(fetch=[])
    provider = _provider_with(pool)
    await provider.select("users", select_fields="id, email")
    _, sql, _ = pool.calls[0]
    assert sql == 'SELECT "id", "email" FROM "users"'


@pytest.mark.asyncio
async def test_select_rejects_disallowed_table_before_connecting():
    pool = FakePool()
    provider = _provider_with(pool)
    with pytest.raises(DatabaseError):
        await provider.select("not_a_real_table")
    assert pool.calls == []  # never reached the pool


@pytest.mark.asyncio
async def test_insert_returns_inserted_row():
    pool = FakePool(fetchrow={"id": 1, "email": "a@b.c"})
    provider = _provider_with(pool)
    row = await provider.insert("users", {"email": "a@b.c"})
    assert row == {"id": 1, "email": "a@b.c"}
    _, sql, params = pool.calls[0]
    assert sql == 'INSERT INTO "users" ("email") VALUES ($1) RETURNING *'
    assert params == ("a@b.c",)


@pytest.mark.asyncio
async def test_upsert_with_conflict_columns():
    pool = FakePool(fetchrow={"id": 1})
    provider = _provider_with(pool)
    await provider.upsert("users", {"id": 1, "email": "a@b.c"}, conflict_columns=["id"])
    _, sql, _ = pool.calls[0]
    assert 'ON CONFLICT ("id") DO UPDATE SET "email" = EXCLUDED."email"' in sql


@pytest.mark.asyncio
async def test_update_requires_filters():
    provider = _provider_with(FakePool())
    with pytest.raises(DatabaseError):
        await provider.update("users", {"email": "x"}, {})


@pytest.mark.asyncio
async def test_update_raises_not_found_when_no_row():
    pool = FakePool(fetchrow=None)
    provider = _provider_with(pool)
    with pytest.raises(NotFoundError):
        await provider.update("users", {"email": "x"}, {"id": "missing"})
    _, sql, params = pool.calls[0]
    assert sql == 'UPDATE "users" SET "email" = $1 WHERE "id" = $2 RETURNING *'
    assert params == ("x", "missing")


@pytest.mark.asyncio
async def test_delete_returns_row_count():
    pool = FakePool(execute="DELETE 2")
    provider = _provider_with(pool)
    count = await provider.delete("audit_logs", {"workflow_id": "test"})
    assert count == 2


@pytest.mark.asyncio
async def test_delete_requires_filters():
    provider = _provider_with(FakePool())
    with pytest.raises(DatabaseError):
        await provider.delete("users", {})


@pytest.mark.asyncio
async def test_rpc_uses_named_args():
    pool = FakePool(fetch=[{"ok": True}])
    provider = _provider_with(pool)
    await provider.rpc("chronos_release_expired_locks", {"older_than": 30})
    _, sql, params = pool.calls[0]
    assert sql == 'SELECT * FROM "chronos_release_expired_locks"(older_than => $1)'
    assert params == (30,)


# ---------------------------------------------------------------------------
# Factory selection (the config-only swap)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("alias", ["postgres", "postgresql", "aws", "rds"])
def test_factory_selects_postgres_for_aliases(monkeypatch, alias):
    from providers.database.factory import DatabaseFactory

    monkeypatch.setenv("DATABASE_PROVIDER", alias)
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@h:5432/db")
    provider = DatabaseFactory.get_provider()
    assert provider.__class__.__name__ == "PostgresDatabaseProvider"


def test_factory_postgres_requires_dsn(monkeypatch):
    from providers.database.factory import DatabaseFactory

    monkeypatch.setenv("DATABASE_PROVIDER", "aws")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_DB_URL", raising=False)
    with pytest.raises(ValueError, match="DATABASE_URL"):
        DatabaseFactory.get_provider()


def test_factory_unknown_provider_message(monkeypatch):
    from providers.database.factory import DatabaseFactory

    monkeypatch.setenv("DATABASE_PROVIDER", "mongodb")
    with pytest.raises(ValueError, match="Unknown DATABASE_PROVIDER"):
        DatabaseFactory.get_provider()
