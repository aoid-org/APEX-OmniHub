"""
Contract tests for DatabaseProvider interface compliance.

Ensures all provider implementations strictly follow the DatabaseProvider protocol.
"""

import os
from unittest.mock import MagicMock, patch

import pytest

from providers.database.base import DatabaseError
from providers.database.factory import (
    DatabaseFactory,
    get_database_provider,
    get_vector_provider,
    reset_database_provider,
    reset_vector_provider,
)
from providers.database.supabase_provider import SupabaseDatabaseProvider


class TestDatabaseProviderContract:
    """Test DatabaseProvider interface compliance."""

    @pytest.fixture
    def mock_supabase_client(self):
        """Create mock Supabase client."""
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_client.table.return_value = mock_table
        return mock_client, mock_table

    @pytest.fixture
    def provider(self, mock_supabase_client):
        """Create provider instance with mocked client."""
        with patch("providers.database.supabase_provider.create_client"):
            provider = SupabaseDatabaseProvider(url="https://test.example.com", key="test-key")
            provider.client = mock_supabase_client[0]
            return provider

    @pytest.mark.asyncio
    async def test_delete_returns_int(self, provider, mock_supabase_client):
        """delete() must return int (count of deleted rows), not bool."""
        _, mock_table = mock_supabase_client

        # Mock successful deletion of 2 rows
        mock_response = MagicMock()
        mock_response.data = [{"id": 1}, {"id": 2}]
        mock_table.delete.return_value.eq.return_value.execute.return_value = mock_response

        result = await provider.delete("audit_logs", {"workflow_id": "test"})

        assert isinstance(result, int), "delete() must return int"
        assert result == 2, "delete() should return count of deleted rows"

    @pytest.mark.asyncio
    async def test_delete_returns_zero_when_no_rows_deleted(self, provider, mock_supabase_client):
        """delete() must return 0 when no rows match."""
        _, mock_table = mock_supabase_client

        # Mock no rows deleted
        mock_response = MagicMock()
        mock_response.data = []
        mock_table.delete.return_value.eq.return_value.execute.return_value = mock_response

        result = await provider.delete("audit_logs", {"id": "nonexistent"})

        assert result == 0, "delete() should return 0 when no rows deleted"

    @pytest.mark.asyncio
    async def test_select_method_exists(self, provider):
        """select() method must exist and match protocol signature."""
        assert hasattr(provider, "select"), "Provider must have select() method"

        # Check method signature
        import inspect

        sig = inspect.signature(provider.select)
        params = list(sig.parameters.keys())

        assert "table" in params, "select() must have 'table' parameter"
        assert "filters" in params, "select() must have 'filters' parameter"
        assert "select_fields" in params, "select() must have 'select_fields' parameter"

    @pytest.mark.asyncio
    async def test_select_returns_list(self, provider, mock_supabase_client):
        """select() must return list of dicts."""
        _, mock_table = mock_supabase_client

        mock_response = MagicMock()
        mock_response.data = [{"id": 1, "name": "test"}]
        mock_table.select.return_value.eq.return_value.execute.return_value = mock_response

        result = await provider.select("audit_logs", filters={"id": 1})

        assert isinstance(result, list), "select() must return list"
        assert len(result) == 1
        assert result[0]["name"] == "test"

    @pytest.mark.asyncio
    async def test_disallowed_table_raises_database_error(self, provider):
        """Accessing disallowed table must raise DatabaseError."""
        with pytest.raises(DatabaseError) as exc_info:
            await provider.select("forbidden_table", filters={})

        assert "not in the allowed list" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_insert_validates_table_allowlist(self, provider):
        """insert() must validate table against allowlist."""
        with pytest.raises(DatabaseError) as exc_info:
            await provider.insert("forbidden_table", {"data": "test"})

        assert "not in the allowed list" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_man_tasks_table_allowed(self, provider, mock_supabase_client):
        """man_tasks table must be in allowlist."""
        _, mock_table = mock_supabase_client

        mock_response = MagicMock()
        mock_response.data = [{"id": 1}]
        mock_table.select.return_value.execute.return_value = mock_response

        # Should not raise DatabaseError
        result = await provider.select("man_tasks")
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_man_notifications_table_allowed(self, provider, mock_supabase_client):
        """man_notifications table must be in allowlist."""
        _, mock_table = mock_supabase_client

        mock_response = MagicMock()
        mock_response.data = []
        mock_table.select.return_value.execute.return_value = mock_response

        # Should not raise DatabaseError
        result = await provider.select("man_notifications")
        assert isinstance(result, list)


