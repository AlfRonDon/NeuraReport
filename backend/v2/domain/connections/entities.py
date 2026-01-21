"""
Connection entities - Database connection data structures.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class DatabaseType(str, Enum):
    """Supported database types."""

    SQLITE = "sqlite"
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    MSSQL = "mssql"


class ConnectionStatus(str, Enum):
    """Connection health status."""

    UNKNOWN = "unknown"
    CONNECTED = "connected"
    FAILED = "failed"
    CONNECTING = "connecting"


@dataclass(frozen=True)
class ConnectionConfig:
    """
    Configuration for a database connection.

    This is the credential-safe version - actual secrets
    are handled by the persistence adapter.
    """

    db_type: DatabaseType
    database_path: str | None = None  # For SQLite
    host: str | None = None
    port: int | None = None
    database: str | None = None
    username: str | None = None
    # Note: password is NOT stored here - it's encrypted in the adapter

    def to_connection_string(self, password: str | None = None) -> str:
        """Build a connection string (without exposing password)."""
        if self.db_type == DatabaseType.SQLITE:
            return f"sqlite:///{self.database_path}"

        if self.db_type == DatabaseType.POSTGRESQL:
            auth = f"{self.username}:***" if self.username else ""
            return f"postgresql://{auth}@{self.host}:{self.port}/{self.database}"

        if self.db_type == DatabaseType.MYSQL:
            auth = f"{self.username}:***" if self.username else ""
            return f"mysql://{auth}@{self.host}:{self.port}/{self.database}"

        return f"{self.db_type.value}://{self.host}:{self.port}/{self.database}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "db_type": self.db_type.value,
            "database_path": self.database_path,
            "host": self.host,
            "port": self.port,
            "database": self.database,
            "username": self.username,
        }


@dataclass(frozen=True)
class Connection:
    """
    A database connection with metadata.

    The connection itself doesn't hold a live DB connection -
    that's managed by the database adapter.
    """

    connection_id: str
    name: str
    config: ConnectionConfig
    status: ConnectionStatus = ConnectionStatus.UNKNOWN
    tags: tuple[str, ...] = ()
    last_connected_at: datetime | None = None
    last_latency_ms: float | None = None
    last_error: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @property
    def db_type(self) -> DatabaseType:
        return self.config.db_type

    @property
    def summary(self) -> str:
        """Human-readable summary of the connection."""
        if self.config.database_path:
            from pathlib import Path
            return Path(self.config.database_path).name
        if self.config.host:
            return f"{self.config.host}/{self.config.database}"
        return self.name

    def with_status(
        self,
        status: ConnectionStatus,
        latency_ms: float | None = None,
        error: str | None = None,
    ) -> Connection:
        """Return connection with updated status."""
        return Connection(
            connection_id=self.connection_id,
            name=self.name,
            config=self.config,
            status=status,
            tags=self.tags,
            last_connected_at=datetime.now() if status == ConnectionStatus.CONNECTED else self.last_connected_at,
            last_latency_ms=latency_ms if latency_ms is not None else self.last_latency_ms,
            last_error=error,
            created_at=self.created_at,
            updated_at=datetime.now(),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.connection_id,
            "name": self.name,
            "db_type": self.config.db_type.value,
            "status": self.status.value,
            "tags": list(self.tags),
            "summary": self.summary,
            "lastConnectedAt": self.last_connected_at.isoformat() if self.last_connected_at else None,
            "lastLatencyMs": self.last_latency_ms,
            "lastError": self.last_error,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "hasCredentials": bool(self.config.username or self.config.database_path),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any], config: ConnectionConfig) -> Connection:
        """Deserialize from dictionary."""
        return cls(
            connection_id=data["id"],
            name=data.get("name", ""),
            config=config,
            status=ConnectionStatus(data.get("status", "unknown")),
            tags=tuple(data.get("tags", [])),
            last_connected_at=datetime.fromisoformat(data["lastConnectedAt"]) if data.get("lastConnectedAt") else None,
            last_latency_ms=data.get("lastLatencyMs"),
            last_error=data.get("lastError"),
            created_at=datetime.fromisoformat(data["createdAt"]) if data.get("createdAt") else None,
            updated_at=datetime.fromisoformat(data["updatedAt"]) if data.get("updatedAt") else None,
        )
