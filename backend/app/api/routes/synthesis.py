"""API routes for Multi-Document Synthesis."""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Request, HTTPException

from backend.app.core.security import require_api_key
from backend.app.domain.synthesis.service import DocumentSynthesisService
from backend.app.domain.synthesis.schemas import DocumentType, SynthesisRequest

router = APIRouter(dependencies=[Depends(require_api_key)])


class CreateSessionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class AddDocumentRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=10, max_length=5 * 1024 * 1024)
    doc_type: DocumentType = Field(default=DocumentType.TEXT)
    metadata: Optional[dict] = None


def get_service() -> DocumentSynthesisService:
    return DocumentSynthesisService()


@router.post("/sessions")
async def create_session(
    payload: CreateSessionRequest,
    request: Request,
    svc: DocumentSynthesisService = Depends(get_service),
):
    """Create a new synthesis session."""
    correlation_id = getattr(request.state, "correlation_id", None)
    session = svc.create_session(
        name=payload.name,
        correlation_id=correlation_id,
    )
    return {"status": "ok", "session": session.model_dump(mode="json"), "correlation_id": correlation_id}


@router.get("/sessions")
async def list_sessions(
    request: Request,
    svc: DocumentSynthesisService = Depends(get_service),
):
    """List all synthesis sessions."""
    correlation_id = getattr(request.state, "correlation_id", None)
    sessions = svc.list_sessions()
    return {
        "status": "ok",
        "sessions": [s.model_dump(mode="json") for s in sessions],
        "correlation_id": correlation_id,
    }


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    request: Request,
    svc: DocumentSynthesisService = Depends(get_service),
):
    """Get a synthesis session by ID."""
    correlation_id = getattr(request.state, "correlation_id", None)
    session = svc.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"status": "ok", "session": session.model_dump(mode="json"), "correlation_id": correlation_id}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    request: Request,
    svc: DocumentSynthesisService = Depends(get_service),
):
    """Delete a synthesis session."""
    correlation_id = getattr(request.state, "correlation_id", None)
    success = svc.delete_session(session_id)

    if not success:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"status": "ok", "deleted": True, "correlation_id": correlation_id}


@router.post("/sessions/{session_id}/documents")
async def add_document(
    session_id: str,
    payload: AddDocumentRequest,
    request: Request,
    svc: DocumentSynthesisService = Depends(get_service),
):
    """Add a document to a synthesis session."""
    correlation_id = getattr(request.state, "correlation_id", None)
    document = svc.add_document(
        session_id=session_id,
        name=payload.name,
        content=payload.content,
        doc_type=payload.doc_type,
        metadata=payload.metadata,
        correlation_id=correlation_id,
    )

    if not document:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"status": "ok", "document": document.model_dump(mode="json"), "correlation_id": correlation_id}


@router.delete("/sessions/{session_id}/documents/{document_id}")
async def remove_document(
    session_id: str,
    document_id: str,
    request: Request,
    svc: DocumentSynthesisService = Depends(get_service),
):
    """Remove a document from a session."""
    correlation_id = getattr(request.state, "correlation_id", None)
    success = svc.remove_document(session_id, document_id)

    if not success:
        raise HTTPException(status_code=404, detail="Session or document not found")

    return {"status": "ok", "removed": True, "correlation_id": correlation_id}


@router.get("/sessions/{session_id}/inconsistencies")
async def find_inconsistencies(
    session_id: str,
    request: Request,
    svc: DocumentSynthesisService = Depends(get_service),
):
    """Find inconsistencies between documents in a session."""
    correlation_id = getattr(request.state, "correlation_id", None)

    session = svc.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    inconsistencies = svc.find_inconsistencies(session_id, correlation_id)

    return {
        "status": "ok",
        "inconsistencies": [i.model_dump(mode="json") for i in inconsistencies],
        "count": len(inconsistencies),
        "correlation_id": correlation_id,
    }


@router.post("/sessions/{session_id}/synthesize")
async def synthesize_documents(
    session_id: str,
    payload: SynthesisRequest,
    request: Request,
    svc: DocumentSynthesisService = Depends(get_service),
):
    """Synthesize information from all documents in a session."""
    correlation_id = getattr(request.state, "correlation_id", None)

    session = svc.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.documents:
        raise HTTPException(status_code=400, detail="No documents in session")

    result = svc.synthesize(session_id, payload, correlation_id)

    if not result:
        raise HTTPException(status_code=500, detail="Synthesis failed")

    return {"status": "ok", "result": result.model_dump(mode="json"), "correlation_id": correlation_id}