class TestBackwardsCompatibility:
    """Test backwards compatibility alias."""

    def test_supabase_provider_alias_exists(self):
        """SupabaseProvider alias must exist for backwards compatibility."""
        from providers.database.supabase_provider import SupabaseProvider

        assert SupabaseProvider is SupabaseDatabaseProvider, (
            "SupabaseProvider should be an alias for SupabaseDatabaseProvider"
        )


# ---------------------------------------------------------------------------
# DatabaseFactory tests
# ---------------------------------------------------------------------------


class TestDatabaseFactory:
    """Tests for DatabaseFactory.get_provider()"""

    def test_get_provider_tidb_raises(self):
        """Setting DATABASE_PROVIDER=tidb must raise ValueError."""
        with patch.dict(os.environ, {"DATABASE_PROVIDER": "tidb"}, clear=False):
            with pytest.raises(ValueError, match="FATAL: DATABASE_PROVIDER=tidb is not allowed"):
                DatabaseFactory.get_provider()

    def test_get_provider_unknown_raises(self):
        """Unknown DATABASE_PROVIDER values must raise ValueError."""
        with patch.dict(os.environ, {"DATABASE_PROVIDER": "oracle"}, clear=False):
            with pytest.raises(ValueError, match="Unknown DATABASE_PROVIDER"):
                DatabaseFactory.get_provider()

    def test_get_provider_supabase_missing_url(self):
        """Supabase provider missing SUPABASE_URL raises ValueError."""
        env = {
            "DATABASE_PROVIDER": "supabase",
            "SUPABASE_SERVICE_ROLE_KEY": "key",
        }
        with patch.dict(os.environ, env, clear=False):
            # Ensure SUPABASE_URL is absent
            with patch.dict(os.environ, {}, clear=False):
                os.environ.pop("SUPABASE_URL", None)
                with pytest.raises(ValueError, match="SUPABASE_URL"):
                    DatabaseFactory.get_provider()

    def test_get_provider_supabase_missing_key(self):
        """Supabase provider missing SUPABASE_SERVICE_ROLE_KEY raises ValueError."""
        env = {
            "DATABASE_PROVIDER": "supabase",
            "SUPABASE_URL": "https://example.supabase.co",
        }
        with patch.dict(os.environ, env, clear=False):
            os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)
            with pytest.raises(ValueError, match="SUPABASE_SERVICE_ROLE_KEY"):
                DatabaseFactory.get_provider()

    def test_get_provider_supabase_success(self):
        """Supabase provider is created when env vars are set."""
        env = {
            "DATABASE_PROVIDER": "supabase",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        }
        with patch.dict(os.environ, env, clear=False):
            with patch("providers.database.supabase_provider.create_client") as mock_create:
                mock_create.return_value = MagicMock()
                provider = DatabaseFactory.get_provider()
                assert isinstance(provider, SupabaseDatabaseProvider)

    def test_get_provider_default_is_supabase(self):
        """Default DATABASE_PROVIDER is 'supabase' when env var not set."""
        env = {
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        }
        env_without_provider = {k: v for k, v in os.environ.items() if k != "DATABASE_PROVIDER"}
        env_without_provider.update(env)
        with patch.dict(os.environ, env_without_provider, clear=True):
            with patch("providers.database.supabase_provider.create_client") as mock_create:
                mock_create.return_value = MagicMock()
                provider = DatabaseFactory.get_provider()
                assert isinstance(provider, SupabaseDatabaseProvider)


