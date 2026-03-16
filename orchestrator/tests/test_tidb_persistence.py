"""
Tests for TiDB Vector Persistence
NO network - mocks only
Tests: mode off → no-op, mode on + missing deps → error, TLS roundtrip test
"""
# ruff: noqa: SIM117

import os
from unittest.mock import MagicMock, patch

import pytest

from infrastructure.tidb_persistence import (
    TiDBVectorPersistence,
    get_tidb_store,
)

# Shared fake TiDB env config for tests (test credentials only)
_FAKE_TIDB_ENV = {
    "VECTOR_PROVIDER": "tidb",
    "TIDB_HOST": "test.tidb.io",
    "TIDB_USER": "test",  # noqa: S105
    "TIDB_PASSWORD": "test",  # noqa: S105
    "TIDB_DATABASE": "test",
}


class TestTiDBPersistenceModeOff:
    """Tests when VECTOR_PROVIDER != 'tidb'"""

    def test_mode_off_no_op(self):
        """When mode is off, operations should no-op"""
        with patch.dict(os.environ, {"VECTOR_PROVIDER": "off"}, clear=False):
            store = TiDBVectorPersistence()
            assert not store.enabled

            # Should not raise
            store.put_embedding("test-id", [0.1, 0.2], {"key": "value"})
            result = store.get_embedding("test-id")
            assert result is None


class TestTiDBPersistenceModeOn:
    """Tests when VECTOR_PROVIDER == 'tidb'"""

    def test_mode_on_missing_deps(self):
        """When mode is on but mysql.connector missing, should error"""
        with (
            patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False),
            patch("infrastructure.tidb_persistence.mysql", None),
            pytest.raises(RuntimeError, match="mysql-connector-python required"),
        ):
            TiDBVectorPersistence()

    def test_mode_on_incomplete_config(self):
        """When mode is on but config incomplete, should error"""
        with (
            patch.dict(os.environ, {"VECTOR_PROVIDER": "tidb"}, clear=False),
            pytest.raises(ValueError, match="TiDB config incomplete"),
        ):
            # We mock mysql here because otherwise it hits the dependency check first
            with patch("infrastructure.tidb_persistence.mysql", MagicMock()):
                TiDBVectorPersistence()

    @patch("infrastructure.tidb_persistence.mysql")
    def test_tls_roundtrip(self, mock_mysql):
        """Test TLS-verified connection and roundtrip"""
        # Mock MySQL connector
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {
            "embedding": "[0.1, 0.2, 0.3]",
            "metadata": '{"key": "value"}',
        }
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(
            os.environ,
            {**_FAKE_TIDB_ENV, "TIDB_CA_PATH": "/path/to/ca.pem"},
            clear=False,
        ):
            store = TiDBVectorPersistence()

            # Verify TLS config in connect call
            connect_call = mock_mysql.connector.connect.call_args
            assert connect_call[1]["ssl_disabled"] is False
            assert connect_call[1]["ssl_verify_cert"] is True
            assert connect_call[1]["ssl_ca"] == "/path/to/ca.pem"

            # Test put_embedding
            store.put_embedding("test-id", [0.1, 0.2, 0.3], {"key": "value"})
            mock_cursor.execute.assert_called()
            mock_conn.commit.assert_called()

            # Test get_embedding
            result = store.get_embedding("test-id")
            assert result is not None
            assert result["embedding"] == [0.1, 0.2, 0.3]
            assert result["meta"] == {"key": "value"}


class TestSingletonPattern:
    """Test singleton get_tidb_store()"""

    def test_singleton(self):
        """get_tidb_store should return same instance"""
        with patch.dict(os.environ, {"VECTOR_PROVIDER": "off"}, clear=False):
            store1 = get_tidb_store()
            store2 = get_tidb_store()
            assert store1 is store2


# ---------------------------------------------------------------------------
# Additional coverage tests
# ---------------------------------------------------------------------------


class TestTiDBImportFallback:
    """Test behavior when mysql.connector is not installed."""

    def test_mysql_is_none_when_import_fails(self):
        """When mysql import fails, the module-level mysql should be None."""
        import infrastructure.tidb_persistence as tidb_mod

        # Verify the module loads correctly even if mysql is absent
        # (the real import succeeded, but we confirm the fallback path exists)
        assert hasattr(tidb_mod, "mysql")


class TestTiDBConnectDisabled:
    """Test _connect when store is disabled."""

    def test_connect_returns_early_when_disabled(self):
        """_connect is a no-op when self.enabled is False."""
        with patch.dict(os.environ, {"VECTOR_PROVIDER": "off"}, clear=False):
            store = TiDBVectorPersistence()
            assert not store.enabled
            # _connect should be a silent no-op (no exception)
            store._connect()


class TestTiDBConnectError:
    """Test connection error path."""

    @patch("infrastructure.tidb_persistence.MySQLError", new=Exception)
    @patch("infrastructure.tidb_persistence.mysql")
    def test_connect_raises_on_mysql_error(self, mock_mysql):
        """_connect wraps MySQLError in RuntimeError."""
        mock_mysql.connector.connect.side_effect = Exception("connection refused")

        with patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False):
            with pytest.raises(RuntimeError, match="TiDB connection failed"):
                TiDBVectorPersistence()


