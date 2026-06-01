from unittest.mock import MagicMock, patch

import pytest

from providers.database.base import DatabaseError, NotFoundError
from providers.database.supabase_provider import (
    SupabaseDatabaseProvider,
    validate_column_name,
    validate_table_name,
)

# ---------------------------------------------------------------------------
# validate_column_name edge cases
# ---------------------------------------------------------------------------


def test_validate_column_name_none():
    with pytest.raises(DatabaseError):
        validate_column_name(None)  # type: ignore


def test_validate_column_name_empty():
    with pytest.raises(DatabaseError):
        validate_column_name("")


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


def test_validate_table_name_blocks_physiomni_tables_from_generic_provider():
    """PhysiOmni data must not be reachable through service-role generic DB tools."""
    physiomni_tables = [
        "physiomni_devices",
        "physiomni_telemetry",
        "physiomni_alerts",
        "physiomni_baselines",
    ]

    for table in physiomni_tables:
        with pytest.raises(DatabaseError, match="not in the allowed list"):
            validate_table_name(table)


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


# ---------------------------------------------------------------------------
# connect / disconnect
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_connect_success(provider):
    """connect() should succeed when client is set."""
    prv, _mock_client = provider
    # Should not raise
    await prv.connect()


@pytest.mark.asyncio
async def test_connect_no_client():
    """connect() should raise DatabaseError when client is None."""
    with patch("providers.database.supabase_provider.create_client"):
        prv = SupabaseDatabaseProvider("http://localhost", "key")
        prv.client = None  # type: ignore
        with pytest.raises(DatabaseError, match="not initialized"):
            await prv.connect()


@pytest.mark.asyncio
async def test_disconnect_is_noop(provider):
    """disconnect() is a no-op and must not raise."""
    prv, _mock_client = provider
    await prv.disconnect()  # Should complete without error


# ---------------------------------------------------------------------------
# insert edge cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_insert_empty_response_raises(provider):
    """insert() should raise DatabaseError when response.data is empty."""
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = []

    mock_table = MagicMock()
    mock_table.insert.return_value.execute.return_value = mock_response
    mock_client.table.return_value = mock_table

    with pytest.raises(DatabaseError, match="Insert failed"):
        await prv.insert("users", {"name": "test"})


@pytest.mark.asyncio
async def test_insert_generic_exception_wrapped(provider):
    """insert() should wrap non-DatabaseError exceptions."""
    prv, mock_client = provider

    mock_client.table.side_effect = RuntimeError("network failure")

    with pytest.raises(DatabaseError, match="Database insert failed"):
        await prv.insert("users", {"name": "test"})


# ---------------------------------------------------------------------------
# upsert
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_upsert_success_no_conflict_columns(provider):
    """upsert() works without conflict_columns."""
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = [{"id": "1"}]

    mock_query = MagicMock()
    mock_query.execute.return_value = mock_response
    mock_client.table.return_value.upsert.return_value = mock_query

    result = await prv.upsert("users", {"name": "test"})
    assert result["id"] == "1"


@pytest.mark.asyncio
async def test_upsert_success_with_conflict_columns(provider):
    """upsert() works with conflict_columns."""
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = [{"id": "1"}]

    mock_query = MagicMock()
    mock_query.execute.return_value = mock_response
    mock_client.table.return_value.upsert.return_value = mock_query

    result = await prv.upsert("users", {"name": "test"}, conflict_columns=["id"])
    assert result["id"] == "1"
    # on_conflict should have been passed to the upsert call
    call_kwargs = mock_client.table.return_value.upsert.call_args[1]
    assert "on_conflict" in call_kwargs
    assert call_kwargs["on_conflict"] == "id"


@pytest.mark.asyncio
async def test_upsert_invalid_table(provider):
    """upsert() raises DatabaseError for disallowed tables."""
    prv, _mock_client = provider
    with pytest.raises(DatabaseError, match="not in the allowed list"):
        await prv.upsert("evil_table", {"name": "x"})


@pytest.mark.asyncio
async def test_upsert_invalid_conflict_column(provider):
    """upsert() raises DatabaseError for invalid conflict column names."""
    prv, _mock_client = provider
    with pytest.raises(DatabaseError):
        await prv.upsert("users", {"name": "x"}, conflict_columns=["bad col"])


@pytest.mark.asyncio
async def test_upsert_empty_response_raises(provider):
    """upsert() raises DatabaseError when response.data is empty."""
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = []

    mock_query = MagicMock()
    mock_query.execute.return_value = mock_response
    mock_client.table.return_value.upsert.return_value = mock_query

    with pytest.raises(DatabaseError, match="Upsert failed"):
        await prv.upsert("users", {"name": "test"})


@pytest.mark.asyncio
async def test_upsert_generic_exception_wrapped(provider):
    """upsert() wraps non-DatabaseError exceptions."""
    prv, mock_client = provider
    mock_client.table.side_effect = RuntimeError("timeout")
    with pytest.raises(DatabaseError, match="Database upsert failed"):
        await prv.upsert("users", {"name": "test"})


# ---------------------------------------------------------------------------
# get edge cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_invalid_column_raises(provider):
    """get() raises DatabaseError for invalid column in query_params."""
    prv, _mock_client = provider
    with pytest.raises(DatabaseError):
        await prv.get("users", {"bad col": "1"})


@pytest.mark.asyncio
async def test_get_generic_exception_wrapped(provider):
    """get() wraps non-DatabaseError exceptions."""
    prv, mock_client = provider
    mock_client.table.side_effect = RuntimeError("boom")
    with pytest.raises(DatabaseError, match="Database get failed"):
        await prv.get("users", {"id": "1"})


