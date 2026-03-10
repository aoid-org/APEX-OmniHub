"""Tests for providers/database/supabase_provider.py."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from providers.database.supabase_provider import (
    SupabaseDatabaseProvider,
    validate_column_name,
    validate_table_name,
)


class TestValidateTableName:
    def test_valid(self) -> None:
        assert validate_table_name("users") == "users"
        assert validate_table_name(" WORKFLOWS ") == "workflows"

    def test_invalid(self) -> None:
        with pytest.raises(ValueError):
            validate_table_name("hacker_table")
        with pytest.raises(ValueError):
            validate_table_name("")


class TestValidateColumnName:
    def test_valid(self) -> None:
        assert validate_column_name("id") == "id"
        assert validate_column_name("user_id") == "user_id"

    def test_invalid(self) -> None:
        with pytest.raises(ValueError):
            validate_column_name("DROP TABLE")


@pytest.fixture()
def provider() -> tuple[SupabaseDatabaseProvider, MagicMock]:
    with patch("providers.database.supabase_provider.create_client") as mc:
        mock_client = MagicMock()
        mc.return_value = mock_client
        prv = SupabaseDatabaseProvider("http://localhost", "key")
        prv.client = mock_client
        return prv, mock_client


class TestCRUD:
    @pytest.mark.asyncio
    async def test_insert(self, provider: tuple) -> None:
        prv, mc = provider
        resp = MagicMock(data=[{"id": "1"}])
        mc.table.return_value.insert.return_value.execute.return_value = resp
        result = await prv.insert("users", {"name": "x"})
        assert result["id"] == "1"

    @pytest.mark.asyncio
    async def test_insert_bad_table(self, provider: tuple) -> None:
        prv, _ = provider
        with pytest.raises(ValueError):
            await prv.insert("evil_table", {})

    @pytest.mark.asyncio
    async def test_get(self, provider: tuple) -> None:
        prv, mc = provider
        resp = MagicMock(data=[{"id": "1"}])
        q = MagicMock()
        q.eq.return_value = q
        q.execute.return_value = resp
        mc.table.return_value.select.return_value = q
        rows = await prv.get("users", {"id": "1"})
        assert len(rows) == 1

    @pytest.mark.asyncio
    async def test_rpc(self, provider: tuple) -> None:
        prv, mc = provider
        resp = MagicMock(data={"ok": True})
        mc.rpc.return_value.execute.return_value = resp
        result = await prv.rpc("my_func", {"a": 1})
        assert result == {"ok": True}
