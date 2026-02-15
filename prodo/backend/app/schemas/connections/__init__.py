from __future__ import annotations

from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, validator

from backend.app.utils.validation import is_safe_id, is_safe_name, sanitize_id, sanitize_filename


class ConnectionTestRequest(BaseModel):
    db_url: Optional[str] = Field(None, max_length=1000)
    database: Optional[str] = Field(None, max_length=500)
    db_type: str = Field(default="sqlite", max_length=50)

    @validator("db_type")
    def enforce_sqlite(cls, value: str) -> str:
        if (value or "").lower() != "sqlite":
            raise ValueError("Only sqlite is supported in this build")
        return value

    @validator("database")
    def validate_database_path(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        # Ensure no path traversal
        if ".." in value:
            raise ValueError("Path traversal not allowed")
        return value


class ConnectionUpsertRequest(ConnectionTestRequest):
    id: Optional[str] = Field(None, max_length=64)
    name: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, max_length=50)
    latency_ms: Optional[float] = Field(None, ge=0, le=1000000)
    tags: Optional[list[str]] = Field(None, max_items=20)

    @validator("id")
    def validate_id(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if not is_safe_id(value):
            raise ValueError("ID must be alphanumeric with dashes/underscores only")
        return value

    @validator("name")
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if not is_safe_name(value):
            raise ValueError("Name contains invalid characters")
        return value

    @validator("tags", each_item=True)
    def validate_tag(cls, value: str) -> str:
        if len(value) > 50:
            raise ValueError("Tag must be 50 characters or less")
        return value.strip()


class ConnectionResponse(BaseModel):
    id: str
    name: str
    db_type: str
    database_path: Path
    status: str
    latency_ms: Optional[float] = None

