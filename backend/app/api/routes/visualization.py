"""
Visualization & Diagrams API Routes
Endpoints for generating charts, diagrams, and visual representations.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.services.visualization import visualization_service
from backend.app.services.visualization.service import (
    DiagramType, ChartType, TimelineEvent, GanttTask,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# REQUEST MODELS
# =============================================================================

class FlowchartRequest(BaseModel):
    description: str = Field(..., description="Process description")
    title: Optional[str] = Field(default=None, description="Flowchart title")


class MindmapRequest(BaseModel):
    content: str = Field(..., description="Document content")
    title: Optional[str] = Field(default=None, description="Central topic")
    max_depth: int = Field(default=3, ge=1, le=5, description="Max depth")


class OrgChartRequest(BaseModel):
    org_data: List[Dict[str, Any]] = Field(..., description="Organization data")
    title: Optional[str] = Field(default=None, description="Chart title")


class TimelineRequest(BaseModel):
    events: List[Dict[str, Any]] = Field(..., description="Timeline events")
    title: Optional[str] = Field(default=None, description="Timeline title")


class GanttRequest(BaseModel):
    tasks: List[Dict[str, Any]] = Field(..., description="Project tasks")
    title: Optional[str] = Field(default=None, description="Chart title")


class NetworkGraphRequest(BaseModel):
    relationships: List[Dict[str, Any]] = Field(..., description="Relationships")
    title: Optional[str] = Field(default=None, description="Graph title")


class KanbanRequest(BaseModel):
    items: List[Dict[str, Any]] = Field(..., description="Kanban items")
    columns: Optional[List[str]] = Field(default=None, description="Column names")
    title: Optional[str] = Field(default=None, description="Board title")


class SequenceDiagramRequest(BaseModel):
    interactions: List[Dict[str, Any]] = Field(..., description="Interactions")
    title: Optional[str] = Field(default=None, description="Diagram title")


class WordcloudRequest(BaseModel):
    text: str = Field(..., description="Source text")
    max_words: int = Field(default=100, ge=10, le=500, description="Max words")
    title: Optional[str] = Field(default=None, description="Title")


class TableToChartRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(..., description="Table data")
    chart_type: str = Field(default="bar", description="Chart type")
    x_column: Optional[str] = Field(default=None, description="X axis column")
    y_columns: Optional[List[str]] = Field(default=None, description="Y axis columns")
    title: Optional[str] = Field(default=None, description="Chart title")


class SparklineRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(..., description="Data rows")
    value_columns: List[str] = Field(..., description="Columns for sparklines")


# =============================================================================
# DIAGRAM ENDPOINTS
# =============================================================================

@router.post("/diagrams/flowchart")
async def generate_flowchart(request: FlowchartRequest):
    """
    Generate a flowchart from a process description.

    Returns:
        DiagramSpec for the flowchart
    """
    try:
        result = await visualization_service.generate_flowchart(
            description=request.description,
            title=request.title,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Flowchart generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/diagrams/mindmap")
async def generate_mindmap(request: MindmapRequest):
    """
    Generate a mind map from document content.

    Returns:
        DiagramSpec for the mind map
    """
    try:
        result = await visualization_service.generate_mindmap(
            document_content=request.content,
            title=request.title,
            max_depth=request.max_depth,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Mindmap generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/diagrams/org-chart")
async def generate_org_chart(request: OrgChartRequest):
    """
    Generate an organization chart.

    Returns:
        DiagramSpec for the org chart
    """
    try:
        result = await visualization_service.generate_org_chart(
            org_data=request.org_data,
            title=request.title,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Org chart generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/diagrams/timeline")
async def generate_timeline(request: TimelineRequest):
    """
    Generate a timeline visualization.

    Returns:
        DiagramSpec for the timeline
    """
    try:
        events = [TimelineEvent(**e) for e in request.events]
        result = await visualization_service.generate_timeline(
            events=events,
            title=request.title,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Timeline generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/diagrams/gantt")
async def generate_gantt(request: GanttRequest):
    """
    Generate a Gantt chart.

    Returns:
        DiagramSpec for the Gantt chart
    """
    try:
        tasks = [GanttTask(**t) for t in request.tasks]
        result = await visualization_service.generate_gantt(
            tasks=tasks,
            title=request.title,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Gantt generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/diagrams/network")
async def generate_network_graph(request: NetworkGraphRequest):
    """
    Generate a network/relationship graph.

    Returns:
        DiagramSpec for the network graph
    """
    try:
        result = await visualization_service.generate_network_graph(
            relationships=request.relationships,
            title=request.title,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Network graph generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/diagrams/kanban")
async def generate_kanban(request: KanbanRequest):
    """
    Generate a Kanban board visualization.

    Returns:
        DiagramSpec for the Kanban board
    """
    try:
        result = await visualization_service.generate_kanban(
            items=request.items,
            columns=request.columns,
            title=request.title,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Kanban generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/diagrams/sequence")
async def generate_sequence_diagram(request: SequenceDiagramRequest):
    """
    Generate a sequence diagram.

    Returns:
        DiagramSpec for the sequence diagram
    """
    try:
        result = await visualization_service.generate_sequence_diagram(
            interactions=request.interactions,
            title=request.title,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Sequence diagram generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/diagrams/wordcloud")
async def generate_wordcloud(request: WordcloudRequest):
    """
    Generate a word cloud from text.

    Returns:
        DiagramSpec for the word cloud
    """
    try:
        result = await visualization_service.generate_wordcloud(
            text=request.text,
            max_words=request.max_words,
            title=request.title,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Wordcloud generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# CHART ENDPOINTS
# =============================================================================

@router.post("/charts/from-table")
async def table_to_chart(request: TableToChartRequest):
    """
    Convert table data to a chart.

    Returns:
        ChartSpec for the chart
    """
    try:
        chart_type = ChartType(request.chart_type) if request.chart_type in [t.value for t in ChartType] else ChartType.BAR

        result = await visualization_service.table_to_chart(
            data=request.data,
            chart_type=chart_type,
            x_column=request.x_column,
            y_columns=request.y_columns,
            title=request.title,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Chart generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/charts/sparklines")
async def generate_sparklines(request: SparklineRequest):
    """
    Generate inline sparkline charts.

    Returns:
        List of ChartSpecs for sparklines
    """
    try:
        results = await visualization_service.generate_sparklines(
            data=request.data,
            value_columns=request.value_columns,
        )
        return [r.model_dump() for r in results]
    except Exception as e:
        logger.error(f"Sparkline generation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# EXPORT ENDPOINTS
# =============================================================================

@router.get("/diagrams/{diagram_id}/mermaid")
async def export_as_mermaid(diagram_id: str):
    """
    Export diagram as Mermaid.js syntax.

    Returns:
        Mermaid.js code
    """
    try:
        code = await visualization_service.export_diagram_as_mermaid(diagram_id)
        return {"mermaid_code": code}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Mermaid export failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@router.get("/types/diagrams")
async def list_diagram_types():
    """List available diagram types."""
    return {"types": [t.value for t in DiagramType]}


@router.get("/types/charts")
async def list_chart_types():
    """List available chart types."""
    return {"types": [t.value for t in ChartType]}
