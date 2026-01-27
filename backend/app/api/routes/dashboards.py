"""
Dashboard API Routes - Dashboard building and analytics endpoints.

All CRUD is delegated to persistent service classes backed by the
StateStore.  No in-memory dicts — dashboards survive server restarts.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.services.dashboards.service import DashboardService
from backend.app.services.dashboards.widget_service import WidgetService
from backend.app.services.dashboards.snapshot_service import SnapshotService
from backend.app.services.dashboards.embed_service import EmbedService
from backend.app.services.security import require_api_key
from backend.app.services.analytics import (
    insight_service,
    trend_service,
    anomaly_service,
    correlation_service,
)
from backend.app.schemas.analytics import (
    DataSeries,
    InsightsRequest,
    TrendRequest,
    AnomaliesRequest,
    CorrelationsRequest,
    ForecastMethod,
)
from backend.app.services.nl2sql.service import NL2SQLService
from backend.app.schemas.nl2sql import NL2SQLExecuteRequest

logger = logging.getLogger("neura.api.dashboards")

router = APIRouter(tags=["dashboards"], dependencies=[Depends(require_api_key)])

# Service singletons
_dashboard_svc = DashboardService()
_widget_svc = WidgetService()
_snapshot_svc = SnapshotService()
_embed_svc = EmbedService()
_nl2sql_svc = NL2SQLService()


# ============================================
# Schemas
# ============================================

class WidgetConfig(BaseModel):
    """Widget configuration."""

    type: str = Field(..., pattern="^(chart|metric|table|text|filter|map)$")
    title: str
    data_source: Optional[str] = None
    query: Optional[str] = None
    chart_type: Optional[str] = None
    options: dict[str, Any] = {}


class DashboardWidget(BaseModel):
    """Dashboard widget with position."""

    id: str
    config: WidgetConfig
    x: int = 0
    y: int = 0
    w: int = 4
    h: int = 3


class CreateDashboardRequest(BaseModel):
    """Create dashboard request."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    widgets: list[DashboardWidget] = []
    filters: list[dict[str, Any]] = []
    theme: Optional[str] = None


class UpdateDashboardRequest(BaseModel):
    """Update dashboard request."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    widgets: Optional[list[DashboardWidget]] = None
    filters: Optional[list[dict[str, Any]]] = None
    theme: Optional[str] = None
    refresh_interval: Optional[int] = None


class AddWidgetRequest(BaseModel):
    """Add widget request."""

    config: WidgetConfig
    x: int = 0
    y: int = 0
    w: int = 4
    h: int = 3


class DashboardResponse(BaseModel):
    """Dashboard response."""

    id: str
    name: str
    description: Optional[str]
    widgets: list[DashboardWidget]
    filters: list[dict[str, Any]]
    theme: Optional[str]
    refresh_interval: Optional[int]
    created_at: str
    updated_at: str


# ============================================
# Dashboard CRUD Endpoints
# ============================================

@router.post("", response_model=DashboardResponse)
async def create_dashboard(request: CreateDashboardRequest):
    """Create a new dashboard."""
    dashboard = _dashboard_svc.create_dashboard(
        name=request.name,
        description=request.description,
        widgets=[w.model_dump() for w in request.widgets],
        filters=request.filters,
        theme=request.theme,
    )
    return DashboardResponse(**dashboard)


@router.get("")
async def list_dashboards(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all dashboards."""
    return _dashboard_svc.list_dashboards(limit=limit, offset=offset)


