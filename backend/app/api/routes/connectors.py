"""
Connector API Routes - Database and cloud storage connector endpoints.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel, Field

from ...services.connectors import (
    get_connector,
    list_connectors as list_available_connectors,
    ConnectorBase,
    ConnectorType,
)

logger = logging.getLogger("neura.api.connectors")

router = APIRouter(prefix="/connectors", tags=["connectors"])


# ============================================
# Schemas
# ============================================

class ConnectorInfo(BaseModel):
    """Connector type information."""

    id: str
    name: str
    type: str
    auth_types: list[str]
    capabilities: list[str]
    free_tier: bool
    config_schema: dict[str, Any]


class CreateConnectionRequest(BaseModel):
    """Create connection request."""

    name: str = Field(..., min_length=1, max_length=255)
    connector_type: str
    config: dict[str, Any]


class ConnectionResponse(BaseModel):
    """Connection response."""

    id: str
    name: str
    connector_type: str
    status: str
    created_at: str
    last_used: Optional[str]
    latency_ms: Optional[float]


class TestConnectionRequest(BaseModel):
    """Test connection request."""

    connector_type: str
    config: dict[str, Any]


class TestConnectionResponse(BaseModel):
    """Test connection response."""

    success: bool
    latency_ms: Optional[float]
    error: Optional[str]
    details: Optional[dict[str, Any]]


class QueryRequest(BaseModel):
    """Query request."""

    query: str
    parameters: Optional[dict[str, Any]] = None
    limit: int = Field(1000, ge=1, le=10000)


class QueryResponse(BaseModel):
    """Query response."""

    columns: list[str]
    rows: list[list[Any]]
    row_count: int
    execution_time_ms: float
    truncated: bool
    error: Optional[str]


# In-memory storage for connections
_connections: dict[str, dict] = {}


# ============================================
# Connector Discovery Endpoints
# ============================================

@router.get("/types")
async def list_connector_types() -> list[ConnectorInfo]:
    """List all available connector types."""
    return [ConnectorInfo(**c) for c in list_available_connectors()]


@router.get("/types/{connector_type}")
async def get_connector_type(connector_type: str) -> ConnectorInfo:
    """Get information about a specific connector type."""
    connectors = list_available_connectors()
    for c in connectors:
        if c["id"] == connector_type:
            return ConnectorInfo(**c)
    raise HTTPException(status_code=404, detail="Connector type not found")


@router.get("/types/by-category/{category}")
async def list_connectors_by_category(
    category: str = Path(..., pattern="^(database|cloud_storage|productivity|api)$"),
) -> list[ConnectorInfo]:
    """List connectors by category."""
    connectors = list_available_connectors()
    return [ConnectorInfo(**c) for c in connectors if c["type"] == category]


# ============================================
# Connection Test Endpoints
# ============================================

@router.post("/{connector_type}/test", response_model=TestConnectionResponse)
async def test_connection(
    connector_type: str,
    request: TestConnectionRequest,
):
    """Test a connection configuration."""
    try:
        connector = get_connector(connector_type, request.config)
        result = await connector.test_connection()
        return TestConnectionResponse(
            success=result.success,
            latency_ms=result.latency_ms,
            error=result.error,
            details=result.details,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            error=str(e),
        )


# ============================================
# Connection CRUD Endpoints
# ============================================

@router.post("/{connector_type}/connect", response_model=ConnectionResponse)
async def create_connection(
    connector_type: str,
    request: CreateConnectionRequest,
):
    """Create and save a new connection."""
    try:
        # Test connection first
        connector = get_connector(connector_type, request.config)
        test_result = await connector.test_connection()

        if not test_result.success:
            raise HTTPException(
                status_code=400,
                detail=f"Connection failed: {test_result.error}",
            )

        now = datetime.utcnow().isoformat()
        connection = {
            "id": str(uuid.uuid4()),
            "name": request.name,
            "connector_type": connector_type,
            "config": request.config,  # Would encrypt in production
            "status": "connected",
            "created_at": now,
            "last_used": now,
            "latency_ms": test_result.latency_ms,
        }
        _connections[connection["id"]] = connection

        return ConnectionResponse(
            id=connection["id"],
            name=connection["name"],
            connector_type=connection["connector_type"],
            status=connection["status"],
            created_at=connection["created_at"],
            last_used=connection["last_used"],
            latency_ms=connection["latency_ms"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
async def list_connections(
    connector_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List saved connections."""
    connections = list(_connections.values())
    if connector_type:
        connections = [c for c in connections if c["connector_type"] == connector_type]
    connections.sort(key=lambda c: c["created_at"], reverse=True)
    return {
        "connections": [
            ConnectionResponse(
                id=c["id"],
                name=c["name"],
                connector_type=c["connector_type"],
                status=c["status"],
                created_at=c["created_at"],
                last_used=c.get("last_used"),
                latency_ms=c.get("latency_ms"),
            )
            for c in connections[offset:offset + limit]
        ],
        "total": len(connections),
        "offset": offset,
        "limit": limit,
    }


