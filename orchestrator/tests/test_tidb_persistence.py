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


class TestTiDBPersistenceModeOff:
    """Tests when VECTOR_PERSISTENCE_MODE != 'tidb'"""

    def test_mode_off_no_op(self):
        """When mode is off, operations should no-op"""
        with patch.dict(os.environ, {"VECTOR_PERSISTENCE_MODE": "off"}, clear=False):
            store = TiDBVectorPersistence()
            assert not store.enabled

            # Should not raise
            store.put_embedding("test-id", [0.1, 0.2], {"key": "value"})
            result = store.get_embedding("test-id")
            assert result is None


class TestTiDBPersistenceModeOn:
    """Tests when VECTOR_PERSISTENCE_MODE == 'tidb'"""

    def test_mode_on_missing_deps(self):
        """When mode is on but mysql.connector missing, should error"""
        with (
            patch.dict(
                os.environ,
                {
                    "VECTOR_PERSISTENCE_MODE": "tidb",
                    "TIDB_HOST": "test.tidb.io",
                    "TIDB_USER": "test",
                    "TIDB_PASSWORD": "test",
                    "TIDB_DATABASE": "test",
                },
                clear=False,
            ),
            patch("infrastructure.tidb_persistence.mysql", None),
            pytest.raises(RuntimeError, match="mysql-connector-python required"),
        ):
            TiDBVectorPersistence()

    def test_mode_on_incomplete_config(self):
        """When mode is on but config incomplete, should error"""
        with (
            patch.dict(os.environ, {"VECTOR_PERSISTENCE_MODE": "tidb"}, clear=False),
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
            "metadata": "{'key': 'value'}",
        }
        mock_conn.cursor.return_value = mock_cursor
        mock_conn.is_connected.return_value = True
        mock_mysql.connector.connect.return_value = mock_conn

        with patch.dict(
            os.environ,
            {
                "VECTOR_PERSISTENCE_MODE": "tidb",
                "TIDB_HOST": "test.tidb.io",
                "TIDB_USER": "test",
                "TIDB_PASSWORD": "test",
                "TIDB_DATABASE": "test",
                "TIDB_CA_PATH": "/path/to/ca.pem",
            },
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
        with patch.dict(os.environ, {"VECTOR_PERSISTENCE_MODE": "off"}, clear=False):
            store1 = get_tidb_store()
            store2 = get_tidb_store()
            assert store1 is store2