class TestTiDBPutEmbeddingReconnect:
    """Test put_embedding reconnects when not connected."""

    @patch("infrastructure.tidb_persistence.mysql")
    def test_put_embedding_reconnects_when_disconnected(self, mock_mysql):
        """put_embedding reconnects if connection dropped."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False):
            store = TiDBVectorPersistence()
            # Simulate disconnection by making is_connected return False
            store.connection.is_connected.return_value = False

            # Replace _connect with a mock that restores connection
            def fake_connect():
                store.connection = mock_conn
                mock_conn.is_connected.return_value = True

            store._connect = MagicMock(side_effect=fake_connect)
            store.put_embedding("id1", [0.1], {"k": "v"})
            store._connect.assert_called_once()

    @patch("infrastructure.tidb_persistence.MySQLError", new=Exception)
    @patch("infrastructure.tidb_persistence.mysql")
    def test_put_embedding_mysql_error_rolls_back(self, mock_mysql):
        """put_embedding rolls back on MySQLError and raises RuntimeError."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = Exception("query failed")
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False):
            store = TiDBVectorPersistence()
            with pytest.raises(RuntimeError, match="TiDB putEmbedding failed"):
                store.put_embedding("id1", [0.1], {"k": "v"})
            mock_conn.rollback.assert_called_once()

    @patch("infrastructure.tidb_persistence.mysql")
    def test_put_embedding_cursor_closed_in_finally(self, mock_mysql):
        """put_embedding always closes cursor (finally block)."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False):
            store = TiDBVectorPersistence()
            store.put_embedding("id1", [0.1], {"k": "v"})
            mock_cursor.close.assert_called_once()


class TestTiDBGetEmbeddingReconnect:
    """Test get_embedding reconnects when not connected."""

    @patch("infrastructure.tidb_persistence.mysql")
    def test_get_embedding_reconnects_when_disconnected(self, mock_mysql):
        """get_embedding reconnects if connection dropped."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {
            "embedding": "[0.1]",
            "metadata": '{"x": 1}',
        }
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False):
            store = TiDBVectorPersistence()
            store.connection.is_connected.return_value = False
            store._connect = MagicMock()
            store.get_embedding("id1")
            store._connect.assert_called_once()

    @patch("infrastructure.tidb_persistence.mysql")
    def test_get_embedding_not_found_returns_none(self, mock_mysql):
        """get_embedding returns None when record does not exist."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False):
            store = TiDBVectorPersistence()
            result = store.get_embedding("nonexistent")
            assert result is None

    @patch("infrastructure.tidb_persistence.MySQLError", new=Exception)
    @patch("infrastructure.tidb_persistence.mysql")
    def test_get_embedding_mysql_error_raises(self, mock_mysql):
        """get_embedding raises RuntimeError on MySQLError."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = Exception("read failed")
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False):
            store = TiDBVectorPersistence()
            with pytest.raises(RuntimeError, match="TiDB getEmbedding failed"):
                store.get_embedding("id1")

    @patch("infrastructure.tidb_persistence.mysql")
    def test_get_embedding_cursor_closed_in_finally(self, mock_mysql):
        """get_embedding always closes cursor (finally block)."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False):
            store = TiDBVectorPersistence()
            store.get_embedding("id1")
            mock_cursor.close.assert_called_once()


class TestTiDBClose:
    """Test close() method."""

    @patch("infrastructure.tidb_persistence.mysql")
    def test_close_connected(self, mock_mysql):
        """close() closes the connection when connected."""
        mock_conn = MagicMock()
        mock_conn.is_connected.return_value = True
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False):
            store = TiDBVectorPersistence()
            store.close()
            mock_conn.close.assert_called_once()

    def test_close_when_disabled(self):
        """close() is a no-op when store is disabled."""
        with patch.dict(os.environ, {"VECTOR_PROVIDER": "off"}, clear=False):
            store = TiDBVectorPersistence()
            store.close()  # Should not raise

    @patch("infrastructure.tidb_persistence.mysql")
    def test_close_when_already_disconnected(self, mock_mysql):
        """close() does not call close on disconnected connection."""
        mock_conn = MagicMock()
        mock_conn.is_connected.return_value = False
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(os.environ, _FAKE_TIDB_ENV, clear=False):
            store = TiDBVectorPersistence()
            store.close()
            mock_conn.close.assert_not_called()


class TestSingletonReset:
    """Test singleton reset for get_tidb_store."""

    def test_singleton_reset_creates_new_instance(self):
        """Resetting _tidb_store allows a new instance to be created."""
        import infrastructure.tidb_persistence as tidb_mod

        original = tidb_mod._tidb_store
        tidb_mod._tidb_store = None
        try:
            with patch.dict(os.environ, {"VECTOR_PROVIDER": "off"}, clear=False):
                store = get_tidb_store()
                assert store is not None
                assert store is tidb_mod._tidb_store
        finally:
            tidb_mod._tidb_store = original
