"""Schemas for Document Q&A Chat."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Citation(BaseModel):
    """A citation to a document source."""

    document_id: str
    document_name: str
    page_number: Optional[int] = None
    section: Optional[str] = None
    quote: str
    relevance_score: float = Field(default=1.0, ge=0.0, le=1.0)


class ChatMessage(BaseModel):
    """A message in the Q&A chat."""

    id: str
    role: MessageRole
    content: str
    citations: List[Citation] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentReference(BaseModel):
    """A document added to a Q&A session."""

    id: str
    name: str
    content_preview: str
    full_content: str
    page_count: Optional[int] = None
    added_at: datetime = Field(default_factory=datetime.utcnow)


class DocQASession(BaseModel):
    """A Document Q&A chat session."""

    id: str
    name: str
    documents: List[DocumentReference] = Field(default_factory=list)
    messages: List[ChatMessage] = Field(default_factory=list)
    context_window: int = Field(default=10)  # Messages to include in context
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AskRequest(BaseModel):
    """Request to ask a question."""

    question: str = Field(..., min_length=3, max_length=2000)
    include_citations: bool = Field(default=True)
    max_response_length: int = Field(default=2000, ge=100, le=10000)


class AskResponse(BaseModel):
    """Response to a question."""

    message: ChatMessage
    processing_time_ms: int
    tokens_used: Optional[int] = None
