"""DuckDB Database Connector.

Connector for DuckDB - an in-process analytical database.
"""
from __future__ import annotations

import time
from typing import Any, Optional

from backend.app.services.connectors.base import (
    AuthType,
    ColumnInfo,
    ConnectionTest,
    ConnectorBase,
    ConnectorCapability,
    ConnectorType,
    QueryResult,
    SchemaInfo,
    TableInfo,
)


class DuckDBConnector(ConnectorBase):
    """DuckDB database connector."""

    connector_id = "duckdb"
    connector_name = "DuckDB"
    connector_type = ConnectorType.DATABASE
    auth_types = [AuthType.NONE]
    capabilities = [
        ConnectorCapability.READ,
        ConnectorCapability.WRITE,
        ConnectorCapability.QUERY,
        ConnectorCapability.SCHEMA_DISCOVERY,
    ]
    free_tier = True

    def __init__(self, config: dict[str, Any]):
        super().__init__(config)
        self._connection = None

    async def connect(self) -> bool:
        """Establish connection to DuckDB."""
        try:
            import duckdb

            database_path = self.config.get("database", ":memory:")
            read_only = self.config.get("read_only", False)

            self._connection = duckdb.connect(
                database=database_path,
                read_only=read_only,
            )
            self._connected = True
            return True
        except Exception as e:
            self._connected = False
            raise ConnectionError(f"Failed to connect to DuckDB: {e}")

    async def disconnect(self) -> None:
        """Close the connection."""
        if self._connection:
            self._connection.close()
            self._connection = None
        self._connected = False

    async def test_connection(self) -> ConnectionTest:
        """Test the connection."""
        start_time = time.time()
        try:
            if not self._connected:
                await self.connect()

            self._connection.execute("SELECT 1")
            self._connection.fetchone()

            latency = (time.time() - start_time) * 1000
            return ConnectionTest(success=True, latency_ms=latency)
        except Exception as e:
            return ConnectionTest(success=False, error=str(e))

    async def discover_schema(self) -> SchemaInfo:
        """Discover database schema."""
        if not self._connected:
            await self.connect()

        tables: list[TableInfo] = []
        views: list[TableInfo] = []
        schemas: list[str] = []

        # Get schemas
        result = self._connection.execute("""
            SELECT schema_name FROM information_schema.schemata
        """)
        schemas = [row[0] for row in result.fetchall()]

        # Get tables
        result = self._connection.execute("""
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
        """)
        for schema_name, table_name in result.fetchall():
            columns = await self._get_columns(schema_name, table_name)
            tables.append(TableInfo(
                name=table_name,
                schema_name=schema_name,
                columns=columns,
            ))

        # Get views
        result = self._connection.execute("""
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_type = 'VIEW'
        """)
        for schema_name, view_name in result.fetchall():
            views.append(TableInfo(
                name=view_name,
                schema_name=schema_name,
            ))

        return SchemaInfo(tables=tables, views=views, schemas=schemas)

    async def _get_columns(self, schema_name: str, table_name: str) -> list[ColumnInfo]:
        """Get columns for a table."""
        result = self._connection.execute(f"""
            SELECT
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_schema = '{schema_name}' AND table_name = '{table_name}'
            ORDER BY ordinal_position
        """)

        columns = []
        for name, dtype, nullable in result.fetchall():
            columns.append(ColumnInfo(
                name=name,
                data_type=dtype,
                nullable=nullable == "YES",
            ))

        return columns

    async def execute_query(
        self,
        query: str,
        parameters: Optional[dict] = None,
        limit: int = 1000,
    ) -> QueryResult:
        """Execute a SQL query."""
        if not self._connected:
            await self.connect()

        start_time = time.time()

        try:
            # Add LIMIT if not present
            query_upper = query.upper().strip()
            if query_upper.startswith("SELECT") and "LIMIT" not in query_upper:
                query = f"{query} LIMIT {limit}"

            if parameters:
                result = self._connection.execute(query, list(parameters.values()))
            else:
                result = self._connection.execute(query)

            if result.description:
                columns = [desc[0] for desc in result.description]
                rows = [list(row) for row in result.fetchall()]
            else:
                columns = []
                rows = []

            execution_time = (time.time() - start_time) * 1000

            return QueryResult(
                columns=columns,
                rows=rows,
                row_count=len(rows),
                execution_time_ms=execution_time,
                truncated=len(rows) >= limit,
            )
        except Exception as e:
            return QueryResult(
                columns=[],
                rows=[],
                row_count=0,
                execution_time_ms=(time.time() - start_time) * 1000,
                error=str(e),
            )

    async def load_parquet(self, file_path: str, table_name: str) -> bool:
        """Load a Parquet file into DuckDB."""
        if not self._connected:
            await self.connect()

        try:
            self._connection.execute(f"""
                CREATE OR REPLACE TABLE {table_name} AS
                SELECT * FROM read_parquet('{file_path}')
            """)
            return True
        except Exception:
            return False

    async def load_csv(
        self,
        file_path: str,
        table_name: str,
        header: bool = True,
        delimiter: str = ",",
    ) -> bool:
        """Load a CSV file into DuckDB."""
        if not self._connected:
            await self.connect()

        try:
            self._connection.execute(f"""
                CREATE OR REPLACE TABLE {table_name} AS
                SELECT * FROM read_csv('{file_path}',
                    header={str(header).lower()},
                    delim='{delimiter}')
            """)
            return True
        except Exception:
            return False

    @classmethod
    def get_config_schema(cls) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "database": {
                    "type": "string",
                    "default": ":memory:",
                    "description": "Database file path or :memory: for in-memory",
                },
                "read_only": {
                    "type": "boolean",
                    "default": False,
                    "description": "Open in read-only mode",
                },
            },
            "required": [],
        }
