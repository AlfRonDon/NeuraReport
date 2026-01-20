# mypy: ignore-errors
"""API routes for document analysis."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse

from backend.app.core.config import get_settings
from backend.app.core.validation import validate_file_extension
from backend.app.features.analyze.schemas.analysis import AnalysisSuggestChartsPayload
from backend.app.features.analyze.services.document_analysis_service import (
    analyze_document_streaming,
    get_analysis,
    get_analysis_data,
    suggest_charts_for_analysis,
)

logger = logging.getLogger("neura.analyze.routes")

router = APIRouter()

ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".xlsm"]
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
    "application/octet-stream",
}
MAX_FILENAME_LENGTH = 255
READ_CHUNK_BYTES = 1024 * 1024
MAX_ANALYSIS_DATA_LIMIT = 2000


def _validate_upload(file: UploadFile) -> str:
    filename = Path(file.filename or "").name
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    if len(filename) > MAX_FILENAME_LENGTH:
        raise HTTPException(status_code=400, detail=f"Filename too long (max {MAX_FILENAME_LENGTH} characters)")
    is_valid, error = validate_file_extension(filename, ALLOWED_EXTENSIONS)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported content type '{file.content_type}'",
        )
    return filename


async def _read_upload_with_limit(upload: UploadFile, max_bytes: int) -> bytes:
    size = 0
    chunks: list[bytes] = []
    while True:
        chunk = await upload.read(READ_CHUNK_BYTES)
        if not chunk:
            break
        size += len(chunk)
        if size > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {max_bytes} bytes.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


async def _streaming_generator(
    file_bytes: bytes,
    file_name: str,
    template_id: Optional[str],
    connection_id: Optional[str],
    correlation_id: Optional[str],
):
    """Generate NDJSON streaming response."""
    try:
        async for event in analyze_document_streaming(
            file_bytes=file_bytes,
            file_name=file_name,
            template_id=template_id,
            connection_id=connection_id,
            correlation_id=correlation_id,
        ):
            yield json.dumps(event) + "\n"
    except Exception as exc:
        logger.exception(
            "analysis_stream_failed",
            extra={"event": "analysis_stream_failed", "error": str(exc), "correlation_id": correlation_id},
        )
        error_event = {
            "event": "error",
            "detail": "Analysis failed. Please try again.",
        }
        if correlation_id:
            error_event["correlation_id"] = correlation_id
        yield json.dumps(error_event) + "\n"


@router.post("/upload")
async def upload_and_analyze(
    request: Request,
    file: UploadFile = File(...),
    template_id: Optional[str] = Form(None),
    connection_id: Optional[str] = Form(None),
):
    """
    Upload a document (PDF or Excel) and analyze it with AI.

    Returns a streaming NDJSON response with progress updates and final results.

    Events:
    - stage: Progress update with stage name and percentage
    - error: Error occurred, includes detail message
    - result: Final analysis result
    """
    settings = get_settings()
    file_name = _validate_upload(file)
    try:
        file_bytes = await _read_upload_with_limit(file, settings.max_upload_bytes)
    finally:
        await file.close()

    return StreamingResponse(
        _streaming_generator(
            file_bytes,
            file_name,
            template_id,
            connection_id,
            getattr(request.state, "correlation_id", None),
        ),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{analysis_id}")
async def get_analysis_result(analysis_id: str, request: Request):
    """Get a previously computed analysis result."""
    result = get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "status": "ok",
        **result.dict(),
        "correlation_id": getattr(request.state, "correlation_id", None),
    }


@router.get("/{analysis_id}/data")
async def get_analysis_raw_data(
    analysis_id: str,
    request: Request,
    limit: int = Query(500, ge=1, le=MAX_ANALYSIS_DATA_LIMIT),
    offset: int = Query(0, ge=0),
):
    """Get raw data from an analysis for charting."""
    data = get_analysis_data(analysis_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    paginated = data[offset:offset + limit]

    return {
        "status": "ok",
        "analysis_id": analysis_id,
        "data": paginated,
        "total": len(data),
        "offset": offset,
        "limit": limit,
        "correlation_id": getattr(request.state, "correlation_id", None),
    }


@router.post("/{analysis_id}/charts/suggest")
async def suggest_charts(
    analysis_id: str,
    payload: AnalysisSuggestChartsPayload,
    request: Request,
):
    """Generate additional chart suggestions for an existing analysis."""
    result = get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")

    charts = suggest_charts_for_analysis(analysis_id, payload)

    sample_data = result.raw_data[:100] if payload.include_sample_data else None

    return {
        "status": "ok",
        "analysis_id": analysis_id,
        "charts": [c.dict() for c in charts],
        "sample_data": sample_data,
        "correlation_id": getattr(request.state, "correlation_id", None),
    }


__all__ = ["router"]
