from __future__ import annotations

from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, validator


class ConnectionTestRequest(BaseModel):
    db_url: Optional[str] = None
    database: Optional[str] = None
    db_type: str = Field(default="sqlite")

    @validator("db_type")
    def enforce_sqlite(cls, value: str) -> str:
        if (value or "").lower() != "sqlite":
            raise ValueError("Only sqlite is supported in this build")
        return value


class ConnectionUpsertRequest(ConnectionTestRequest):
    id: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    latency_ms: Optional[float] = None
    tags: Optional[list[str]] = None


class ConnectionResponse(BaseModel):
    id: str
    name: str
    db_type: str
    database_path: Path
    status: str
    latency_ms: Optional[float] = None

