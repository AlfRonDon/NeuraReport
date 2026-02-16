"""
Widget Intelligence API Routes — widget catalog, selection, grid packing, data.

Endpoints:
    GET  /widgets/catalog              Full widget catalog (24 scenarios)
    POST /widgets/recommend            Dynamic widget recommendations for a DB connection
    POST /widgets/select               AI-powered widget selection
    POST /widgets/pack-grid            Pack widgets into CSS grid layout
    POST /widgets/{scenario}/validate  Validate data shape
    POST /widgets/{scenario}/format    Format raw data
    POST /widgets/data                 Live data from active DB connection
    POST /widgets/data/report          Data from a report run (RAG)
    POST /widgets/feedback             Thompson Sampling reward signal
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.services.security import require_api_key

logger = logging.getLogger("neura.api.widgets")

router = APIRouter(tags=["widgets"], dependencies=[Depends(require_api_key)])

# Lazy-init service singleton
_svc = None


def _get_svc():
    global _svc
    if _svc is None:
        from backend.app.services.widget_intelligence.service import WidgetIntelligenceService
        _svc = WidgetIntelligenceService()
    return _svc


# ── Schemas ──────────────────────────────────────────────────────────────


class WidgetSelectRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    query_type: str = Field(default="overview")
    data_profile: Optional[dict[str, Any]] = None
    max_widgets: int = Field(default=10, ge=1, le=20)


class GridPackRequest(BaseModel):
    widgets: list[dict[str, Any]] = Field(...)


class ValidateRequest(BaseModel):
    data: dict[str, Any] = Field(...)


class FormatRequest(BaseModel):
    data: dict[str, Any] = Field(...)


class FeedbackRequest(BaseModel):
    scenario: str = Field(..., min_length=1)
    reward: float = Field(..., ge=-1.0, le=1.0)


class WidgetDataRequest(BaseModel):
    connection_id: str = Field(..., min_length=1)
    scenario: str = Field(..., min_length=1)
    variant: Optional[str] = None
    filters: Optional[dict[str, Any]] = None
    limit: int = Field(default=100, ge=1, le=1000)


class RecommendRequest(BaseModel):
    connection_id: str = Field(..., min_length=1)
    query: str = Field(default="overview", max_length=2000)
    max_widgets: int = Field(default=8, ge=1, le=20)


class WidgetReportDataRequest(BaseModel):
    run_id: str = Field(..., min_length=1)
    scenario: str = Field(..., min_length=1)
    variant: Optional[str] = None


# Lazy-init data resolver
_resolver = None


def _get_resolver():
    global _resolver
    if _resolver is None:
        from backend.app.services.widget_intelligence.data_resolver import WidgetDataResolver
        _resolver = WidgetDataResolver()
    return _resolver


# ── Endpoints ────────────────────────────────────────────────────────────


@router.get("/catalog")
async def get_widget_catalog():
    """Return the full widget catalog with all registered scenarios."""
    svc = _get_svc()
    catalog = svc.get_catalog()
    return {"widgets": catalog, "count": len(catalog)}


@router.post("/recommend")
async def recommend_widgets(req: RecommendRequest):
    """Analyze a connected DB and recommend optimal widgets using data-driven scoring."""
    try:
        from backend.app.repositories.connections.db_connection import resolve_db_path
        from backend.legacy.services.mapping.helpers import build_rich_catalog_from_db
        from backend.resolvers.widget_selector import WidgetSelector as DynamicSelector
        from backend.resolvers.data_shape import extract_data_shape
        from backend.resolvers.grid_packer import pack_grid as dynamic_pack
        from backend.app.services.widget_intelligence.models.intent import ParsedIntent, QueryType
        from backend.app.services.widget_intelligence.models.data import DataProfile

        # 1. Resolve DB path from connection_id
        db_path = resolve_db_path(req.connection_id, None, None)

        # 2. Build rich catalog from DB schema
        rich_catalog = build_rich_catalog_from_db(db_path)
        table_count = len(rich_catalog)
        total_columns = sum(len(cols) for cols in rich_catalog.values())
        numeric_cols = sum(
            1 for cols in rich_catalog.values()
            for c in cols if c.get("type", "").upper() in ("INTEGER", "REAL", "FLOAT", "NUMERIC", "DECIMAL", "DOUBLE")
        )

        # 3. Build data profile from schema
        has_ts = any(
            c.get("type", "").upper() in ("DATE", "DATETIME", "TIMESTAMP")
            or any(kw in c.get("column", "").lower() for kw in ("date", "time", "timestamp"))
            for cols in rich_catalog.values() for c in cols
        )
        profile = DataProfile(
            table_count=table_count,
            entity_count=min(table_count, 5),
            numeric_column_count=numeric_cols,
            has_timeseries=has_ts,
        )

        # 4. Build intent from query
        try:
            qt = QueryType(req.query) if req.query in QueryType.__members__ else QueryType.overview
        except ValueError:
            qt = QueryType.overview
        intent = ParsedIntent(original_query=req.query, query_type=qt)

        # 5. Run dynamic widget selection
        selector = DynamicSelector()
        slots = selector.select(
            intent=intent,
            data_profile=profile,
            max_widgets=req.max_widgets,
            catalog=None,  # data_shape extractor handles None gracefully
        )

        # 6. Pack into grid layout
        grid = dynamic_pack(slots)

        # 7. Build response
        widgets = [
            {
                "id": s.id,
                "scenario": s.scenario,
                "variant": s.variant,
                "size": s.size.value if hasattr(s.size, "value") else str(s.size),
                "question": s.question,
                "relevance": s.relevance,
            }
            for s in slots
        ]

        return {
            "widgets": widgets,
            "count": len(widgets),
            "grid": {
                "cells": [
                    {
                        "widget_id": c.widget_id,
                        "col_start": c.col_start,
                        "col_end": c.col_end,
                        "row_start": c.row_start,
                        "row_end": c.row_end,
                    }
                    for c in grid.cells
                ],
                "total_cols": grid.total_cols,
                "total_rows": grid.total_rows,
                "utilization_pct": grid.utilization_pct,
            },
            "profile": {
                "table_count": table_count,
                "column_count": total_columns,
                "numeric_columns": numeric_cols,
                "has_timeseries": has_ts,
                "tables": list(rich_catalog.keys()),
            },
        }

    except RuntimeError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Widget recommendation failed")
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {e}")


@router.post("/select")
async def select_widgets(req: WidgetSelectRequest):
    """AI-powered widget selection for a dashboard query."""
    svc = _get_svc()
    widgets = svc.select_widgets(
        query=req.query,
        query_type=req.query_type,
        data_profile=req.data_profile,
        max_widgets=req.max_widgets,
    )
    return {"widgets": widgets, "count": len(widgets)}


@router.post("/pack-grid")
async def pack_grid(req: GridPackRequest):
    """Pack selected widgets into a CSS grid layout."""
    svc = _get_svc()
    if not req.widgets:
        raise HTTPException(status_code=400, detail="At least one widget required")
    layout = svc.pack_grid(req.widgets)
    return layout


@router.post("/{scenario}/validate")
async def validate_widget_data(scenario: str, req: ValidateRequest):
    """Validate data shape for a widget scenario."""
    svc = _get_svc()
    errors = svc.validate_data(scenario, req.data)
    return {"scenario": scenario, "valid": len(errors) == 0, "errors": errors}


@router.post("/{scenario}/format")
async def format_widget_data(scenario: str, req: FormatRequest):
    """Format raw data into frontend-ready shape."""
    svc = _get_svc()
    formatted = svc.format_data(scenario, req.data)
    return {"scenario": scenario, "data": formatted}


@router.post("/data")
async def get_widget_data(req: WidgetDataRequest):
    """Fetch live data from an active DB connection using the widget's RAG strategy."""
    resolver = _get_resolver()
    result = resolver.resolve(
        connection_id=req.connection_id,
        scenario=req.scenario,
        variant=req.variant,
        filters=req.filters,
        limit=req.limit,
    )
    # Always return the result — error field signals issues to the frontend
    return result


