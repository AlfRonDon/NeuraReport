"""
Connection endpoints.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..dependencies import get_dependencies
from ...core import Err
from ...domain.connections import Connection, ConnectionConfig, ConnectionStatus, DatabaseType

router = APIRouter()


class ConnectionCreateRequest(BaseModel):
    """Request to create a connection."""

    name: str
    db_type: str = "sqlite"
    database_path: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    tags: Optional[list[str]] = None


class ConnectionUpdateRequest(BaseModel):
    """Request to update a connection."""

    name: Optional[str] = None
    tags: Optional[list[str]] = None


@router.get("")
async def list_connections():
    """List all connections."""
    deps = get_dependencies()
    connections = await deps.connection_repository.list()

    return {
        "status": "ok",
        "connections": [c.to_dict() for c in connections],
    }


@router.get("/{connection_id}")
async def get_connection(connection_id: str):
    """Get a connection by ID."""
    deps = get_dependencies()
    connection = await deps.connection_repository.get(connection_id)

    if not connection:
        raise HTTPException(status_code=404, detail={
            "code": "not_found",
            "message": f"Connection {connection_id} not found",
        })

    return {
        "status": "ok",
        "connection": connection.to_dict(),
    }


@router.post("")
async def create_connection(body: ConnectionCreateRequest):
    """Create a new connection."""
    deps = get_dependencies()
    from uuid import uuid4
    from datetime import datetime

    config = ConnectionConfig(
        db_type=DatabaseType(body.db_type),
        database_path=body.database_path,
        host=body.host,
        port=body.port,
        database=body.database,
        username=body.username,
    )

    connection = Connection(
        connection_id=str(uuid4()),
        name=body.name,
        config=config,
        status=ConnectionStatus.UNKNOWN,
        tags=tuple(body.tags or []),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    result = await deps.connection_repository.save(connection)
    if isinstance(result, Err):
        raise HTTPException(status_code=500, detail={
            "code": result.error.code,
            "message": result.error.message,
        })

    # Save secrets separately if password provided
    if body.password:
        await deps.connection_repository.save_secrets(
            connection.connection_id,
            {"password": body.password},
        )

    return {
        "status": "ok",
        "connection": connection.to_dict(),
    }


@router.post("/{connection_id}/test")
async def test_connection(connection_id: str):
    """Test a connection."""
    deps = get_dependencies()
    connection = await deps.connection_repository.get(connection_id)

    if not connection:
        raise HTTPException(status_code=404, detail={
            "code": "not_found",
            "message": f"Connection {connection_id} not found",
        })

    try:
        data_source = await deps.data_source_factory.create(connection_id)
        result = await data_source.test_connection()
        await data_source.close()

        if isinstance(result, Err):
            await deps.connection_repository.update_status(
                connection_id,
                status="failed",
                error=result.error.message,
            )
            return {
                "status": "failed",
                "error": result.error.message,
            }

        latency_ms = result.value
        await deps.connection_repository.update_status(
            connection_id,
            status="connected",
            latency_ms=latency_ms,
        )

        return {
            "status": "ok",
            "latency_ms": latency_ms,
        }

    except Exception as e:
        await deps.connection_repository.update_status(
            connection_id,
            status="failed",
            error=str(e),
        )
        return {
            "status": "failed",
            "error": str(e),
        }


@router.delete("/{connection_id}")
async def delete_connection(connection_id: str):
    """Delete a connection."""
    deps = get_dependencies()
    result = await deps.connection_repository.delete(connection_id)

    if isinstance(result, Err):
        raise HTTPException(status_code=404, detail={
            "code": result.error.code,
            "message": result.error.message,
        })

    return {
        "status": "ok",
        "connection_id": connection_id,
    }
