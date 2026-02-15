# Document Schemas
"""
Pydantic schemas for document operations.
"""

from .document import (
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

__all__ = [
    "CreateDocumentRequest",
    "UpdateDocumentRequest",
    "DocumentResponse",
    "DocumentListResponse",
    "CommentRequest",
    "CommentResponse",
    "CollaborationSessionResponse",
    "PDFMergeRequest",
    "PDFWatermarkRequest",
    "PDFRedactRequest",
    "PDFReorderRequest",
    "AIWritingRequest",
    "AIWritingResponse",
]
