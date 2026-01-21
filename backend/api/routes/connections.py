"""Connection management routes."""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.api.dependencies import get_dependencies
from backend.adapters.databases import SQLiteDataSource
from backend.domain.connections import Connection, ConnectionType

router = APIRouter()


class ConnectionCreate(BaseModel):
    """Request to create a connection."""

    name: str
    path: str
    description: Optional[str] = None


class ConnectionResponse(BaseModel):
    """Response for connection operations."""

    connection_id: str
    name: str
    path: str
    status: str
    table_count: Optional[int] = None


class ConnectionListResponse(BaseModel):
    """Response for listing connections."""

    connections: list[ConnectionResponse]
    count: int


@router.get("")
async def list_connections() -> ConnectionListResponse:
    """List all connections."""
    # In the new architecture, this would read from a repository
    # For now, return empty list
    return ConnectionListResponse(connections=[], count=0)


@router.post("")
async def create_connection(request: ConnectionCreate) -> ConnectionResponse:
    """Create a new connection."""
    path = Path(request.path)

    if not path.exists():
        raise HTTPException(status_code=400, detail=f"Database file not found: {path}")

    # Test the connection
    datasource = SQLiteDataSource(path)
    test = datasource.test_connection()
    datasource.close()

    if not test.success:
        raise HTTPException(
            status_code=400,
            detail=f"Connection test failed: {test.error}",
        )

    # Create connection record
    connection = Connection.create_sqlite(
        name=request.name,
        path=path,
        description=request.description,
    )
    connection.record_test(test)

    return ConnectionResponse(
        connection_id=connection.connection_id,
        name=connection.name,
        path=str(connection.path),
        status=connection.status.value,
        table_count=test.table_count,
    )


@router.get("/{connection_id}/test")
async def test_connection(connection_id: str):
    """Test a connection."""
    # Would load from repository
    raise HTTPException(status_code=404, detail="Connection not found")


@router.get("/{connection_id}/schema")
async def get_schema(connection_id: str):
    """Get the schema for a connection."""
    # Would load from repository and discover schema
    raise HTTPException(status_code=404, detail="Connection not found")
