# mypy: ignore-errors
"""
Enhanced Analysis API Routes - Comprehensive endpoints for AI-powered document analysis.

Provides endpoints for:
- Document upload and analysis
- Natural language Q&A
- Chart generation
- Data export
- Collaboration features
- Integrations
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel

from backend.app.features.analyze.schemas.enhanced_analysis import (
    AnalysisDepth,
    AnalysisPreferences,
    ChartType,
    ExportFormat,
    SummaryMode,
)
from backend.app.features.analyze.services.enhanced_analysis_orchestrator import (
    get_orchestrator,
)

logger = logging.getLogger("neura.analyze.routes")

router = APIRouter(prefix="/analyze/v2", tags=["Enhanced Analysis"])


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class AnalyzePreferencesRequest(BaseModel):
    """Request model for analysis preferences."""
    analysis_depth: str = "standard"
    focus_areas: List[str] = []
    output_format: str = "executive"
    language: str = "en"
    industry: Optional[str] = None
    enable_predictions: bool = True
    enable_recommendations: bool = True
    auto_chart_generation: bool = True
    max_charts: int = 10
    summary_mode: str = "executive"


class QuestionRequest(BaseModel):
    """Request model for asking questions."""
    question: str
    include_sources: bool = True
    max_context_chunks: int = 5


class ChartRequest(BaseModel):
    """Request model for generating charts."""
    query: str
    chart_type: Optional[str] = None
    include_trends: bool = True
    include_forecasts: bool = False


class ExportRequest(BaseModel):
    """Request model for exporting analysis."""
    format: str = "json"
    include_raw_data: bool = True
    include_charts: bool = True


class CompareRequest(BaseModel):
    """Request model for comparing documents."""
    analysis_id_1: str
    analysis_id_2: str


class CommentRequest(BaseModel):
    """Request model for adding comments."""
    content: str
    element_type: Optional[str] = None
    element_id: Optional[str] = None
    user_id: str = "anonymous"
    user_name: str = "Anonymous"


class ShareRequest(BaseModel):
    """Request model for creating share links."""
    access_level: str = "view"
    expires_hours: Optional[int] = None
    password_protected: bool = False
    allowed_emails: List[str] = []


# =============================================================================
# DOCUMENT ANALYSIS ENDPOINTS
# =============================================================================

@router.post("/upload")
async def analyze_document(
    file: UploadFile = File(...),
    preferences: Optional[str] = Form(None),
    background: bool = Query(False, description="Run in background"),
    background_tasks: BackgroundTasks = None,
):
    """
    Upload and analyze a document with AI-powered analysis.

    Returns streaming NDJSON events with progress and final result.

    **Features:**
    - Intelligent table extraction with cross-page stitching
    - Entity and metric extraction (dates, money, percentages, etc.)
    - Form and invoice parsing
    - Multi-mode summaries (executive, data, comprehensive, etc.)
    - Sentiment and tone analysis
    - Statistical analysis with outlier detection
    - Auto-generated visualizations
    - AI-powered insights, risks, and opportunities
    - Predictive analytics
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Parse preferences
    prefs = None
    if preferences:
        try:
            prefs_dict = json.loads(preferences)
            prefs = AnalysisPreferences(
                analysis_depth=AnalysisDepth[prefs_dict.get("analysis_depth", "standard").upper()],
                focus_areas=prefs_dict.get("focus_areas", []),
                output_format=prefs_dict.get("output_format", "executive"),
                language=prefs_dict.get("language", "en"),
                industry=prefs_dict.get("industry"),
                enable_predictions=prefs_dict.get("enable_predictions", True),
                enable_recommendations=prefs_dict.get("enable_recommendations", True),
                auto_chart_generation=prefs_dict.get("auto_chart_generation", True),
                max_charts=prefs_dict.get("max_charts", 10),
                summary_mode=SummaryMode[prefs_dict.get("summary_mode", "executive").upper()],
            )
        except Exception as e:
            logger.warning(f"Failed to parse preferences: {e}")

    # Read file
    file_bytes = await file.read()
    file_name = file.filename

    orchestrator = get_orchestrator()

    async def generate_events():
        async for event in orchestrator.analyze_document_streaming(
            file_bytes=file_bytes,
            file_name=file_name,
            preferences=prefs,
        ):
            yield json.dumps(event) + "\n"

    return StreamingResponse(
        generate_events(),
        media_type="application/x-ndjson",
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get a previously computed analysis result."""
    orchestrator = get_orchestrator()
    result = orchestrator.get_analysis(analysis_id)

    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return result.dict()


@router.get("/{analysis_id}/summary/{mode}")
async def get_summary(
    analysis_id: str,
    mode: str,
):
    """Get a specific summary mode for an analysis."""
    orchestrator = get_orchestrator()
    result = orchestrator.get_analysis(analysis_id)

    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    summary = result.summaries.get(mode)
    if not summary:
        raise HTTPException(status_code=404, detail=f"Summary mode '{mode}' not found")

    return summary.dict()


# =============================================================================
# QUESTION & ANSWER ENDPOINTS
# =============================================================================

@router.post("/{analysis_id}/ask")
async def ask_question(
    analysis_id: str,
    request: QuestionRequest,
):
    """
    Ask a natural language question about the analyzed document.

    Uses RAG (Retrieval-Augmented Generation) to find relevant context
    and generate accurate answers with source citations.
    """
    orchestrator = get_orchestrator()

    response = await orchestrator.ask_question(
        analysis_id=analysis_id,
        question=request.question,
        include_sources=request.include_sources,
        max_context_chunks=request.max_context_chunks,
    )

    return response.dict()


@router.get("/{analysis_id}/suggested-questions")
async def get_suggested_questions(analysis_id: str):
    """Get AI-generated suggested questions for an analysis."""
    orchestrator = get_orchestrator()
    result = orchestrator.get_analysis(analysis_id)

    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    questions = orchestrator.ux_service.generate_suggested_questions(
        tables=result.tables,
        metrics=result.metrics,
        entities=result.entities,
    )

    return {"questions": questions}


# =============================================================================
# VISUALIZATION ENDPOINTS
# =============================================================================

@router.post("/{analysis_id}/charts/generate")
async def generate_charts(
    analysis_id: str,
    request: ChartRequest,
):
    """
    Generate charts from natural language query.

    Examples:
    - "Show me revenue by quarter as a line chart"
    - "Compare sales across regions"
    - "Create a pie chart of market share"
    """
    orchestrator = get_orchestrator()

    charts = await orchestrator.generate_charts_from_query(
        analysis_id=analysis_id,
        query=request.query,
        include_trends=request.include_trends,
        include_forecasts=request.include_forecasts,
    )

    return {"charts": charts}


@router.get("/{analysis_id}/charts")
async def get_charts(analysis_id: str):
    """Get all charts for an analysis."""
    orchestrator = get_orchestrator()
    result = orchestrator.get_analysis(analysis_id)

    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "charts": [c.dict() for c in result.chart_suggestions],
        "suggestions": [s.dict() for s in result.visualization_suggestions],
    }


# =============================================================================
# DATA ENDPOINTS
# =============================================================================

@router.get("/{analysis_id}/tables")
async def get_tables(
    analysis_id: str,
    limit: int = Query(10, ge=1, le=50),
):
    """Get extracted tables from an analysis."""
    orchestrator = get_orchestrator()
    result = orchestrator.get_analysis(analysis_id)

    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "tables": [t.dict() for t in result.tables[:limit]],
        "total": len(result.tables),
    }


@router.get("/{analysis_id}/metrics")
async def get_metrics(analysis_id: str):
    """Get extracted metrics from an analysis."""
    orchestrator = get_orchestrator()
    result = orchestrator.get_analysis(analysis_id)

    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "metrics": [m.dict() for m in result.metrics],
        "total": len(result.metrics),
    }


@router.get("/{analysis_id}/entities")
async def get_entities(analysis_id: str):
    """Get extracted entities from an analysis."""
    orchestrator = get_orchestrator()
    result = orchestrator.get_analysis(analysis_id)

    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "entities": [e.dict() for e in result.entities],
        "total": len(result.entities),
    }


@router.get("/{analysis_id}/insights")
async def get_insights(analysis_id: str):
    """Get AI-generated insights, risks, and opportunities."""
    orchestrator = get_orchestrator()
    result = orchestrator.get_analysis(analysis_id)

    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "insights": [i.dict() for i in result.insights],
        "risks": [r.dict() for r in result.risks],
        "opportunities": [o.dict() for o in result.opportunities],
        "action_items": [a.dict() for a in result.action_items],
    }


@router.get("/{analysis_id}/quality")
async def get_data_quality(analysis_id: str):
    """Get data quality assessment for an analysis."""
    orchestrator = get_orchestrator()
    result = orchestrator.get_analysis(analysis_id)

    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if not result.data_quality:
        raise HTTPException(status_code=404, detail="Data quality assessment not available")

    return result.data_quality.dict()


# =============================================================================
# EXPORT ENDPOINTS
# =============================================================================

@router.post("/{analysis_id}/export")
async def export_analysis(
    analysis_id: str,
    request: ExportRequest,
):
    """
    Export analysis in various formats.

    Supported formats:
    - json: Full analysis as JSON
    - csv: Tables as CSV
    - excel: Formatted Excel workbook
    - pdf: PDF report
    - markdown: Markdown document
    - html: HTML report
    """
    orchestrator = get_orchestrator()

    try:
        format_enum = ExportFormat[request.format.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid format: {request.format}")

    try:
        content, filename = await orchestrator.export_analysis(
            analysis_id=analysis_id,
            format=format_enum,
            include_raw_data=request.include_raw_data,
            include_charts=request.include_charts,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Determine content type
    content_types = {
        ExportFormat.JSON: "application/json",
        ExportFormat.CSV: "text/csv",
        ExportFormat.EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ExportFormat.PDF: "application/pdf",
        ExportFormat.MARKDOWN: "text/markdown",
        ExportFormat.HTML: "text/html",
    }

    return Response(
        content=content,
        media_type=content_types.get(format_enum, "application/octet-stream"),
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# =============================================================================
# COMPARISON ENDPOINTS
# =============================================================================

@router.post("/compare")
async def compare_documents(request: CompareRequest):
    """Compare two analyzed documents."""
    orchestrator = get_orchestrator()

    result = await orchestrator.compare_documents(
        analysis_id_1=request.analysis_id_1,
        analysis_id_2=request.analysis_id_2,
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


# =============================================================================
# COLLABORATION ENDPOINTS
# =============================================================================

@router.post("/{analysis_id}/comments")
async def add_comment(
    analysis_id: str,
    request: CommentRequest,
):
    """Add a comment to an analysis."""
    orchestrator = get_orchestrator()

    # Verify analysis exists
    result = orchestrator.get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    comment = orchestrator.ux_service.add_comment(
        analysis_id=analysis_id,
        user_id=request.user_id,
        user_name=request.user_name,
        content=request.content,
        element_type=request.element_type,
        element_id=request.element_id,
    )

    return {
        "id": comment.id,
        "content": comment.content,
        "created_at": comment.created_at.isoformat(),
    }


@router.get("/{analysis_id}/comments")
async def get_comments(analysis_id: str):
    """Get all comments for an analysis."""
    orchestrator = get_orchestrator()

    comments = orchestrator.ux_service.get_comments(analysis_id)

    return {
        "comments": [
            {
                "id": c.id,
                "content": c.content,
                "user_name": c.user_name,
                "element_type": c.element_type,
                "element_id": c.element_id,
                "created_at": c.created_at.isoformat(),
                "replies": [
                    {"id": r.id, "content": r.content, "user_name": r.user_name}
                    for r in c.replies
                ],
            }
            for c in comments
        ]
    }


@router.post("/{analysis_id}/share")
async def create_share_link(
    analysis_id: str,
    request: ShareRequest,
):
    """Create a shareable link for an analysis."""
    orchestrator = get_orchestrator()

    # Verify analysis exists
    result = orchestrator.get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    share = orchestrator.ux_service.create_share_link(
        analysis_id=analysis_id,
        created_by="api",
        access_level=request.access_level,
        expires_hours=request.expires_hours,
        password_protected=request.password_protected,
        allowed_emails=request.allowed_emails,
    )

    return {
        "share_id": share.id,
        "share_url": f"/analyze/v2/shared/{share.id}",
        "access_level": share.access_level,
        "expires_at": share.expires_at.isoformat() if share.expires_at else None,
    }


# =============================================================================
# CONFIGURATION ENDPOINTS
# =============================================================================

@router.get("/config/industries")
async def get_industry_options():
    """Get available industry options for analysis configuration."""
    orchestrator = get_orchestrator()
    return {"industries": orchestrator.get_industry_options()}


@router.get("/config/export-formats")
async def get_export_formats():
    """Get available export formats."""
    orchestrator = get_orchestrator()
    return {"formats": orchestrator.get_export_formats()}


@router.get("/config/chart-types")
async def get_chart_types():
    """Get available chart types."""
    return {
        "chart_types": [
            {"value": ct.value, "label": ct.value.replace("_", " ").title()}
            for ct in ChartType
        ]
    }


@router.get("/config/summary-modes")
async def get_summary_modes():
    """Get available summary modes."""
    return {
        "modes": [
            {
                "value": sm.value,
                "label": sm.value.replace("_", " ").title(),
                "description": {
                    "executive": "C-suite 3-bullet overview",
                    "data": "Key figures and trends",
                    "quick": "One sentence essence",
                    "comprehensive": "Full structured analysis",
                    "action_items": "To-dos and next steps",
                    "risks": "Potential issues and concerns",
                    "opportunities": "Growth areas identified",
                }.get(sm.value, ""),
            }
            for sm in SummaryMode
        ]
    }
