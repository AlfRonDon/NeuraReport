"""Report generation routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from backend.api.dependencies import get_dependencies, get_report_pipeline
from backend.domain.reports import OutputFormat, RenderRequest
from backend.pipelines import ReportPipeline

router = APIRouter()


class RunReportRequest(BaseModel):
    """Request to run a report."""

    template_id: str
    connection_id: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    batch_ids: Optional[List[str]] = None
    output_formats: List[str] = ["html", "pdf"]
    docx: bool = False
    xlsx: bool = False


class RunReportResponse(BaseModel):
    """Response from running a report."""

    ok: bool
    report_id: Optional[str] = None
    template_id: str
    html_url: Optional[str] = None
    pdf_url: Optional[str] = None
    docx_url: Optional[str] = None
    xlsx_url: Optional[str] = None
    error: Optional[str] = None


@router.post("/run")
async def run_report(
    request: RunReportRequest,
    http_request: Request,
    pipeline: ReportPipeline = Depends(get_report_pipeline),
) -> RunReportResponse:
    """Run a report synchronously."""
    deps = get_dependencies()

    # Find template and contract paths
    template_dir = deps.config.upload_root / request.template_id
    if not template_dir.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    template_path = template_dir / "report_final.html"
    if not template_path.exists():
        template_path = template_dir / "template_p1.html"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template HTML not found")

    contract_path = template_dir / "contract.json"
    if not contract_path.exists():
        raise HTTPException(
            status_code=400,
            detail="Contract not found. Complete template mapping first.",
        )

    # Determine output formats
    formats = []
    if "html" in request.output_formats:
        formats.append(OutputFormat.HTML)
    if "pdf" in request.output_formats:
        formats.append(OutputFormat.PDF)
    if request.docx or "docx" in request.output_formats:
        formats.append(OutputFormat.DOCX)
    if request.xlsx or "xlsx" in request.output_formats:
        formats.append(OutputFormat.XLSX)

    # Create render request
    render_request = RenderRequest(
        template_id=request.template_id,
        connection_id=request.connection_id,
        start_date=request.start_date,
        end_date=request.end_date,
        batch_ids=request.batch_ids,
        output_formats=formats,
    )

    # TODO: Get db_path from connection repository
    from pathlib import Path
    db_path = Path("./runtime/data.db")  # Placeholder

    try:
        report = pipeline.execute(
            render_request,
            template_path,
            contract_path,
            db_path,
            correlation_id=getattr(http_request.state, "correlation_id", None),
        )

        # Build response URLs
        urls = {}
        for output in report.outputs:
            key = f"{output.format.value}_url"
            # Convert path to URL
            urls[key] = f"/uploads/{request.template_id}/{output.path.name}"

        return RunReportResponse(
            ok=True,
            report_id=report.report_id,
            template_id=request.template_id,
            html_url=urls.get("html_url"),
            pdf_url=urls.get("pdf_url"),
            docx_url=urls.get("docx_url"),
            xlsx_url=urls.get("xlsx_url"),
        )

    except Exception as e:
        return RunReportResponse(
            ok=False,
            template_id=request.template_id,
            error=str(e),
        )


@router.get("/history")
async def list_report_history(
    template_id: Optional[str] = None,
    limit: int = 50,
):
    """List report run history."""
    # Would load from report repository
    return {"runs": [], "count": 0}


@router.get("/{report_id}")
async def get_report(report_id: str):
    """Get details of a specific report run."""
    # Would load from report repository
    raise HTTPException(status_code=404, detail="Report not found")
