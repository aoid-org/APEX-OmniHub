import pytest
from unittest.mock import MagicMock, patch

from providers.database.supabase_provider import (
    validate_table_name,
    validate_column_name,
    SupabaseDatabaseProvider,
)
from providers.database.base import DatabaseError, NotFoundError


def test_validate_table_name_success():
    assert validate_table_name("users") == "users"
    assert validate_table_name(" WORKFLOWS ") == "workflows"
    assert validate_table_name("agent_runs") == "agent_runs"


def test_validate_table_name_failure():
    with pytest.raises(DatabaseError):
        validate_table_name("invalid_table")
    with pytest.raises(DatabaseError):
        validate_table_name("")
    with pytest.raises(DatabaseError):
        validate_table_name(None)  # type: ignore


def test_validate_column_name_success():
    assert validate_column_name("id") == "id"
    assert validate_column_name("user_id") == "user_id"
    assert validate_column_name("camelCase") == "camelCase"


def test_validate_column_name_failure():
    with pytest.raises(DatabaseError):
        validate_column_name("invalid column")
    with pytest.raises(DatabaseError):
        validate_column_name("drop table")
    with pytest.raises(DatabaseError):
        validate_column_name("123col")


@pytest.fixture
def provider():
    with patch("providers.database.supabase_provider.create_client") as mock_create:
        mock_client = MagicMock()
        mock_create.return_value = mock_client

        prv = SupabaseDatabaseProvider("http://localhost", "key")
        prv.client = mock_client
        return prv, mock_client


@pytest.mark.asyncio
async def test_insert_success(provider):
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = [{"id": "1", "name": "test"}]

    mock_table = MagicMock()
    mock_table.insert.return_value.execute.return_value = mock_response
    mock_client.table.return_value = mock_table

    result = await prv.insert("users", {"name": "test"})
    assert result["id"] == "1"
    mock_client.table.assert_called_with("users")


@pytest.mark.asyncio
async def test_insert_invalid_table(provider):
    prv, _ = provider

    with pytest.raises(DatabaseError):
        await prv.insert("hacker_table", {})


@pytest.mark.asyncio
async def test_get_success(provider):
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = [{"id": "1", "name": "test"}]

    mock_query = MagicMock()
    mock_query.eq.return_value = mock_query
    mock_query.execute.return_value = mock_response

    mock_client.table.return_value.select.return_value = mock_query

    result = await prv.get("users", {"id": "1"})
    assert len(result) == 1
    assert result[0]["name"] == "test"
    mock_query.eq.assert_called_with("id", "1")


@pytest.mark.asyncio
async def test_select_one_not_found(provider):
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = []

    mock_query = MagicMock()
    mock_query.eq.return_value = mock_query
    mock_query.execute.return_value = mock_response

    mock_client.table.return_value.select.return_value = mock_query

    with pytest.raises(NotFoundError):
        await prv.select_one("users", {"id": "1"})


@pytest.mark.asyncio
async def test_update_success(provider):
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = [{"id": "1"}]

    mock_query = MagicMock()
    mock_query.eq.return_value = mock_query
    mock_query.execute.return_value = mock_response

    mock_client.table.return_value.update.return_value = mock_query

    result = await prv.update("users", {"name": "new"}, {"id": "1"})
    assert result["id"] == "1"


@pytest.mark.asyncio
async def test_delete_success(provider):
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = [{"id": "1"}]

    mock_query = MagicMock()
    mock_query.eq.return_value = mock_query
    mock_query.execute.return_value = mock_response

    mock_client.table.return_value.delete.return_value = mock_query

    result = await prv.delete("users", {"id": "1"})
    assert result == 1


@pytest.mark.asyncio
async def test_rpc_success(provider):
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = {"result": "ok"}
    mock_client.rpc.return_value.execute.return_value = mock_response

    result = await prv.rpc("my_func", {"arg": "val"})
    assert result == {"result": "ok"}
    mock_client.rpc.assert_called_with("my_func", {"arg": "val"})
