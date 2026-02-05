"""
TiDB Vector Persistence Module
SOVEREIGN DATA PLANE INTEGRATION - Phase 4
Optional persistence hook for embeddings
Requires TLS verification, only enabled if VECTOR_PERSISTENCE_MODE == "tidb"
"""

import os
from typing import Any

# TLS enforcement - MySQL Connector/Python preferred for TiDB
try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
except ImportError:
    mysql = None  # type: ignore
    MySQLError = Exception  # type: ignore


class TiDBVectorPersistence:
    """
    TiDB Vector Persistence Store
    - Enforces TLS with CA verification
    - Only active if VECTOR_PERSISTENCE_MODE == "tidb"
    - No-op if disabled or dependencies missing
    """

    def __init__(self):
        self.enabled = os.getenv("VECTOR_PERSISTENCE_MODE") == "tidb"
        self.connection = None

        if self.enabled:
            if mysql is None:
                raise RuntimeError(
                    "mysql-connector-python required for TiDB persistence. "
                    "Install with: pip install mysql-connector-python"
                )

            # Validate required config
            self.host = os.getenv("TIDB_HOST")
            self.port = int(os.getenv("TIDB_PORT", "4000"))
            self.user = os.getenv("TIDB_USER")
            self.password = os.getenv("TIDB_PASSWORD")
            self.database = os.getenv("TIDB_DATABASE")
            self.ca_path = os.getenv("TIDB_CA_PATH")

            if not all([self.host, self.user, self.password, self.database]):
                raise ValueError(
                    "TiDB config incomplete: TIDB_HOST, TIDB_USER, "
                    "TIDB_PASSWORD, TIDB_DATABASE required"
                )

            # TLS required for enterprise-grade
            self._connect()

    def _connect(self) -> None:
        """Establish TLS-verified connection to TiDB"""
        if not self.enabled:
            return

        ssl_config = {
            "ssl_verify_cert": True,
            "ssl_verify_identity": True,
        }

        if self.ca_path:
            ssl_config["ssl_ca"] = self.ca_path

        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                ssl_disabled=False,
                **ssl_config,
            )
        except MySQLError as e:
            raise RuntimeError(f"TiDB connection failed: {e}") from e

    def put_embedding(
        self, embedding_id: str, embedding: list[float], metadata: dict[str, Any]
    ) -> None:
        """
        Store embedding vector with metadata
        Idempotent: REPLACE INTO ensures update if exists
        """
        if not self.enabled:
            return

        if not self.connection or not self.connection.is_connected():
            self._connect()

        cursor = self.connection.cursor()
        try:
            # REPLACE INTO = idempotent upsert
            cursor.execute(
                """
                REPLACE INTO vector_embeddings (id, embedding, metadata, updated_at)
                VALUES (%s, %s, %s, NOW())
                """,
                (embedding_id, str(embedding), str(metadata)),
            )
            self.connection.commit()
        except MySQLError as e:
            self.connection.rollback()
            raise RuntimeError(f"TiDB putEmbedding failed: {e}") from e
        finally:
            cursor.close()

    def get_embedding(self, embedding_id: str) -> dict[str, Any] | None:
        """
        Retrieve embedding by ID
        Returns None if not found
        """
        if not self.enabled:
            return None

        if not self.connection or not self.connection.is_connected():
            self._connect()

        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT embedding, metadata FROM vector_embeddings WHERE id = %s",
                (embedding_id,),
            )
            result = cursor.fetchone()
            if result:
                # Parse embedding string back to list
                import ast

                return {
                    "embedding": ast.literal_eval(result["embedding"]),
                    "meta": ast.literal_eval(result["metadata"]),
                }
            return None
        except MySQLError as e:
            raise RuntimeError(f"TiDB getEmbedding failed: {e}") from e
        finally:
            cursor.close()

    def close(self) -> None:
        """Cleanup connection"""
        if self.connection and self.connection.is_connected():
            self.connection.close()


# Singleton instance
_tidb_store: TiDBVectorPersistence | None = None


def get_tidb_store() -> TiDBVectorPersistence:
    """Get or create TiDB store singleton"""
    global _tidb_store
    if _tidb_store is None:
        _tidb_store = TiDBVectorPersistence()
    return _tidb_store
