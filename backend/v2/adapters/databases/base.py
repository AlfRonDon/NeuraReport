"""
Data source interfaces - Abstract database access.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence

from ...core import Result, DomainError


@dataclass
class QueryResult:
    """Result of executing a query."""

    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    affected_rows: int = 0


class DataSource(ABC):
    """
    Abstract interface for data sources.

    Data sources provide read access to databases for report generation.
    """

    @abstractmethod
    async def execute(
        self,
        query: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Execute a query and return results as list of dicts.

        Args:
            query: SQL query (may contain :named parameters)
            parameters: Parameter values for the query

        Returns:
            List of row dictionaries
        """
        pass

    @abstractmethod
    async def execute_raw(
        self,
        query: str,
        parameters: Optional[Sequence[Any]] = None,
    ) -> QueryResult:
        """
        Execute a query with positional parameters.

        Args:
            query: SQL query with ? placeholders
            parameters: Positional parameter values

        Returns:
            QueryResult with columns and rows
        """
        pass

    @abstractmethod
    async def get_schema(self) -> Dict[str, List[str]]:
        """
        Get database schema.

        Returns:
            Dict of table_name -> list of column names
        """
        pass

    @abstractmethod
    async def test_connection(self) -> Result[float, DomainError]:
        """
        Test the connection.

        Returns:
            Ok(latency_ms) on success, Err on failure
        """
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close the data source connection."""
        pass


class DataSourceFactory(ABC):
    """Factory for creating data sources."""

    @abstractmethod
    async def create(self, connection_id: str) -> DataSource:
        """Create a data source for the given connection."""
        pass

    @abstractmethod
    async def create_from_path(self, db_path: str) -> DataSource:
        """Create a data source directly from a database path."""
        pass