@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard(dashboard_id: str):
    """Get a dashboard by ID."""
    dashboard = _dashboard_svc.get_dashboard(dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return DashboardResponse(**dashboard)


@router.put("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(dashboard_id: str, request: UpdateDashboardRequest):
    """Update a dashboard."""
    widgets = [w.model_dump() for w in request.widgets] if request.widgets is not None else None
    dashboard = _dashboard_svc.update_dashboard(
        dashboard_id,
        name=request.name,
        description=request.description,
        widgets=widgets,
        filters=request.filters,
        theme=request.theme,
        refresh_interval=request.refresh_interval,
    )
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return DashboardResponse(**dashboard)


@router.delete("/{dashboard_id}")
async def delete_dashboard(dashboard_id: str):
    """Delete a dashboard."""
    if not _dashboard_svc.delete_dashboard(dashboard_id):
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return {"status": "ok", "message": "Dashboard deleted"}


# ============================================
# Widget Endpoints
# ============================================

@router.post("/{dashboard_id}/widgets")
async def add_widget(dashboard_id: str, request: AddWidgetRequest):
    """Add a widget to a dashboard."""
    try:
        widget = _widget_svc.add_widget(
            dashboard_id,
            config=request.config.model_dump(),
            x=request.x,
            y=request.y,
            w=request.w,
            h=request.h,
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return widget


@router.put("/{dashboard_id}/widgets/{widget_id}")
async def update_widget(
    dashboard_id: str,
    widget_id: str,
    request: AddWidgetRequest,
):
    """Update a widget."""
    widget = _widget_svc.update_widget(
        dashboard_id,
        widget_id,
        config=request.config.model_dump(),
        x=request.x,
        y=request.y,
        w=request.w,
        h=request.h,
    )
    if widget is None:
        raise HTTPException(status_code=404, detail="Widget not found")
    return widget


@router.delete("/{dashboard_id}/widgets/{widget_id}")
async def delete_widget(dashboard_id: str, widget_id: str):
    """Delete a widget from a dashboard."""
    if not _widget_svc.delete_widget(dashboard_id, widget_id):
        raise HTTPException(status_code=404, detail="Widget not found")
    return {"status": "ok", "message": "Widget deleted"}


# ============================================
# Snapshot & Embed Endpoints
# ============================================

@router.post("/{dashboard_id}/snapshot")
async def create_snapshot(
    dashboard_id: str,
    format: str = Query("png", pattern="^(png|pdf)$"),
):
    """Create a snapshot of the dashboard and trigger rendering."""
    try:
        snapshot = _snapshot_svc.create_snapshot(dashboard_id, format=format)
    except ValueError:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    # Attempt rendering synchronously — updates status to completed/failed
    rendered = _snapshot_svc.render_snapshot(snapshot["id"])

    return {
        "status": "ok",
        "snapshot_id": rendered["id"],
        "format": rendered["format"],
        "render_status": rendered.get("status", "pending"),
        "content_hash": rendered["content_hash"],
        "file_path": rendered.get("file_path"),
        "created_at": rendered["created_at"],
    }


@router.post("/{dashboard_id}/embed")
async def generate_embed_token(
    dashboard_id: str,
    expires_hours: int = Query(24, ge=1, le=720),
):
    """Generate an embed token for the dashboard."""
    try:
        result = _embed_svc.generate_embed_token(
            dashboard_id,
            expires_hours=expires_hours,
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return {
        "status": "ok",
        "embed_token": result["embed_token"],
        "embed_url": result["embed_url"],
        "expires_hours": result["expires_hours"],
        "expires_at": result["expires_at"],
    }


# ============================================
# Analytics Endpoints
# ============================================

@router.post("/{dashboard_id}/query")
async def execute_widget_query(
    dashboard_id: str,
    widget_id: str = Query(...),
    filters: Optional[dict[str, Any]] = None,
):
    """Execute a widget's query with optional filters."""
    dashboard = _dashboard_svc.get_dashboard(dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    widget = _widget_svc.get_widget(dashboard_id, widget_id)
    if widget is None:
        raise HTTPException(status_code=404, detail="Widget not found")

    config = widget.get("config", {})
    sql_query = config.get("query")
    connection_id = config.get("data_source")

    if not sql_query or not connection_id:
        return {
            "widget_id": widget_id,
            "data": [],
            "metadata": {"reason": "Widget has no query or data_source configured"},
        }

    try:
        result = _nl2sql_svc.execute_query(
            NL2SQLExecuteRequest(
                sql=sql_query,
                connection_id=connection_id,
            ),
        )
        return {
            "widget_id": widget_id,
            "data": result.rows,
            "metadata": {
                "columns": result.columns,
                "row_count": result.row_count,
                "execution_time_ms": result.execution_time_ms,
                "truncated": result.truncated,
            },
        }
    except Exception as exc:
        logger.warning(
            "widget_query_failed",
            extra={
                "event": "widget_query_failed",
                "dashboard_id": dashboard_id,
                "widget_id": widget_id,
                "error": str(exc),
            },
        )
        raise HTTPException(status_code=422, detail=f"Query execution failed: {exc}")


@router.post("/analytics/insights")
async def generate_insights(
    data: list[dict[str, Any]],
    context: Optional[str] = None,
):
    """Generate AI insights from data.

    Converts raw data dicts into DataSeries and delegates to the
    analytics InsightService.
    """
    series = _dicts_to_series(data)
    if not series:
        raise HTTPException(status_code=422, detail="No numeric data series found in input")

    request = InsightsRequest(data=series, context=context)
    result = await insight_service.generate_insights(request)
    return result.model_dump()


@router.post("/analytics/trends")
async def predict_trends(
    data: list[dict[str, Any]],
    date_column: str,
    value_column: str,
    periods: int = Query(12, ge=1, le=100),
):
    """Predict future trends from time series data.

    Extracts the named value column from the data dicts and delegates
    to the analytics TrendService.
    """
    values = [
        float(row[value_column])
        for row in data
        if value_column in row and _is_numeric(row[value_column])
    ]
    if len(values) < 2:
        raise HTTPException(status_code=422, detail=f"Need at least 2 numeric values in '{value_column}'")

    request = TrendRequest(
        data=DataSeries(name=value_column, values=values),
        forecast_periods=periods,
        method=ForecastMethod.AUTO,
    )
    result = await trend_service.analyze_trend(request)
    return result.model_dump()


@router.post("/analytics/anomalies")
async def detect_anomalies(
    data: list[dict[str, Any]],
    columns: list[str],
    method: str = Query("zscore", pattern="^(zscore|iqr|isolation_forest)$"),
):
    """Detect anomalies in data.

    Runs anomaly detection on each requested column via the
    analytics AnomalyService.  Results are aggregated across columns.
    """
    all_anomalies: list[dict[str, Any]] = []
    all_stats: dict[str, Any] = {}

    for col in columns:
        values = [
            float(row[col])
            for row in data
            if col in row and _is_numeric(row[col])
        ]
        if len(values) < 3:
            continue
        request = AnomaliesRequest(data=DataSeries(name=col, values=values))
        result = await anomaly_service.detect_anomalies(request)
        all_anomalies.extend([a.model_dump() for a in result.anomalies])
        all_stats[col] = result.baseline_stats

    return {
        "anomalies": all_anomalies,
        "statistics": all_stats,
        "narrative": f"Detected {len(all_anomalies)} anomalies across {len(columns)} columns."
        if all_anomalies
        else "No anomalies detected.",
    }


@router.post("/analytics/correlations")
async def find_correlations(
    data: list[dict[str, Any]],
    columns: Optional[list[str]] = None,
):
    """Find correlations between columns.

    Extracts numeric columns from the data dicts and delegates to the
    analytics CorrelationService.
    """
    target_cols = columns
    if not target_cols and data:
        target_cols = [
            k for k in data[0]
            if _is_numeric(data[0][k])
        ]

    if not target_cols or len(target_cols) < 2:
        raise HTTPException(status_code=422, detail="Need at least 2 numeric columns for correlation analysis")

    series = []
    for col in target_cols:
        values = [
            float(row.get(col, float("nan")))
            if _is_numeric(row.get(col))
            else float("nan")
            for row in data
        ]
        series.append(DataSeries(name=col, values=values))

    request = CorrelationsRequest(data=series)
    result = await correlation_service.analyze_correlations(request)
    return result.model_dump()


# ── Helpers ──────────────────────────────────────────────────────────

def _is_numeric(value: Any) -> bool:
    """Return True if value can be cast to float."""
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, str):
        try:
            float(value)
            return True
        except (ValueError, TypeError):
            return False
    return False


def _dicts_to_series(data: list[dict[str, Any]]) -> list[DataSeries]:
    """Convert a list of row-dicts to DataSeries (one per numeric column)."""
    if not data:
        return []
    cols = [k for k in data[0] if _is_numeric(data[0][k])]
    series = []
    for col in cols:
        values = [
            float(row[col]) if col in row and _is_numeric(row[col]) else float("nan")
            for row in data
        ]
        series.append(DataSeries(name=col, values=values))
    return series
