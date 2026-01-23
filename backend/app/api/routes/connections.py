from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from backend.app.core.security import require_api_key
from backend.app.domain.connections.repository import ConnectionRepository
from backend.app.domain.connections.schemas import ConnectionTestRequest, ConnectionUpsertRequest
from backend.app.domain.connections.service import ConnectionService

router = APIRouter(dependencies=[Depends(require_api_key)])


def get_service() -> ConnectionService:
    return ConnectionService(ConnectionRepository())


@router.post("/test")
async def test_connection(payload: ConnectionTestRequest, request: Request, svc: ConnectionService = Depends(get_service)):
    return {"status": "ok", **svc.test(payload, getattr(request.state, "correlation_id", None))}


@router.get("")
async def list_connections(request: Request, svc: ConnectionService = Depends(get_service)):
    connections = svc.repo.list()
    return {"status": "ok", "connections": connections, "correlation_id": getattr(request.state, "correlation_id", None)}


@router.post("")
async def upsert_connection(payload: ConnectionUpsertRequest, request: Request, svc: ConnectionService = Depends(get_service)):
    connection = svc.upsert(payload, getattr(request.state, "correlation_id", None))
    return {"status": "ok", "connection": connection.dict(), "correlation_id": getattr(request.state, "correlation_id", None)}


@router.delete("/{connection_id}")
async def delete_connection(connection_id: str, request: Request, svc: ConnectionService = Depends(get_service)):
    svc.delete(connection_id)
    return {"status": "ok", "connection_id": connection_id, "correlation_id": getattr(request.state, "correlation_id", None)}


@router.post("/{connection_id}/health")
async def healthcheck_connection(connection_id: str, request: Request, svc: ConnectionService = Depends(get_service)):
    """Verify a saved connection is still accessible."""
    result = svc.healthcheck(connection_id, getattr(request.state, "correlation_id", None))
    return {
        "status": "ok",
        "connection_id": result.get("connection_id"),
        "latency_ms": result.get("latency_ms"),
        "correlation_id": getattr(request.state, "correlation_id", None),
    }


@router.get("/{connection_id}/schema")
async def connection_schema(
    connection_id: str,
    request: Request,
    include_row_counts: bool = Query(True),
    include_foreign_keys: bool = Query(True),
    sample_rows: int = Query(0, ge=0, le=25),
):
    from backend.legacy.services.connection_inspector import get_connection_schema

    result = get_connection_schema(
        connection_id,
        include_row_counts=include_row_counts,
        include_foreign_keys=include_foreign_keys,
        sample_rows=sample_rows,
    )
    result["correlation_id"] = getattr(request.state, "correlation_id", None)
    return result


@router.get("/{connection_id}/preview")
async def connection_preview(
    connection_id: str,
    request: Request,
    table: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    from backend.legacy.services.connection_inspector import get_connection_table_preview

    result = get_connection_table_preview(
        connection_id,
        table=table,
        limit=limit,
        offset=offset,
    )
    result["correlation_id"] = getattr(request.state, "correlation_id", None)
    return result
