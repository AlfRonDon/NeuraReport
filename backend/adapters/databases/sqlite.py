"""SQLite database adapter implementation."""

from __future__ import annotations

import logging
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, List, Optional, Sequence

from backend.domain.connections import ConnectionTest, SchemaInfo, TableInfo
from .base import DataSource, QueryResult, SchemaDiscovery

logger = logging.getLogger("neura.adapters.sqlite")


class SQLiteSchemaDiscovery(SchemaDiscovery):
    """Schema discovery for SQLite databases."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._conn = connection

    def discover_tables(self) -> List[TableInfo]:
        """Discover all tables in the database."""
        cursor = self._conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        tables = []
        for (table_name,) in cursor.fetchall():
            columns = self.discover_columns(table_name)
            row_count = self._get_row_count(table_name)
            pk = self._get_primary_key(table_name)
            tables.append(
                TableInfo(
                    name=table_name,
                    columns=columns,
                    row_count=row_count,
                    primary_key=pk,
                )
            )
        return tables

    def discover_columns(self, table_name: str) -> List[str]:
        """Discover columns for a table."""
        cursor = self._conn.execute(f"PRAGMA table_info([{table_name}])")
        return [row[1] for row in cursor.fetchall()]

    def build_catalog(self, tables: List[TableInfo]) -> List[str]:
        """Build table.column catalog."""
        catalog = []
        for table in tables:
            for column in table.columns:
                catalog.append(f"{table.name}.{column}")
        return catalog

    def _get_row_count(self, table_name: str) -> int:
        """Get row count for a table."""
        try:
            cursor = self._conn.execute(f"SELECT COUNT(*) FROM [{table_name}]")
            return cursor.fetchone()[0]
        except Exception:
            return 0

    def _get_primary_key(self, table_name: str) -> Optional[str]:
        """Get primary key column for a table."""
        try:
            cursor = self._conn.execute(f"PRAGMA table_info([{table_name}])")
            for row in cursor.fetchall():
                if row[5]:  # pk column
                    return row[1]  # column name
            return None
        except Exception:
            return None


class SQLiteDataSource:
    """SQLite implementation of DataSource interface."""

    def __init__(self, path: Path, *, readonly: bool = True) -> None:
        self._path = path.resolve()
        self._readonly = readonly
        self._connection: Optional[sqlite3.Connection] = None

    @property
    def path(self) -> Path:
        return self._path

    @contextmanager
    def _get_connection(self):
        """Get a database connection."""
        if self._connection is None:
            uri = f"file:{self._path}?mode=ro" if self._readonly else str(self._path)
            self._connection = sqlite3.connect(
                uri if self._readonly else self._path,
                uri=self._readonly,
                check_same_thread=False,
            )
            self._connection.row_factory = sqlite3.Row
        try:
            yield self._connection
        except Exception:
            if self._connection:
                self._connection.rollback()
            raise

    def test_connection(self) -> ConnectionTest:
        """Test the connection and return health info."""
        start = time.perf_counter()
        try:
            with self._get_connection() as conn:
                cursor = conn.execute("SELECT 1")
                cursor.fetchone()

                # Count tables
                cursor = conn.execute(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
                )
                table_count = cursor.fetchone()[0]

            latency = (time.perf_counter() - start) * 1000
            return ConnectionTest(
                success=True,
                latency_ms=latency,
                tested_at=datetime.now(timezone.utc),
                table_count=table_count,
            )
        except Exception as e:
            latency = (time.perf_counter() - start) * 1000
            return ConnectionTest(
                success=False,
                latency_ms=latency,
                error=str(e),
                tested_at=datetime.now(timezone.utc),
            )

    def discover_schema(self) -> SchemaInfo:
        """Discover the database schema."""
        with self._get_connection() as conn:
            discovery = SQLiteSchemaDiscovery(conn)
            return discovery.discover()

    def execute_query(
        self,
        query: str,
        parameters: Optional[Sequence[Any]] = None,
    ) -> QueryResult:
        """Execute a query and return results."""
        start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.execute(query, parameters or ())
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = [list(row) for row in cursor.fetchall()]
            execution_time = (time.perf_counter() - start) * 1000

        return QueryResult(
            columns=columns,
            rows=rows,
            row_count=len(rows),
            query=query,
            execution_time_ms=execution_time,
        )

    def stream_query(
        self,
        query: str,
        parameters: Optional[Sequence[Any]] = None,
        batch_size: int = 1000,
    ) -> Iterator[QueryResult]:
        """Stream query results in batches."""
        start = time.perf_counter()
        with self._get_connection() as conn:
            cursor = conn.execute(query, parameters or ())
            columns = [desc[0] for desc in cursor.description] if cursor.description else []

            while True:
                rows = cursor.fetchmany(batch_size)
                if not rows:
                    break
                execution_time = (time.perf_counter() - start) * 1000
                yield QueryResult(
                    columns=columns,
                    rows=[list(row) for row in rows],
                    row_count=len(rows),
                    query=query,
                    execution_time_ms=execution_time,
                )

    def get_table_columns(self, table_name: str) -> List[str]:
        """Get column names for a table."""
        with self._get_connection() as conn:
            cursor = conn.execute(f"PRAGMA table_info([{table_name}])")
            return [row[1] for row in cursor.fetchall()]

    def get_row_count(self, table_name: str) -> int:
        """Get row count for a table."""
        result = self.execute_query(f"SELECT COUNT(*) FROM [{table_name}]")
        if result.rows:
            return result.rows[0][0]
        return 0

    def close(self) -> None:
        """Close the connection."""
        if self._connection:
            self._connection.close()
            self._connection = None

    def __del__(self) -> None:
        self.close()
