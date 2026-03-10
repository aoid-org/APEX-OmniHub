import pytest
from unittest.mock import MagicMock, patch
import os

# We patch mysql.connector in the module to avoid module load errors
import infrastructure.tidb_persistence as tidb_module


@pytest.fixture
def mock_mysql():
    with patch("infrastructure.tidb_persistence.mysql") as mock:
        mock_conn = MagicMock()
        mock.connector.connect.return_value = mock_conn
        yield mock_conn


@pytest.fixture
def tidb_env():
    with patch.dict(
        os.environ,
        {
            "VECTOR_PROVIDER": "tidb",
            "TIDB_HOST": "localhost",
            "TIDB_PORT": "4000",
            "TIDB_USER": "root",
            "TIDB_PASSWORD": "pwd",
            "TIDB_DATABASE": "test",
            "TIDB_CA_PATH": "/path/to/ca",
        },
    ):
        yield


def test_tidb_disabled():
    with patch.dict(os.environ, {"VECTOR_PROVIDER": "pinecone"}):
        store = tidb_module.TiDBVectorPersistence()
        assert store.enabled is False

        # These should no-op
        store.put_embedding("1", [0.1], {})
        assert store.get_embedding("1") is None


def test_tidb_missing_config():
    with patch.dict(os.environ, {"VECTOR_PROVIDER": "tidb", "TIDB_HOST": ""}):
        with pytest.raises(ValueError):
            tidb_module.TiDBVectorPersistence()


def test_tidb_connect(tidb_env, mock_mysql):
    store = tidb_module.TiDBVectorPersistence()

    assert store.enabled is True
    assert store.connection == mock_mysql

    # Verify connect args
    tidb_module.mysql.connector.connect.assert_called_once()
    kwargs = tidb_module.mysql.connector.connect.call_args[1]
    assert kwargs["host"] == "localhost"
    assert kwargs["ssl_ca"] == "/path/to/ca"


def test_tidb_put_embedding(tidb_env, mock_mysql):
    store = tidb_module.TiDBVectorPersistence()

    mock_cursor = MagicMock()
    mock_mysql.cursor.return_value = mock_cursor
    mock_mysql.is_connected.return_value = True

    store.put_embedding("emb-1", [0.1, 0.2], {"meta": "data"})

    mock_cursor.execute.assert_called_once()
    args = mock_cursor.execute.call_args[0]
    assert "REPLACE INTO" in args[0]
    assert args[1][0] == "emb-1"

    mock_mysql.commit.assert_called_once()
    mock_cursor.close.assert_called_once()


def test_tidb_put_embedding_error(tidb_env, mock_mysql):
    store = tidb_module.TiDBVectorPersistence()

    mock_cursor = MagicMock()
    mock_cursor.execute.side_effect = tidb_module.MySQLError("DB error")
    mock_mysql.cursor.return_value = mock_cursor
    mock_mysql.is_connected.return_value = True

    with pytest.raises(RuntimeError):
        store.put_embedding("emb-1", [0.1], {})

    mock_mysql.rollback.assert_called_once()
    mock_cursor.close.assert_called_once()


def test_tidb_get_embedding(tidb_env, mock_mysql):
    store = tidb_module.TiDBVectorPersistence()

    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {"embedding": "[0.1, 0.2]", "metadata": "{'meta': 'data'}"}
    mock_mysql.cursor.return_value = mock_cursor
    mock_mysql.is_connected.return_value = True

    result = store.get_embedding("emb-1")

    assert result is not None
    assert result["embedding"] == [0.1, 0.2]
    assert result["meta"] == {"meta": "data"}


def test_tidb_get_embedding_not_found(tidb_env, mock_mysql):
    store = tidb_module.TiDBVectorPersistence()

    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = None
    mock_mysql.cursor.return_value = mock_cursor
    mock_mysql.is_connected.return_value = True

    result = store.get_embedding("emb-1")
    assert result is None