@router.get("/{connection_id}", response_model=ConnectionResponse)
async def get_connection(connection_id: str):
    """Get a connection by ID."""
    if connection_id not in _connections:
        raise HTTPException(status_code=404, detail="Connection not found")
    c = _connections[connection_id]
    return ConnectionResponse(
        id=c["id"],
        name=c["name"],
        connector_type=c["connector_type"],
        status=c["status"],
        created_at=c["created_at"],
        last_used=c.get("last_used"),
        latency_ms=c.get("latency_ms"),
    )


@router.delete("/{connection_id}")
async def delete_connection(connection_id: str):
    """Delete a connection."""
    if connection_id not in _connections:
        raise HTTPException(status_code=404, detail="Connection not found")
    del _connections[connection_id]
    return {"status": "ok", "message": "Connection deleted"}


# ============================================
# Connection Health & Schema Endpoints
# ============================================

@router.post("/{connection_id}/health", response_model=TestConnectionResponse)
async def check_connection_health(connection_id: str):
    """Check if a connection is healthy."""
    if connection_id not in _connections:
        raise HTTPException(status_code=404, detail="Connection not found")

    conn = _connections[connection_id]
    try:
        connector = get_connector(conn["connector_type"], conn["config"])
        result = await connector.test_connection()

        # Update connection status
        conn["status"] = "connected" if result.success else "error"
        conn["latency_ms"] = result.latency_ms

        return TestConnectionResponse(
            success=result.success,
            latency_ms=result.latency_ms,
            error=result.error,
            details=result.details,
        )
    except Exception as e:
        conn["status"] = "error"
        return TestConnectionResponse(
            success=False,
            error=str(e),
        )


@router.get("/{connection_id}/schema")
async def get_connection_schema(connection_id: str):
    """Get schema information for a connection."""
    if connection_id not in _connections:
        raise HTTPException(status_code=404, detail="Connection not found")

    conn = _connections[connection_id]
    try:
        connector = get_connector(conn["connector_type"], conn["config"])
        await connector.connect()
        schema = await connector.discover_schema()
        await connector.disconnect()

        return {
            "tables": [t.model_dump() for t in schema.tables],
            "views": [v.model_dump() for v in schema.views],
            "schemas": schema.schemas,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Query Execution Endpoints
# ============================================

@router.post("/{connection_id}/query", response_model=QueryResponse)
async def execute_query(
    connection_id: str,
    request: QueryRequest,
):
    """Execute a query on a connection."""
    if connection_id not in _connections:
        raise HTTPException(status_code=404, detail="Connection not found")

    conn = _connections[connection_id]
    try:
        connector = get_connector(conn["connector_type"], conn["config"])
        await connector.connect()
        result = await connector.execute_query(
            request.query,
            request.parameters,
            request.limit,
        )
        await connector.disconnect()

        # Update last used
        conn["last_used"] = datetime.utcnow().isoformat()

        return QueryResponse(
            columns=result.columns,
            rows=result.rows,
            row_count=result.row_count,
            execution_time_ms=result.execution_time_ms,
            truncated=result.truncated,
            error=result.error,
        )
    except Exception as e:
        return QueryResponse(
            columns=[],
            rows=[],
            row_count=0,
            execution_time_ms=0,
            truncated=False,
            error=str(e),
        )


# ============================================
# OAuth Endpoints
# ============================================

@router.get("/{connector_type}/oauth/authorize")
async def get_oauth_url(
    connector_type: str,
    redirect_uri: str = Query(...),
    state: Optional[str] = None,
):
    """Get OAuth authorization URL for a connector."""
    try:
        connector = get_connector(connector_type, {})
        if state is None:
            state = str(uuid.uuid4())
        auth_url = connector.get_oauth_url(redirect_uri, state)
        if not auth_url:
            raise HTTPException(
                status_code=400,
                detail="This connector does not support OAuth",
            )
        return {
            "authorization_url": auth_url,
            "state": state,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{connector_type}/oauth/callback")
async def handle_oauth_callback(
    connector_type: str,
    code: str = Query(...),
    redirect_uri: str = Query(...),
    state: Optional[str] = None,
):
    """Handle OAuth callback and exchange code for tokens."""
    try:
        connector = get_connector(connector_type, {})
        tokens = connector.handle_oauth_callback(code, redirect_uri)
        return {
            "status": "ok",
            "tokens": tokens,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
