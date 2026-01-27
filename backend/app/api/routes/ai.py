"""
AI API Routes
Endpoints for AI-powered writing and spreadsheet assistance.

Error handling:
- 400: Invalid input (empty text, text too long, bad parameters)
- 422: Pydantic validation errors (handled by FastAPI)
- 500: Unexpected internal errors
- 503: AI service unavailable (circuit breaker open, provider down)
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from backend.app.services.ai import (
    writing_service,
    spreadsheet_ai_service,
    WritingService,
    SpreadsheetAIService,
)
from backend.app.services.ai.writing_service import (
    WritingTone,
    InputValidationError,
    LLMResponseError,
    LLMUnavailableError,
    WritingServiceError,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# HELPER — error mapping
# =============================================================================

def _handle_service_error(exc: Exception, operation: str) -> HTTPException:
    """Map service errors to appropriate HTTP status codes."""
    if isinstance(exc, InputValidationError):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    if isinstance(exc, LLMUnavailableError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is temporarily unavailable. Please try again shortly.",
        )
    if isinstance(exc, LLMResponseError):
        logger.error("%s: LLM response error: %s", operation, exc)
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{operation} failed: the AI returned an invalid response. Please retry.",
        )
    # Unexpected error
    logger.error("%s failed unexpectedly: %s", operation, exc, exc_info=True)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"{operation} failed due to an internal error.",
    )


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

# Writing AI Models
class GrammarCheckRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=100_000, description="Text to check")
    language: str = Field(default="en", min_length=2, max_length=10, description="Language code")
    strict: bool = Field(default=False, description="Enable strict mode")


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=100_000, description="Text to summarize")
    max_length: Optional[int] = Field(default=None, ge=10, le=10_000, description="Maximum words")
    style: str = Field(default="bullet_points", description="Output style")

    @field_validator("style")
    @classmethod
    def validate_style(cls, v: str) -> str:
        allowed = {"bullet_points", "paragraph", "executive"}
        if v not in allowed:
            raise ValueError(f"style must be one of: {', '.join(sorted(allowed))}")
        return v


class RewriteRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=100_000, description="Text to rewrite")
    tone: str = Field(default="professional", description="Target tone")
    preserve_meaning: bool = Field(default=True, description="Preserve original meaning")

    @field_validator("tone")
    @classmethod
    def validate_tone(cls, v: str) -> str:
        valid_tones = {t.value for t in WritingTone}
        if v not in valid_tones:
            raise ValueError(f"tone must be one of: {', '.join(sorted(valid_tones))}")
        return v


class ExpandRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50_000, description="Text to expand")
    target_length: Optional[int] = Field(default=None, ge=10, le=50_000, description="Target word count")
    add_examples: bool = Field(default=False, description="Include examples")
    add_details: bool = Field(default=True, description="Add explanatory details")


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=100_000, description="Text to translate")
    target_language: str = Field(..., min_length=2, max_length=50, description="Target language")
    source_language: Optional[str] = Field(default=None, min_length=2, max_length=50, description="Source language")
    preserve_formatting: bool = Field(default=True, description="Preserve formatting")


class GenerateContentRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=100_000, description="Content generation prompt")
    context: Optional[str] = Field(default=None, max_length=50_000, description="Additional context")
    tone: str = Field(default="professional", description="Target tone")
    max_length: Optional[int] = Field(default=None, ge=10, le=50_000, description="Maximum words")

    @field_validator("tone")
    @classmethod
    def validate_tone(cls, v: str) -> str:
        valid_tones = {t.value for t in WritingTone}
        if v not in valid_tones:
            raise ValueError(f"tone must be one of: {', '.join(sorted(valid_tones))}")
        return v


# Spreadsheet AI Models
class FormulaRequest(BaseModel):
    description: str = Field(..., min_length=3, max_length=2_000, description="Natural language description")
    context: Optional[str] = Field(default=None, max_length=5_000, description="Data context")
    spreadsheet_type: str = Field(default="excel", description="Spreadsheet type")

    @field_validator("spreadsheet_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"excel", "google_sheets", "libreoffice"}
        if v not in allowed:
            raise ValueError(f"spreadsheet_type must be one of: {', '.join(sorted(allowed))}")
        return v


class DataQualityRequest(BaseModel):
    data_sample: List[Dict[str, Any]] = Field(..., min_length=1, max_length=1_000, description="Data sample")
    column_info: Optional[Dict[str, str]] = Field(default=None, description="Column types")


class AnomalyRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(..., min_length=2, max_length=5_000, description="Data to analyze")
    columns_to_analyze: Optional[List[str]] = Field(default=None, description="Specific columns")
    sensitivity: str = Field(default="medium", description="Detection sensitivity")

    @field_validator("sensitivity")
    @classmethod
    def validate_sensitivity(cls, v: str) -> str:
        allowed = {"low", "medium", "high"}
        if v not in allowed:
            raise ValueError(f"sensitivity must be one of: {', '.join(sorted(allowed))}")
        return v


class PredictionRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(..., min_length=2, max_length=5_000, description="Existing data")
    target_description: str = Field(..., min_length=3, max_length=2_000, description="What to predict")
    based_on_columns: List[str] = Field(..., min_length=1, max_length=50, description="Input columns")


class ExplainFormulaRequest(BaseModel):
    formula: str = Field(..., min_length=1, max_length=5_000, description="Formula to explain")
    context: Optional[str] = Field(default=None, max_length=5_000, description="Data context")


class SuggestFormulasRequest(BaseModel):
    data_sample: List[Dict[str, Any]] = Field(..., min_length=1, max_length=1_000, description="Data sample")
    analysis_goals: Optional[str] = Field(default=None, max_length=2_000, description="Analysis goals")


# =============================================================================
# WRITING AI ENDPOINTS
# =============================================================================

@router.post("/documents/{document_id}/ai/grammar")
async def check_grammar(document_id: str, request: GrammarCheckRequest):
    """
    Check text for grammar, spelling, and style issues.

    Returns:
        GrammarCheckResult with issues, corrected text, and quality score.

    Status codes:
        200: Success
        400: Invalid input (text too long)
        503: AI service temporarily unavailable
    """
    try:
        result = await writing_service.check_grammar(
            text=request.text,
            language=request.language,
            strict=request.strict,
        )
        return result.model_dump()
    except WritingServiceError as e:
        raise _handle_service_error(e, "Grammar check")
    except Exception as e:
        raise _handle_service_error(e, "Grammar check")


@router.post("/documents/{document_id}/ai/summarize")
async def summarize_text(document_id: str, request: SummarizeRequest):
    """
    Summarize text with optional length limit.

    Returns:
        SummarizeResult with summary, key points, and compression ratio.
    """
    try:
        result = await writing_service.summarize(
            text=request.text,
            max_length=request.max_length,
            style=request.style,
        )
        return result.model_dump()
    except WritingServiceError as e:
        raise _handle_service_error(e, "Summarization")
    except Exception as e:
        raise _handle_service_error(e, "Summarization")


@router.post("/documents/{document_id}/ai/rewrite")
async def rewrite_text(document_id: str, request: RewriteRequest):
    """
    Rewrite text with specified tone.

    Returns:
        RewriteResult with rewritten text and list of changes.
    """
    try:
        tone = WritingTone(request.tone)
        result = await writing_service.rewrite(
            text=request.text,
            tone=tone,
            preserve_meaning=request.preserve_meaning,
        )
        return result.model_dump()
    except WritingServiceError as e:
        raise _handle_service_error(e, "Rewrite")
    except Exception as e:
        raise _handle_service_error(e, "Rewrite")


@router.post("/documents/{document_id}/ai/expand")
async def expand_text(document_id: str, request: ExpandRequest):
    """
    Expand text with additional details and examples.

    Returns:
        ExpandResult with expanded text and word counts.
    """
    try:
        result = await writing_service.expand(
            text=request.text,
            target_length=request.target_length,
            add_examples=request.add_examples,
            add_details=request.add_details,
        )
        return result.model_dump()
    except WritingServiceError as e:
        raise _handle_service_error(e, "Expansion")
    except Exception as e:
        raise _handle_service_error(e, "Expansion")


@router.post("/documents/{document_id}/ai/translate")
async def translate_text(document_id: str, request: TranslateRequest):
    """
    Translate text to target language.

    Returns:
        TranslateResult with translated text and confidence score.
    """
    try:
        result = await writing_service.translate(
            text=request.text,
            target_language=request.target_language,
            source_language=request.source_language,
            preserve_formatting=request.preserve_formatting,
        )
        return result.model_dump()
    except WritingServiceError as e:
        raise _handle_service_error(e, "Translation")
    except Exception as e:
        raise _handle_service_error(e, "Translation")


@router.post("/ai/generate")
async def generate_content(request: GenerateContentRequest):
    """
    Generate new content based on a prompt.

    Returns:
        Generated content string.
    """
    try:
        tone = WritingTone(request.tone)
        content = await writing_service.generate_content(
            prompt=request.prompt,
            context=request.context,
            tone=tone,
            max_length=request.max_length,
        )
        return {"content": content}
    except WritingServiceError as e:
        raise _handle_service_error(e, "Content generation")
    except Exception as e:
        raise _handle_service_error(e, "Content generation")


# =============================================================================
# SPREADSHEET AI ENDPOINTS
# =============================================================================

@router.post("/spreadsheets/{spreadsheet_id}/formula")
async def natural_language_to_formula(spreadsheet_id: str, request: FormulaRequest):
    """
    Convert natural language description to spreadsheet formula.

    Returns:
        FormulaResult with formula, explanation, and alternatives.
    """
    try:
        result = await spreadsheet_ai_service.natural_language_to_formula(
            description=request.description,
            context=request.context,
            spreadsheet_type=request.spreadsheet_type,
        )
        return result.model_dump()
    except Exception as e:
        raise _handle_service_error(e, "Formula generation")


@router.post("/spreadsheets/{spreadsheet_id}/clean")
async def analyze_data_quality(spreadsheet_id: str, request: DataQualityRequest):
    """
    Analyze data for quality issues and provide cleaning suggestions.

    Returns:
        DataCleaningResult with suggestions and quality score.
    """
    try:
        result = await spreadsheet_ai_service.analyze_data_quality(
            data_sample=request.data_sample,
            column_info=request.column_info,
        )
        return result.model_dump()
    except Exception as e:
        raise _handle_service_error(e, "Data quality analysis")


@router.post("/spreadsheets/{spreadsheet_id}/anomalies")
async def detect_anomalies(spreadsheet_id: str, request: AnomalyRequest):
    """
    Detect anomalies in spreadsheet data.

    Returns:
        AnomalyDetectionResult with detected anomalies.
    """
    try:
        result = await spreadsheet_ai_service.detect_anomalies(
            data=request.data,
            columns_to_analyze=request.columns_to_analyze,
            sensitivity=request.sensitivity,
        )
        return result.model_dump()
    except Exception as e:
        raise _handle_service_error(e, "Anomaly detection")


@router.post("/spreadsheets/{spreadsheet_id}/predict")
async def generate_predictions(spreadsheet_id: str, request: PredictionRequest):
    """
    Generate predictions for a new column based on existing data.

    Returns:
        PredictionColumn with predictions and confidence scores.
    """
    try:
        result = await spreadsheet_ai_service.generate_predictive_column(
            data=request.data,
            target_description=request.target_description,
            based_on_columns=request.based_on_columns,
        )
        return result.model_dump()
    except Exception as e:
        raise _handle_service_error(e, "Prediction generation")


@router.post("/spreadsheets/{spreadsheet_id}/explain")
async def explain_formula(spreadsheet_id: str, request: ExplainFormulaRequest):
    """
    Explain what a formula does in plain language.

    Returns:
        FormulaExplanation with detailed breakdown.
    """
    try:
        result = await spreadsheet_ai_service.explain_formula(
            formula=request.formula,
            context=request.context,
        )
        return result.model_dump()
    except Exception as e:
        raise _handle_service_error(e, "Formula explanation")


@router.post("/spreadsheets/{spreadsheet_id}/suggest")
async def suggest_formulas(spreadsheet_id: str, request: SuggestFormulasRequest):
    """
    Suggest useful formulas based on data structure.

    Returns:
        List of suggested formulas with explanations.
    """
    try:
        results = await spreadsheet_ai_service.suggest_formulas(
            data_sample=request.data_sample,
            analysis_goals=request.analysis_goals,
        )
        return {"suggestions": [r.model_dump() for r in results]}
    except Exception as e:
        raise _handle_service_error(e, "Formula suggestion")


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@router.get("/tones")
async def get_available_tones():
    """Get list of available writing tones."""
    return {
        "tones": [
            {"value": tone.value, "label": tone.value.replace("_", " ").title()}
            for tone in WritingTone
        ]
    }


@router.get("/health")
async def check_ai_health():
    """Check if AI services are configured and available."""
    from backend.app.services.config import get_settings
    settings = get_settings()

    return {
        "openai_configured": bool(settings.openai_api_key),
        "model": settings.openai_model,
        "services": {
            "writing": True,
            "spreadsheet": True,
        }
    }
