"""API routes for Cross-Database Federation feature."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from backend.app.services.security import require_api_key
from backend.app.schemas.federation import VirtualSchemaCreate, SuggestJoinsRequest, FederatedQueryRequest
from backend.app.services.federation.service import FederationService

router = APIRouter(dependencies=[Depends(require_api_key)])


def get_service() -> FederationService:
    return FederationService()


@router.post("/schemas")
async def create_virtual_schema(
    payload: VirtualSchemaCreate,
    request: Request,
    svc: FederationService = Depends(get_service),
):
    """Create a virtual schema spanning multiple databases."""
    correlation_id = getattr(request.state, "correlation_id", None)
    schema = svc.create_virtual_schema(payload, correlation_id)
    return {"status": "ok", "schema": schema.dict(), "correlation_id": correlation_id}


@router.get("/schemas")
async def list_virtual_schemas(
    request: Request,
    svc: FederationService = Depends(get_service),
):
    """List all virtual schemas."""
    correlation_id = getattr(request.state, "correlation_id", None)
    schemas = svc.list_virtual_schemas()
    return {"status": "ok", "schemas": [s.dict() for s in schemas], "correlation_id": correlation_id}


@router.get("/schemas/{schema_id}")
async def get_virtual_schema(
    schema_id: str,
    request: Request,
    svc: FederationService = Depends(get_service),
):
    """Get a virtual schema by ID."""
    correlation_id = getattr(request.state, "correlation_id", None)
    schema = svc.get_virtual_schema(schema_id)
    if not schema:
        return {"status": "error", "code": "not_found", "correlation_id": correlation_id}
    return {"status": "ok", "schema": schema.dict(), "correlation_id": correlation_id}


@router.delete("/schemas/{schema_id}")
async def delete_virtual_schema(
    schema_id: str,
    request: Request,
    svc: FederationService = Depends(get_service),
):
    """Delete a virtual schema."""
    correlation_id = getattr(request.state, "correlation_id", None)
    deleted = svc.delete_virtual_schema(schema_id)
    return {"status": "ok" if deleted else "error", "deleted": deleted, "correlation_id": correlation_id}


@router.post("/suggest-joins")
async def suggest_joins(
    payload: SuggestJoinsRequest,
    request: Request,
    svc: FederationService = Depends(get_service),
):
    """Get AI-suggested joins between tables in different connections."""
    correlation_id = getattr(request.state, "correlation_id", None)
    suggestions = svc.suggest_joins(payload.connection_ids, correlation_id)
    return {"status": "ok", "suggestions": [s.dict() for s in suggestions], "correlation_id": correlation_id}


@router.post("/query")
async def execute_federated_query(
    payload: FederatedQueryRequest,
    request: Request,
    svc: FederationService = Depends(get_service),
):
    """Execute a federated query across multiple databases."""
    correlation_id = getattr(request.state, "correlation_id", None)
    result = svc.execute_query(payload, correlation_id)
    return {"status": "ok", "result": result, "correlation_id": correlation_id}