@router.post("/data/report")
async def get_widget_report_data(req: WidgetReportDataRequest):
    """Fetch widget data from a report run's extracted tables and content."""
    from backend.app.services.reports.report_context import ReportContextProvider

    provider = ReportContextProvider()
    ctx = provider.get_report_context(req.run_id)
    if not ctx:
        raise HTTPException(status_code=404, detail=f"Report run {req.run_id} not found")

    svc = _get_svc()
    plugin_meta = None
    catalog = svc.get_catalog()
    for w in catalog:
        if w["scenario"] == req.scenario:
            plugin_meta = w
            break

    # Build data from report context based on RAG strategy
    rag_strategy = plugin_meta["rag_strategy"] if plugin_meta else "single_metric"

    data = {}
    if rag_strategy in ("single_metric", "multi_metric") and ctx.tables:
        # Use first table from report
        table = ctx.tables[0]
        data = {
            "labels": [row[0] if row else "" for row in table.get("rows", [])],
            "datasets": [],
        }
        headers = table.get("headers", [])
        for i, hdr in enumerate(headers[1:], 1):
            data["datasets"].append({
                "label": hdr,
                "data": [row[i] if i < len(row) else 0 for row in table.get("rows", [])],
            })

    elif rag_strategy == "narrative":
        data = {
            "title": f"Report: {ctx.template_name}",
            "text": ctx.text_content[:2000] if ctx.text_content else "No content available.",
            "highlights": [
                f"Template: {ctx.template_name}",
                f"Status: {ctx.status}",
                f"Records: {len(ctx.tables)} tables",
            ],
        }

    elif rag_strategy in ("alert_query", "events_in_range"):
        # Treat report tables as event data
        events = []
        for t in ctx.tables:
            for row in t.get("rows", [])[:20]:
                events.append({
                    "message": row[0] if row else "",
                    "timestamp": row[1] if len(row) > 1 else "",
                    "severity": "info",
                })
        data = {"events": events, "alerts": events}

    else:
        data = {
            "title": ctx.template_name,
            "text": ctx.text_content[:500] if ctx.text_content else "",
        }

    # Format through plugin if available
    formatted = svc.format_data(req.scenario, data) if data else data

    return {
        "scenario": req.scenario,
        "data": formatted,
        "source": f"report:{req.run_id}",
        "strategy": rag_strategy,
    }


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    """Submit reward signal for Thompson Sampling learning."""
    svc = _get_svc()
    svc.update_feedback(req.scenario, req.reward)
    return {"status": "ok", "scenario": req.scenario}
