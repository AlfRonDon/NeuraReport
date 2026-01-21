"""
SQLite data source implementation.
"""

from __future__ import annotations

import asyncio
import logging
import re
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from .base import DataSource, DataSourceFactory, QueryResult
from ...core import Result, Ok, Err, DomainError
from ..persistence.base import ConnectionRepository

logger = logging.getLogger("neura.adapters.sqlite")


class SQLiteDataSource(DataSource):
    """SQLite data source implementation."""

    def __init__(self, db_path: str | Path):
        self._db_path = Path(db_path)
        self._connection: sqlite3.Connection | None = None

    def _get_connection(self) -> sqlite3.Connection:
        """Get or create the database connection."""
        if self._connection is None:
            self._connection = sqlite3.connect(
                str(self._db_path),
                check_same_thread=False,
                timeout=30.0,
            )
            self._connection.row_factory = sqlite3.Row
        return self._connection

    def _convert_named_params(
        self,
        query: str,
        params: Dict[str, Any] | None,
    ) -> tuple[str, list]:
        """Convert :named params to ? placeholders."""
        if not params:
            return query, []

        # Find all :name patterns
        pattern = re.compile(r":([a-zA-Z_][a-zA-Z0-9_]*)")
        matches = pattern.findall(query)

        # Build positional params in order
        positional = []
        for name in matches:
            if name in params:
                positional.append(params[name])
            else:
                positional.append(None)

        # Replace :name with ?
        converted_query = pattern.sub("?", query)
        return converted_query, positional

    async def execute(
        self,
        query: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Execute a query with named parameters."""
        converted_query, positional_params = self._convert_named_params(query, parameters)

        def _execute():
            conn = self._get_connection()
            cursor = conn.execute(converted_query, positional_params)
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            return [dict(zip(columns, row)) for row in rows]

        return await asyncio.to_thread(_execute)

    async def execute_raw(
        self,
        query: str,
        parameters: Optional[Sequence[Any]] = None,
    ) -> QueryResult:
        """Execute a query with positional parameters."""

        def _execute():
            conn = self._get_connection()
            params = parameters or []
            cursor = conn.execute(query, params)
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            return QueryResult(
                columns=columns,
                rows=[dict(zip(columns, row)) for row in rows],
                row_count=len(rows),
                affected_rows=cursor.rowcount,
            )

        return await asyncio.to_thread(_execute)

    async def get_schema(self) -> Dict[str, List[str]]:
        """Get the database schema."""

        def _get_schema():
            conn = self._get_connection()
            schema: Dict[str, List[str]] = {}

            # Get all tables
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            tables = [row[0] for row in cursor.fetchall()]

            # Get columns for each table
            for table in tables:
                cursor = conn.execute(f"PRAGMA table_info({table})")
                columns = [row[1] for row in cursor.fetchall()]
                schema[table] = columns

            return schema

        return await asyncio.to_thread(_get_schema)

    async def test_connection(self) -> Result[float, DomainError]:
        """Test the connection and return latency."""
        try:
            start = time.perf_counter()

            def _test():
                conn = self._get_connection()
                conn.execute("SELECT 1")

            await asyncio.to_thread(_test)
            latency_ms = (time.perf_counter() - start) * 1000
            return Ok(latency_ms)
        except Exception as e:
            return Err(DomainError(
                code="connection_failed",
                message=f"Failed to connect to database: {e}",
                cause=e,
            ))

    async def close(self) -> None:
        """Close the connection."""
        if self._connection:
            self._connection.close()
            self._connection = None


class SQLiteDataSourceFactory(DataSourceFactory):
    """Factory for creating SQLite data sources."""

    def __init__(self, connection_repository: ConnectionRepository):
        self._connection_repo = connection_repository

    async def create(self, connection_id: str) -> DataSource:
        """Create a data source for the given connection."""
        secrets = await self._connection_repo.get_secrets(connection_id)
        if not secrets:
            raise ValueError(f"Connection {connection_id} not found or has no secrets")

        db_path = secrets.get("database_path")
        if not db_path:
            raise ValueError(f"Connection {connection_id} has no database_path")

        return SQLiteDataSource(db_path)

    async def create_from_path(self, db_path: str) -> DataSource:
        """Create a data source directly from a path."""
        return SQLiteDataSource(db_path)