# ---------------------------------------------------------------------------
# select edge cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_select_no_filters(provider):
    """select() works without filters, returns list."""
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = [{"id": "1"}]

    mock_table = MagicMock()
    mock_table.select.return_value.execute.return_value = mock_response
    mock_client.table.return_value = mock_table

    result = await prv.select("users")
    assert result == [{"id": "1"}]


@pytest.mark.asyncio
async def test_select_with_select_fields(provider):
    """select() passes select_fields to query."""
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = [{"id": "1"}]

    mock_table = MagicMock()
    mock_table.select.return_value.execute.return_value = mock_response
    mock_client.table.return_value = mock_table

    result = await prv.select("users", select_fields="id,name")
    assert result == [{"id": "1"}]
    mock_table.select.assert_called_with("id,name")


@pytest.mark.asyncio
async def test_select_empty_data_returns_empty_list(provider):
    """select() returns [] when response.data is None/empty."""
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = None

    mock_table = MagicMock()
    mock_table.select.return_value.execute.return_value = mock_response
    mock_client.table.return_value = mock_table

    result = await prv.select("users")
    assert result == []


@pytest.mark.asyncio
async def test_select_invalid_table(provider):
    """select() raises DatabaseError for disallowed tables."""
    prv, _mock_client = provider
    with pytest.raises(DatabaseError, match="not in the allowed list"):
        await prv.select("forbidden_table")


@pytest.mark.asyncio
async def test_select_generic_exception_wrapped(provider):
    """select() wraps non-DatabaseError exceptions."""
    prv, mock_client = provider
    mock_client.table.side_effect = RuntimeError("connection reset")
    with pytest.raises(DatabaseError, match="Database select failed"):
        await prv.select("users")


# ---------------------------------------------------------------------------
# select_one edge cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_select_one_success(provider):
    """select_one() returns first record when found."""
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = [{"id": "42", "name": "Alice"}]

    mock_query = MagicMock()
    mock_query.eq.return_value = mock_query
    mock_query.execute.return_value = mock_response
    mock_client.table.return_value.select.return_value = mock_query

    result = await prv.select_one("users", {"id": "42"})
    assert result["id"] == "42"
    assert result["name"] == "Alice"


# ---------------------------------------------------------------------------
# update edge cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_no_filters_raises(provider):
    """update() raises DatabaseError when filters is empty."""
    prv, _mock_client = provider
    with pytest.raises(DatabaseError, match="requires at least one filter"):
        await prv.update("users", {"name": "x"}, {})


@pytest.mark.asyncio
async def test_update_not_found_raises(provider):
    """update() raises NotFoundError when response.data is empty."""
    prv, mock_client = provider

    mock_response = MagicMock()
    mock_response.data = []

    mock_query = MagicMock()
    mock_query.eq.return_value = mock_query
    mock_query.execute.return_value = mock_response
    mock_client.table.return_value.update.return_value = mock_query

    with pytest.raises(NotFoundError):
        await prv.update("users", {"name": "new"}, {"id": "999"})


@pytest.mark.asyncio
async def test_update_invalid_table(provider):
    """update() raises DatabaseError for disallowed tables."""
    prv, _mock_client = provider
    with pytest.raises(DatabaseError):
        await prv.update("evil_table", {"name": "x"}, {"id": "1"})


@pytest.mark.asyncio
async def test_update_invalid_filter_column(provider):
    """update() raises DatabaseError for invalid filter column names."""
    prv, _mock_client = provider
    with pytest.raises(DatabaseError):
        await prv.update("users", {"name": "x"}, {"bad col": "1"})


@pytest.mark.asyncio
async def test_update_generic_exception_wrapped(provider):
    """update() wraps generic exceptions in DatabaseError."""
    prv, mock_client = provider
    mock_client.table.side_effect = RuntimeError("disk full")
    with pytest.raises(DatabaseError, match="Database update failed"):
        await prv.update("users", {"name": "x"}, {"id": "1"})


# ---------------------------------------------------------------------------
# delete edge cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_no_filters_raises(provider):
    """delete() raises DatabaseError when filters is empty."""
    prv, _mock_client = provider
    with pytest.raises(DatabaseError, match="requires at least one filter"):
        await prv.delete("users", {})


@pytest.mark.asyncio
async def test_delete_invalid_table(provider):
    """delete() raises DatabaseError for disallowed tables."""
    prv, _mock_client = provider
    with pytest.raises(DatabaseError, match="not in the allowed list"):
        await prv.delete("evil_table", {"id": "1"})


@pytest.mark.asyncio
async def test_delete_generic_exception_wrapped(provider):
    """delete() wraps non-DatabaseError exceptions in DatabaseError."""
    prv, mock_client = provider
    mock_client.table.side_effect = RuntimeError("network error")
    with pytest.raises(DatabaseError, match="Database delete failed"):
        await prv.delete("users", {"id": "1"})


@pytest.mark.asyncio
async def test_delete_invalid_filter_column(provider):
    """delete() raises DatabaseError for invalid filter column names."""
    prv, _mock_client = provider
    with pytest.raises(DatabaseError):
        await prv.delete("users", {"bad col": "1"})


# ---------------------------------------------------------------------------
# rpc edge cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rpc_exception_wrapped(provider):
    """rpc() wraps exceptions in DatabaseError."""
    prv, mock_client = provider
    mock_client.rpc.side_effect = RuntimeError("RPC connection failed")
    with pytest.raises(DatabaseError, match="RPC call to my_func failed"):
        await prv.rpc("my_func", {"arg": "val"})
