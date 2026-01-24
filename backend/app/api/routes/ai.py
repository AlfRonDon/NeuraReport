"""
AI API Routes
Endpoints for AI-powered writing and spreadsheet assistance.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.services.ai import (
    writing_service,
    spreadsheet_ai_service,
    WritingService,
    SpreadsheetAIService,
)
from backend.app.services.ai.writing_service import WritingTone

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

# Writing AI Models
class GrammarCheckRequest(BaseModel):
    text: str = Field(..., description="Text to check")
    language: str = Field(default="en", description="Language code")
    strict: bool = Field(default=False, description="Enable strict mode")


class SummarizeRequest(BaseModel):
    text: str = Field(..., description="Text to summarize")
    max_length: Optional[int] = Field(default=None, description="Maximum words")
    style: str = Field(default="bullet_points", description="Output style")


class RewriteRequest(BaseModel):
    text: str = Field(..., description="Text to rewrite")
    tone: str = Field(default="professional", description="Target tone")
    preserve_meaning: bool = Field(default=True, description="Preserve original meaning")


class ExpandRequest(BaseModel):
    text: str = Field(..., description="Text to expand")
    target_length: Optional[int] = Field(default=None, description="Target word count")
    add_examples: bool = Field(default=False, description="Include examples")
    add_details: bool = Field(default=True, description="Add explanatory details")


class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text to translate")
    target_language: str = Field(..., description="Target language")
    source_language: Optional[str] = Field(default=None, description="Source language")
    preserve_formatting: bool = Field(default=True, description="Preserve formatting")


class GenerateContentRequest(BaseModel):
    prompt: str = Field(..., description="Content generation prompt")
    context: Optional[str] = Field(default=None, description="Additional context")
    tone: str = Field(default="professional", description="Target tone")
    max_length: Optional[int] = Field(default=None, description="Maximum words")


# Spreadsheet AI Models
class FormulaRequest(BaseModel):
    description: str = Field(..., description="Natural language description")
    context: Optional[str] = Field(default=None, description="Data context")
    spreadsheet_type: str = Field(default="excel", description="Spreadsheet type")


class DataQualityRequest(BaseModel):
    data_sample: List[Dict[str, Any]] = Field(..., description="Data sample")
    column_info: Optional[Dict[str, str]] = Field(default=None, description="Column types")


class AnomalyRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(..., description="Data to analyze")
    columns_to_analyze: Optional[List[str]] = Field(default=None, description="Specific columns")
    sensitivity: str = Field(default="medium", description="Detection sensitivity")


class PredictionRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(..., description="Existing data")
    target_description: str = Field(..., description="What to predict")
    based_on_columns: List[str] = Field(..., description="Input columns")


class ExplainFormulaRequest(BaseModel):
    formula: str = Field(..., description="Formula to explain")
    context: Optional[str] = Field(default=None, description="Data context")


class SuggestFormulasRequest(BaseModel):
    data_sample: List[Dict[str, Any]] = Field(..., description="Data sample")
    analysis_goals: Optional[str] = Field(default=None, description="Analysis goals")


# =============================================================================
# WRITING AI ENDPOINTS
# =============================================================================

@router.post("/documents/{document_id}/ai/grammar")
async def check_grammar(document_id: str, request: GrammarCheckRequest):
    """
    Check text for grammar, spelling, and style issues.

    Returns:
        GrammarCheckResult with issues and corrected text
    """
    try:
        result = await writing_service.check_grammar(
            text=request.text,
            language=request.language,
            strict=request.strict,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Grammar check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Grammar check failed: {str(e)}"
        )


@router.post("/documents/{document_id}/ai/summarize")
async def summarize_text(document_id: str, request: SummarizeRequest):
    """
    Summarize text with optional length limit.

    Returns:
        SummarizeResult with summary and key points
    """
    try:
        result = await writing_service.summarize(
            text=request.text,
            max_length=request.max_length,
            style=request.style,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summarization failed: {str(e)}"
        )


@router.post("/documents/{document_id}/ai/rewrite")
async def rewrite_text(document_id: str, request: RewriteRequest):
    """
    Rewrite text with specified tone.

    Returns:
        RewriteResult with rewritten text
    """
    try:
        # Convert string tone to enum
        tone = WritingTone(request.tone) if request.tone in [t.value for t in WritingTone] else WritingTone.PROFESSIONAL

        result = await writing_service.rewrite(
            text=request.text,
            tone=tone,
            preserve_meaning=request.preserve_meaning,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Rewrite failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Rewrite failed: {str(e)}"
        )


@router.post("/documents/{document_id}/ai/expand")
async def expand_text(document_id: str, request: ExpandRequest):
    """
    Expand text with additional details and examples.

    Returns:
        ExpandResult with expanded text
    """
    try:
        result = await writing_service.expand(
            text=request.text,
            target_length=request.target_length,
            add_examples=request.add_examples,
            add_details=request.add_details,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Expansion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Expansion failed: {str(e)}"
        )


@router.post("/documents/{document_id}/ai/translate")
async def translate_text(document_id: str, request: TranslateRequest):
    """
    Translate text to target language.

    Returns:
        TranslateResult with translated text
    """
    try:
        result = await writing_service.translate(
            text=request.text,
            target_language=request.target_language,
            source_language=request.source_language,
            preserve_formatting=request.preserve_formatting,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}"
        )


@router.post("/ai/generate")
async def generate_content(request: GenerateContentRequest):
    """
    Generate new content based on a prompt.

    Returns:
        Generated content string
    """
    try:
        tone = WritingTone(request.tone) if request.tone in [t.value for t in WritingTone] else WritingTone.PROFESSIONAL

        content = await writing_service.generate_content(
            prompt=request.prompt,
            context=request.context,
            tone=tone,
            max_length=request.max_length,
        )
        return {"content": content}
    except Exception as e:
        logger.error(f"Content generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Content generation failed: {str(e)}"
        )


# =============================================================================
# SPREADSHEET AI ENDPOINTS
# =============================================================================

@router.post("/spreadsheets/{spreadsheet_id}/ai/formula")
async def natural_language_to_formula(spreadsheet_id: str, request: FormulaRequest):
    """
    Convert natural language description to spreadsheet formula.

    Returns:
        FormulaResult with formula and explanation
    """
    try:
        result = await spreadsheet_ai_service.natural_language_to_formula(
            description=request.description,
            context=request.context,
            spreadsheet_type=request.spreadsheet_type,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Formula generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Formula generation failed: {str(e)}"
        )


@router.post("/spreadsheets/{spreadsheet_id}/ai/clean")
async def analyze_data_quality(spreadsheet_id: str, request: DataQualityRequest):
    """
    Analyze data for quality issues and provide cleaning suggestions.

    Returns:
        DataCleaningResult with suggestions
    """
    try:
        result = await spreadsheet_ai_service.analyze_data_quality(
            data_sample=request.data_sample,
            column_info=request.column_info,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Data quality analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data quality analysis failed: {str(e)}"
        )


@router.post("/spreadsheets/{spreadsheet_id}/ai/anomalies")
async def detect_anomalies(spreadsheet_id: str, request: AnomalyRequest):
    """
    Detect anomalies in spreadsheet data.

    Returns:
        AnomalyDetectionResult with detected anomalies
    """
    try:
        result = await spreadsheet_ai_service.detect_anomalies(
            data=request.data,
            columns_to_analyze=request.columns_to_analyze,
            sensitivity=request.sensitivity,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anomaly detection failed: {str(e)}"
        )


@router.post("/spreadsheets/{spreadsheet_id}/ai/predict")
async def generate_predictions(spreadsheet_id: str, request: PredictionRequest):
    """
    Generate predictions for a new column based on existing data.

    Returns:
        PredictionColumn with predictions
    """
    try:
        result = await spreadsheet_ai_service.generate_predictive_column(
            data=request.data,
            target_description=request.target_description,
            based_on_columns=request.based_on_columns,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Prediction generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction generation failed: {str(e)}"
        )


@router.post("/spreadsheets/{spreadsheet_id}/ai/explain")
async def explain_formula(spreadsheet_id: str, request: ExplainFormulaRequest):
    """
    Explain what a formula does in plain language.

    Returns:
        FormulaExplanation with detailed breakdown
    """
    try:
        result = await spreadsheet_ai_service.explain_formula(
            formula=request.formula,
            context=request.context,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Formula explanation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Formula explanation failed: {str(e)}"
        )


@router.post("/spreadsheets/{spreadsheet_id}/ai/suggest")
async def suggest_formulas(spreadsheet_id: str, request: SuggestFormulasRequest):
    """
    Suggest useful formulas based on data structure.

    Returns:
        List of suggested formulas with explanations
    """
    try:
        results = await spreadsheet_ai_service.suggest_formulas(
            data_sample=request.data_sample,
            analysis_goals=request.analysis_goals,
        )
        return {"suggestions": [r.model_dump() for r in results]}
    except Exception as e:
        logger.error(f"Formula suggestion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Formula suggestion failed: {str(e)}"
        )


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
