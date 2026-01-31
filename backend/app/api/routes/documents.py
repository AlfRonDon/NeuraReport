"""
Document API Routes - Document editing and collaboration endpoints.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from backend.app.services.config import get_settings
from backend.app.services.validation import validate_path_safety
from ...schemas.documents import (
    CreateDocumentRequest,
    UpdateDocumentRequest,
    DocumentResponse,
    DocumentListResponse,
    CommentRequest,
    CommentResponse,
    CollaborationSessionResponse,
    PDFMergeRequest,
    PDFWatermarkRequest,
    PDFRedactRequest,
    PDFReorderRequest,
    AIWritingRequest,
    AIWritingResponse,
)
from ...services.documents import (
    DocumentService,
    CollaborationService,
    PDFOperationsService,
)
from ...services.documents.collaboration import YjsWebSocketHandler
from backend.app.services.security import require_api_key, verify_ws_token
from backend.app.api.middleware import limiter, RATE_LIMIT_STANDARD

logger = logging.getLogger("neura.api.documents")

router = APIRouter(tags=["documents"], dependencies=[Depends(require_api_key)])
ws_router = APIRouter()

# Service instances (would use dependency injection in production)
_doc_service: Optional[DocumentService] = None
_collab_service: Optional[CollaborationService] = None
_pdf_service: Optional[PDFOperationsService] = None
_ws_handler: Optional[YjsWebSocketHandler] = None


def get_document_service() -> DocumentService:
    global _doc_service
    if _doc_service is None:
        _doc_service = DocumentService()
    return _doc_service


def get_collaboration_service() -> CollaborationService:
    global _collab_service
    if _collab_service is None:
        _collab_service = CollaborationService()
    return _collab_service


def get_ws_handler() -> YjsWebSocketHandler:
    global _ws_handler
    if _ws_handler is None:
        _ws_handler = YjsWebSocketHandler(get_collaboration_service())
    return _ws_handler


def _resolve_ws_base_url(request: Request) -> str:
    scheme = "wss" if request.url.scheme == "https" else "ws"
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "localhost:8000"
    return f"{scheme}://{host}"


def get_pdf_service() -> PDFOperationsService:
    global _pdf_service
    if _pdf_service is None:
        _pdf_service = PDFOperationsService()
    return _pdf_service


def validate_pdf_path(pdf_path: str | None) -> Path:
    """Validate that a PDF path is safe and within allowed directories."""
    if not pdf_path:
        raise HTTPException(status_code=400, detail="Document is not a PDF")

    # Check for dangerous path patterns
    is_safe, error = validate_path_safety(pdf_path)
    if not is_safe:
        logger.warning(f"Blocked unsafe PDF path: {pdf_path} - {error}")
        raise HTTPException(status_code=400, detail="Invalid PDF path")

    path = Path(pdf_path)

    # Resolve to absolute path and verify it's within allowed directories
    try:
        resolved = path.resolve()
        settings = get_settings()
        uploads_root = Path(settings.uploads_dir).resolve()
        excel_root = Path(settings.excel_uploads_dir).resolve()

        # Check if path is within allowed directories
        try:
            resolved.relative_to(uploads_root)
        except ValueError:
            try:
                resolved.relative_to(excel_root)
            except ValueError:
                logger.warning(f"PDF path outside allowed directories: {resolved}")
                raise HTTPException(status_code=400, detail="PDF not accessible")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.warning(f"Failed to validate PDF path: {pdf_path} - {e}")
        raise HTTPException(status_code=400, detail="Invalid PDF path")

    if not resolved.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")

    return resolved


# ============================================
# Document CRUD Endpoints
# ============================================

@router.post("", response_model=DocumentResponse)
@limiter.limit(RATE_LIMIT_STANDARD)
async def create_document(
    request: Request,
    req: CreateDocumentRequest,
    doc_service: DocumentService = Depends(get_document_service),
):
    """Create a new document."""
    content_payload = req.content.model_dump() if req.content else None
    doc = doc_service.create(
        name=req.name,
        content=content_payload,
        is_template=req.is_template,
        metadata=req.metadata,
    )
    return DocumentResponse(**doc.model_dump())


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    is_template: Optional[bool] = Query(None),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    doc_service: DocumentService = Depends(get_document_service),
):
    """List documents with optional filters."""
    tag_list = tags.split(",") if tags else None
    documents, total = doc_service.list_documents(
        is_template=is_template,
        tags=tag_list,
        limit=limit,
        offset=offset,
    )
    return DocumentListResponse(
        documents=[DocumentResponse(**d.model_dump()) for d in documents],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    doc_service: DocumentService = Depends(get_document_service),
):
    """Get a document by ID."""
    doc = doc_service.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(**doc.model_dump())


@router.put("/{document_id}", response_model=DocumentResponse)
@limiter.limit(RATE_LIMIT_STANDARD)
async def update_document(
    request: Request,
    document_id: str,
    req: UpdateDocumentRequest,
    doc_service: DocumentService = Depends(get_document_service),
):
    """Update a document."""
    content_payload = req.content.model_dump() if req.content else None
    doc = doc_service.update(
        document_id=document_id,
        name=req.name,
        content=content_payload,
        metadata=req.metadata,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(**doc.model_dump())


@router.delete("/{document_id}")
@limiter.limit(RATE_LIMIT_STANDARD)
async def delete_document(
    request: Request,
    document_id: str,
    doc_service: DocumentService = Depends(get_document_service),
):
    """Delete a document."""
    success = doc_service.delete(document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "ok", "message": "Document deleted"}


# ============================================
# Version History Endpoints
# ============================================

@router.get("/{document_id}/versions")
async def get_document_versions(
    document_id: str,
    doc_service: DocumentService = Depends(get_document_service),
):
    """Get version history for a document."""
    doc = doc_service.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    versions = doc_service.get_versions(document_id)
    return {"versions": [v.model_dump() for v in versions]}


@router.get("/{document_id}/versions/{version}")
async def get_document_version(
    document_id: str,
    version: int,
    doc_service: DocumentService = Depends(get_document_service),
):
    """Get a specific version of a document."""
    versions = doc_service.get_versions(document_id)
    for v in versions:
        if v.version == version:
            return v.model_dump()
    raise HTTPException(status_code=404, detail="Version not found")


# ============================================
# Comment Endpoints
# ============================================

@router.post("/{document_id}/comments", response_model=CommentResponse)
async def add_comment(
    document_id: str,
    request: CommentRequest,
    doc_service: DocumentService = Depends(get_document_service),
):
    """Add a comment to a document."""
    comment = doc_service.add_comment(
        document_id=document_id,
        selection_start=request.selection_start,
        selection_end=request.selection_end,
        text=request.text,
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Document not found")
    return CommentResponse(**comment.model_dump())


@router.get("/{document_id}/comments")
async def get_comments(
    document_id: str,
    doc_service: DocumentService = Depends(get_document_service),
):
    """Get all comments for a document."""
    comments = doc_service.get_comments(document_id)
    return {"comments": [c.model_dump() for c in comments]}


@router.patch("/{document_id}/comments/{comment_id}/resolve")
async def resolve_comment(
    document_id: str,
    comment_id: str,
    doc_service: DocumentService = Depends(get_document_service),
):
    """Resolve a comment."""
    success = doc_service.resolve_comment(document_id, comment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"status": "ok", "message": "Comment resolved"}


# ============================================
# Collaboration Endpoints
# ============================================

@router.post("/{document_id}/collaborate", response_model=CollaborationSessionResponse)
async def start_collaboration(
    document_id: str,
    request: Request,
    collab_service: CollaborationService = Depends(get_collaboration_service),
    doc_service: DocumentService = Depends(get_document_service),
):
    """Start a collaboration session for a document."""
    doc = doc_service.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    collab_service.set_websocket_base_url(_resolve_ws_base_url(request))
    session = collab_service.start_session(document_id)
    return CollaborationSessionResponse(**session.model_dump())


@router.get("/{document_id}/collaborate/presence")
async def get_collaboration_presence(
    document_id: str,
    collab_service: CollaborationService = Depends(get_collaboration_service),
):
    """Get current collaborators for a document."""
    session = collab_service.get_session_by_document(document_id)
    if not session:
        return {"collaborators": []}

    presence = collab_service.get_presence(session.id)
    return {"collaborators": [p.model_dump() for p in presence]}


# ============================================
# Collaboration WebSocket Endpoint
# ============================================

@ws_router.websocket("/ws/collab/{document_id}")
async def collaboration_socket(
    websocket: WebSocket,
    document_id: str,
    user_id: str | None = Query(None),
    token: str | None = Query(None),
):
    """
    WebSocket endpoint for Y.js collaboration.

    Requires authentication via token query parameter (e.g., ?token=YOUR_API_KEY).
    WebSocket connections cannot use HTTP headers for auth, so the token is passed as a query param.
    """
    # Verify authentication before accepting the WebSocket connection
    if not verify_ws_token(token):
        await websocket.close(code=1008, reason="Unauthorized")
        return

    handler = get_ws_handler()
    session_user_id = user_id or str(uuid.uuid4())
    try:
        await handler.handle_connection(websocket, document_id, session_user_id)
    except WebSocketDisconnect:
        return


# ============================================
# PDF Operation Endpoints
# ============================================

@router.post("/{document_id}/pdf/reorder")
async def reorder_pdf_pages(
    document_id: str,
    request: PDFReorderRequest,
    pdf_service: PDFOperationsService = Depends(get_pdf_service),
    doc_service: DocumentService = Depends(get_document_service),
):
    """Reorder pages in a PDF document."""
    doc = doc_service.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Validate and resolve PDF path safely
    pdf_path = validate_pdf_path(doc.metadata.get("pdf_path"))

    try:
        output_path = pdf_service.reorder_pages(pdf_path, request.page_order)
        return {"status": "ok", "output_path": str(output_path)}
    except Exception as e:
        logger.exception("pdf_reorder_failed", extra={"document_id": document_id})
        raise HTTPException(status_code=500, detail="PDF page reorder failed")


@router.post("/{document_id}/pdf/watermark")
async def add_watermark(
    document_id: str,
    request: PDFWatermarkRequest,
    pdf_service: PDFOperationsService = Depends(get_pdf_service),
    doc_service: DocumentService = Depends(get_document_service),
):
    """Add watermark to a PDF document."""
    doc = doc_service.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Validate and resolve PDF path safely
    pdf_path = validate_pdf_path(doc.metadata.get("pdf_path"))

    try:
        from ...services.documents.pdf_operations import WatermarkConfig
        config = WatermarkConfig(
            text=request.text,
            position=request.position,
            font_size=request.font_size,
            opacity=request.opacity,
            color=request.color,
        )
        output_path = pdf_service.add_watermark(pdf_path, config)
        return {"status": "ok", "output_path": str(output_path)}
    except Exception as e:
        logger.exception("pdf_watermark_failed", extra={"document_id": document_id})
        raise HTTPException(status_code=500, detail="PDF watermark failed")


@router.post("/{document_id}/pdf/redact")
async def redact_pdf(
    document_id: str,
    request: PDFRedactRequest,
    pdf_service: PDFOperationsService = Depends(get_pdf_service),
    doc_service: DocumentService = Depends(get_document_service),
):
    """Redact regions in a PDF document."""
    doc = doc_service.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Validate and resolve PDF path safely
    pdf_path = validate_pdf_path(doc.metadata.get("pdf_path"))

    try:
        from ...services.documents.pdf_operations import RedactionRegion
        regions = [
            RedactionRegion(
                page=r.page,
                x=r.x,
                y=r.y,
                width=r.width,
                height=r.height,
            )
            for r in request.regions
        ]
        output_path = pdf_service.redact_regions(pdf_path, regions)
        return {"status": "ok", "output_path": str(output_path)}
    except Exception as e:
        logger.exception("pdf_redact_failed", extra={"document_id": document_id})
        raise HTTPException(status_code=500, detail="PDF redaction failed")


@router.post("/merge")
async def merge_pdfs(
    request: PDFMergeRequest,
    pdf_service: PDFOperationsService = Depends(get_pdf_service),
    doc_service: DocumentService = Depends(get_document_service),
):
    """Merge multiple PDF documents into one."""
    pdf_paths = []
    for doc_id in request.document_ids:
        doc = doc_service.get(doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
        # Validate each PDF path safely
        validated_path = validate_pdf_path(doc.metadata.get("pdf_path"))
        pdf_paths.append(validated_path)

    try:
        result = pdf_service.merge_pdfs(pdf_paths)
        return {
            "status": "ok",
            "output_path": result.output_path,
            "page_count": result.page_count,
        }
    except Exception as e:
        logger.exception("pdf_merge_failed")
        raise HTTPException(status_code=500, detail="PDF merge failed")


# ============================================
# AI Writing Endpoints
# ============================================

@router.post("/{document_id}/ai/grammar", response_model=AIWritingResponse)
async def check_grammar(
    document_id: str,
    request: AIWritingRequest,
):
    """Check grammar and spelling in text."""
    # TODO: Implement with OpenAI
    return AIWritingResponse(
        original_text=request.text,
        result_text=request.text,
        suggestions=[],
        metadata={"operation": "grammar_check"},
    )


@router.post("/{document_id}/ai/summarize", response_model=AIWritingResponse)
async def summarize_text(
    document_id: str,
    request: AIWritingRequest,
):
    """Summarize text content."""
    # TODO: Implement with OpenAI
    return AIWritingResponse(
        original_text=request.text,
        result_text=request.text[:200] + "...",
        metadata={"operation": "summarize"},
    )


@router.post("/{document_id}/ai/rewrite", response_model=AIWritingResponse)
async def rewrite_text(
    document_id: str,
    request: AIWritingRequest,
):
    """Rewrite text for clarity or different tone."""
    # TODO: Implement with OpenAI
    return AIWritingResponse(
        original_text=request.text,
        result_text=request.text,
        metadata={"operation": "rewrite"},
    )


@router.post("/{document_id}/ai/expand", response_model=AIWritingResponse)
async def expand_text(
    document_id: str,
    request: AIWritingRequest,
):
    """Expand bullet points or short text into paragraphs."""
    # TODO: Implement with OpenAI
    return AIWritingResponse(
        original_text=request.text,
        result_text=request.text,
        metadata={"operation": "expand"},
    )


@router.post("/{document_id}/ai/translate", response_model=AIWritingResponse)
async def translate_text(
    document_id: str,
    request: AIWritingRequest,
):
    """Translate text to another language."""
    target_language = request.options.get("target_language", "Spanish")
    # TODO: Implement with OpenAI
    return AIWritingResponse(
        original_text=request.text,
        result_text=request.text,
        metadata={"operation": "translate", "target_language": target_language},
    )
