"""
Database adapters - Data source interfaces.
"""

from .base import DataSource, DataSourceFactory, QueryResult
from .sqlite import SQLiteDataSource

__all__ = [
    "DataSource",
    "DataSourceFactory",
    "QueryResult",
    "SQLiteDataSource",
]
