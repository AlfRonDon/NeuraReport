"""Multi-Document Synthesis domain module."""
from .schemas import (
    SynthesisSession,
    SynthesisDocument,
    SynthesisRequest,
    SynthesisResult,
    Inconsistency,
)
from .service import DocumentSynthesisService

__all__ = [
    "SynthesisSession",
    "SynthesisDocument",
    "SynthesisRequest",
    "SynthesisResult",
    "Inconsistency",
    "DocumentSynthesisService",
]
