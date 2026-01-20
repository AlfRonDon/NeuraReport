# mypy: ignore-errors
"""
Document Analysis Feature.

AI-powered extraction and analysis of PDF/Excel documents.
"""
from __future__ import annotations

from .services import (
    DocumentAnalysisService,
    analyze_document_streaming,
    get_analysis,
    get_analysis_data,
    suggest_charts_for_analysis,
    ExtractedContent,
    extract_document_content,
)
from .routes import router

__all__ = [
    "DocumentAnalysisService",
    "analyze_document_streaming",
    "get_analysis",
    "get_analysis_data",
    "suggest_charts_for_analysis",
    "ExtractedContent",
    "extract_document_content",
    "router",
]
