# mypy: ignore-errors
from __future__ import annotations

from .document_analysis_service import (
    analyze_document_streaming,
    get_analysis,
    get_analysis_data,
    suggest_charts_for_analysis,
)
from .extraction_pipeline import (
    ExtractedContent,
    extract_document_content,
    extract_pdf_content,
    extract_excel_content,
    format_content_for_llm,
)

# Create a convenience class reference
DocumentAnalysisService = type("DocumentAnalysisService", (), {
    "analyze_streaming": staticmethod(analyze_document_streaming),
    "get_analysis": staticmethod(get_analysis),
    "get_data": staticmethod(get_analysis_data),
    "suggest_charts": staticmethod(suggest_charts_for_analysis),
})

__all__ = [
    "DocumentAnalysisService",
    "analyze_document_streaming",
    "get_analysis",
    "get_analysis_data",
    "suggest_charts_for_analysis",
    "ExtractedContent",
    "extract_document_content",
    "extract_pdf_content",
    "extract_excel_content",
    "format_content_for_llm",
]
