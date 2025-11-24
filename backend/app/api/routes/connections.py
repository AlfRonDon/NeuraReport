from __future__ import annotations

from fastapi import APIRouter, Depends, Request

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

