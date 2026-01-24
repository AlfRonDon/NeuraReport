# Connector Services
"""
Services for database and cloud storage connectors.
"""

from .base import ConnectorBase, ConnectorType, AuthType, ConnectorCapability
from .registry import get_connector, list_connectors, register_connector

# Database Connectors
from .databases import (
    PostgreSQLConnector,
    MySQLConnector,
    MongoDBConnector,
    SQLServerConnector,
    BigQueryConnector,
    SnowflakeConnector,
    ElasticsearchConnector,
    DuckDBConnector,
)

# Storage Connectors
from .storage import (
    AWSS3Connector,
    AzureBlobConnector,
    DropboxConnector,
    GoogleDriveConnector,
    OneDriveConnector,
    SFTPConnector,
)

__all__ = [
    # Base
    "ConnectorBase",
    "ConnectorType",
    "AuthType",
    "ConnectorCapability",
    "get_connector",
    "list_connectors",
    "register_connector",
    # Database Connectors
    "PostgreSQLConnector",
    "MySQLConnector",
    "MongoDBConnector",
    "SQLServerConnector",
    "BigQueryConnector",
    "SnowflakeConnector",
    "ElasticsearchConnector",
    "DuckDBConnector",
    # Storage Connectors
    "AWSS3Connector",
    "AzureBlobConnector",
    "DropboxConnector",
    "GoogleDriveConnector",
    "OneDriveConnector",
    "SFTPConnector",
]