# ---------------------------------------------------------------------------
# get_database_provider singleton tests
# ---------------------------------------------------------------------------


class TestGetDatabaseProviderSingleton:
    """Test the get_database_provider() singleton behaviour."""

    def setup_method(self):
        reset_database_provider()

    def test_singleton_returns_same_instance(self):
        """get_database_provider() returns the same instance on repeated calls."""
        env = {
            "DATABASE_PROVIDER": "supabase",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        }
        with patch.dict(os.environ, env, clear=False):
            with patch("providers.database.supabase_provider.create_client") as mock_create:
                mock_create.return_value = MagicMock()
                p1 = get_database_provider()
                p2 = get_database_provider()
                assert p1 is p2

    def test_reset_clears_singleton(self):
        """reset_database_provider() allows a new instance to be created."""
        env = {
            "DATABASE_PROVIDER": "supabase",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "test-key",
        }
        with patch.dict(os.environ, env, clear=False):
            with patch("providers.database.supabase_provider.create_client") as mock_create:
                mock_create.return_value = MagicMock()
                p1 = get_database_provider()
                reset_database_provider()
                p2 = get_database_provider()
                assert p1 is not p2


# ---------------------------------------------------------------------------
# get_vector_provider tests
# ---------------------------------------------------------------------------


class TestGetVectorProvider:
    """Tests for get_vector_provider() and reset_vector_provider()."""

    def setup_method(self):
        reset_vector_provider()

    def test_vector_provider_none_when_unset(self):
        """Returns None when VECTOR_PROVIDER is not set."""
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("VECTOR_PROVIDER", None)
            result = get_vector_provider()
            assert result is None

    def test_vector_provider_none_when_empty(self):
        """Returns None when VECTOR_PROVIDER is empty string."""
        with patch.dict(os.environ, {"VECTOR_PROVIDER": ""}, clear=False):
            result = get_vector_provider()
            assert result is None

    def test_vector_provider_unknown_raises(self):
        """Raises ValueError for unknown VECTOR_PROVIDER values."""
        with patch.dict(os.environ, {"VECTOR_PROVIDER": "pinecone"}, clear=False):
            with pytest.raises(ValueError, match="Unknown VECTOR_PROVIDER"):
                get_vector_provider()

    def test_vector_provider_tidb_returns_instance(self):
        """Returns TiDBVectorPersistence instance when VECTOR_PROVIDER=tidb."""
        mock_instance = MagicMock()
        with patch.dict(os.environ, {"VECTOR_PROVIDER": "tidb"}, clear=False):
            with patch.dict(
                "sys.modules",
                {
                    "infrastructure.tidb_persistence": MagicMock(
                        TiDBVectorPersistence=lambda: mock_instance
                    )
                },
            ):
                result = get_vector_provider()
                assert result is mock_instance

    def test_vector_provider_singleton(self):
        """get_vector_provider() returns same instance on repeated calls."""
        with patch.dict(os.environ, {"VECTOR_PROVIDER": "tidb"}, clear=False):
            mock_instance = MagicMock()
            with patch.dict(
                "sys.modules",
                {
                    "infrastructure.tidb_persistence": MagicMock(
                        TiDBVectorPersistence=lambda: mock_instance
                    )
                },
            ):
                r1 = get_vector_provider()
                r2 = get_vector_provider()
                assert r1 is r2

    def test_reset_vector_provider_clears_singleton(self):
        """reset_vector_provider() allows new instance to be created."""
        instances = [MagicMock(), MagicMock()]
        call_count = [0]

        def make_instance():
            inst = instances[call_count[0]]
            call_count[0] += 1
            return inst

        with patch.dict(os.environ, {"VECTOR_PROVIDER": "tidb"}, clear=False):
            with patch.dict(
                "sys.modules",
                {"infrastructure.tidb_persistence": MagicMock(TiDBVectorPersistence=make_instance)},
            ):
                r1 = get_vector_provider()
                reset_vector_provider()
                r2 = get_vector_provider()
                assert r1 is not r2
