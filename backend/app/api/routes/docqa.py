"""API routes for Document Q&A Chat."""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Request, HTTPException

from backend.app.core.security import require_api_key
from backend.app.domain.docqa.service import DocumentQAService
from backend.app.domain.docqa.schemas import AskRequest, FeedbackRequest, RegenerateRequest

router = APIRouter(dependencies=[Depends(require_api_key)])


class CreateSessionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class AddDocumentRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=10, max_length=200000)
    page_count: Optional[int] = None


def get_service() -> DocumentQAService:
    return DocumentQAService()


@router.post("/sessions")
async def create_session(
    payload: CreateSessionRequest,
    request: Request,
    svc: DocumentQAService = Depends(get_service),
):
    """Create a new Q&A session."""
    correlation_id = getattr(request.state, "correlation_id", None)
    session = svc.create_session(
        name=payload.name,
        correlation_id=correlation_id,
    )
    return {"status": "ok", "session": session.model_dump(mode="json"), "correlation_id": correlation_id}


@router.get("/sessions")
async def list_sessions(
    request: Request,
    svc: DocumentQAService = Depends(get_service),
):
    """List all Q&A sessions."""
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
    svc: DocumentQAService = Depends(get_service),
):
    """Get a Q&A session by ID."""
    correlation_id = getattr(request.state, "correlation_id", None)
    session = svc.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"status": "ok", "session": session.model_dump(mode="json"), "correlation_id": correlation_id}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    request: Request,
    svc: DocumentQAService = Depends(get_service),
):
    """Delete a Q&A session."""
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
    svc: DocumentQAService = Depends(get_service),
):
    """Add a document to a Q&A session."""
    correlation_id = getattr(request.state, "correlation_id", None)
    document = svc.add_document(
        session_id=session_id,
        name=payload.name,
        content=payload.content,
        page_count=payload.page_count,
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
    svc: DocumentQAService = Depends(get_service),
):
    """Remove a document from a session."""
    correlation_id = getattr(request.state, "correlation_id", None)
    success = svc.remove_document(session_id, document_id)

    if not success:
        raise HTTPException(status_code=404, detail="Session or document not found")

    return {"status": "ok", "removed": True, "correlation_id": correlation_id}


@router.post("/sessions/{session_id}/ask")
async def ask_question(
    session_id: str,
    payload: AskRequest,
    request: Request,
    svc: DocumentQAService = Depends(get_service),
):
    """Ask a question about the documents in a session."""
    correlation_id = getattr(request.state, "correlation_id", None)

    session = svc.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    response = svc.ask(session_id, payload, correlation_id)

    if not response:
        raise HTTPException(status_code=500, detail="Failed to process question")

    return {
        "status": "ok",
        "response": response.model_dump(mode="json"),
        "correlation_id": correlation_id,
    }


@router.post("/sessions/{session_id}/messages/{message_id}/feedback")
async def submit_feedback(
    session_id: str,
    message_id: str,
    payload: FeedbackRequest,
    request: Request,
    svc: DocumentQAService = Depends(get_service),
):
    """Submit feedback for a chat message."""
    correlation_id = getattr(request.state, "correlation_id", None)

    session = svc.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    message = svc.submit_feedback(
        session_id,
        message_id,
        payload,
        correlation_id,
    )

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return {
        "status": "ok",
        "message": message.model_dump(mode="json"),
        "correlation_id": correlation_id,
    }


@router.post("/sessions/{session_id}/messages/{message_id}/regenerate")
async def regenerate_response(
    session_id: str,
    message_id: str,
    payload: RegenerateRequest,
    request: Request,
    svc: DocumentQAService = Depends(get_service),
):
    """Regenerate a response for a message."""
    correlation_id = getattr(request.state, "correlation_id", None)

    session = svc.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        response = svc.regenerate_response(
            session_id,
            message_id,
            payload,
            correlation_id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not response:
        raise HTTPException(status_code=404, detail="Message not found")

    return {
        "status": "ok",
        "response": response.model_dump(mode="json"),
        "correlation_id": correlation_id,
    }


@router.get("/sessions/{session_id}/history")
async def get_chat_history(
    session_id: str,
    request: Request,
    limit: int = 50,
    svc: DocumentQAService = Depends(get_service),
):
    """Get chat history for a session."""
    correlation_id = getattr(request.state, "correlation_id", None)

    session = svc.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = svc.get_chat_history(session_id, limit)

    return {
        "status": "ok",
        "messages": [m.model_dump(mode="json") for m in messages],
        "count": len(messages),
        "correlation_id": correlation_id,
    }


@router.delete("/sessions/{session_id}/history")
async def clear_chat_history(
    session_id: str,
    request: Request,
    svc: DocumentQAService = Depends(get_service),
):
    """Clear chat history for a session."""
    correlation_id = getattr(request.state, "correlation_id", None)

    success = svc.clear_history(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"status": "ok", "cleared": True, "correlation_id": correlation_id}
