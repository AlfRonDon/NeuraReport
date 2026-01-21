"""API routes for Data Enrichment feature."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request

from backend.app.core.security import require_api_key
from backend.app.domain.enrichment.schemas import (
    EnrichmentSourceCreate,
    EnrichmentSourceType,
    SimpleEnrichmentRequest,
    SimplePreviewRequest,
)
from backend.app.domain.enrichment.service import EnrichmentService

router = APIRouter(dependencies=[Depends(require_api_key)])


def get_service() -> EnrichmentService:
    return EnrichmentService()


# Available source types (what the frontend expects from GET /sources)
AVAILABLE_SOURCES = [
    {
        "id": "company",
        "name": "Company Information",
        "type": EnrichmentSourceType.COMPANY_INFO.value,
        "description": "Enrich with company details (industry, size, revenue)",
        "required_fields": ["company_name"],
        "output_fields": ["industry", "company_size", "estimated_revenue", "founded_year"],
    },
    {
        "id": "address",
        "name": "Address Standardization",
        "type": EnrichmentSourceType.ADDRESS.value,
        "description": "Standardize and validate addresses",
        "required_fields": ["address"],
        "output_fields": ["formatted_address", "city", "state", "postal_code", "country"],
    },
    {
        "id": "exchange",
        "name": "Currency Exchange",
        "type": EnrichmentSourceType.EXCHANGE_RATE.value,
        "description": "Convert currencies to target currency",
        "required_fields": ["amount", "currency"],
        "output_fields": ["converted_amount", "exchange_rate", "target_currency"],
    },
]


@router.get("/sources")
async def list_available_sources(
    request: Request,
):
    """List available enrichment source types."""
    correlation_id = getattr(request.state, "correlation_id", None)
    return {
        "status": "ok",
        "sources": AVAILABLE_SOURCES,
        "correlation_id": correlation_id,
    }


@router.get("/source-types")
async def list_source_types(
    request: Request,
    svc: EnrichmentService = Depends(get_service),
):
    """List available enrichment source types (legacy endpoint)."""
    correlation_id = getattr(request.state, "correlation_id", None)
    source_types = svc.get_available_source_types()
    return {
        "status": "ok",
        "source_types": source_types,
        "correlation_id": correlation_id,
    }


@router.post("/enrich")
async def enrich_data(
    payload: SimpleEnrichmentRequest,
    request: Request,
    svc: EnrichmentService = Depends(get_service),
):
    """Enrich data with additional information using selected sources."""
    correlation_id = getattr(request.state, "correlation_id", None)
    result = await svc.simple_enrich(
        data=payload.data,
        sources=payload.sources,
        options=payload.options,
        correlation_id=correlation_id,
    )
    return {
        "status": "ok",
        "enriched_data": result["enriched_data"],
        "total_rows": result["total_rows"],
        "enriched_rows": result["enriched_rows"],
        "processing_time_ms": result["processing_time_ms"],
        "correlation_id": correlation_id,
    }


@router.post("/preview")
async def preview_enrichment(
    payload: SimplePreviewRequest,
    request: Request,
    svc: EnrichmentService = Depends(get_service),
):
    """Preview enrichment results on a sample."""
    correlation_id = getattr(request.state, "correlation_id", None)
    result = await svc.simple_preview(
        data=payload.data,
        sources=payload.sources,
        sample_size=payload.sample_size,
        correlation_id=correlation_id,
    )
    return {
        "status": "ok",
        "preview": result["preview"],
        "total_rows": result["total_rows"],
        "enriched_rows": result["enriched_rows"],
        "processing_time_ms": result["processing_time_ms"],
        "correlation_id": correlation_id,
    }


@router.post("/sources/create")
async def create_source(
    payload: EnrichmentSourceCreate,
    request: Request,
    svc: EnrichmentService = Depends(get_service),
):
    """Create a custom enrichment source."""
    correlation_id = getattr(request.state, "correlation_id", None)
    source = svc.create_source(payload, correlation_id)
    return {
        "status": "ok",
        "source": source.dict(),
        "correlation_id": correlation_id,
    }


@router.get("/sources/{source_id}")
async def get_source(
    source_id: str,
    request: Request,
    svc: EnrichmentService = Depends(get_service),
):
    """Get an enrichment source by ID."""
    correlation_id = getattr(request.state, "correlation_id", None)
    # Check built-in sources first
    for source in AVAILABLE_SOURCES:
        if source["id"] == source_id:
            return {
                "status": "ok",
                "source": source,
                "correlation_id": correlation_id,
            }
    # Check custom sources
    source = svc.get_source(source_id)
    if not source:
        return {
            "status": "error",
            "code": "not_found",
            "message": "Source not found",
            "correlation_id": correlation_id,
        }
    return {
        "status": "ok",
        "source": source.dict(),
        "correlation_id": correlation_id,
    }


@router.delete("/sources/{source_id}")
async def delete_source(
    source_id: str,
    request: Request,
    svc: EnrichmentService = Depends(get_service),
):
    """Delete a custom enrichment source."""
    correlation_id = getattr(request.state, "correlation_id", None)
    deleted = svc.delete_source(source_id)
    return {
        "status": "ok" if deleted else "error",
        "deleted": deleted,
        "source_id": source_id,
        "correlation_id": correlation_id,
    }


@router.get("/cache/stats")
async def get_cache_stats(
    request: Request,
    svc: EnrichmentService = Depends(get_service),
):
    """Get enrichment cache statistics."""
    correlation_id = getattr(request.state, "correlation_id", None)
    stats = svc.get_cache_stats()
    return {
        "status": "ok",
        "stats": stats,
        "correlation_id": correlation_id,
    }


@router.delete("/cache")
async def clear_cache(
    request: Request,
    source_id: Optional[str] = Query(None, max_length=64),
    svc: EnrichmentService = Depends(get_service),
):
    """Clear enrichment cache."""
    correlation_id = getattr(request.state, "correlation_id", None)
    cleared = svc.clear_cache(source_id)
    return {
        "status": "ok",
        "cleared_entries": cleared,
        "source_id": source_id,
        "correlation_id": correlation_id,
    }
