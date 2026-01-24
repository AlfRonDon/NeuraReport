"""
AI Spreadsheet Service
Provides AI-powered spreadsheet features using OpenAI for natural language
to formula conversion, data cleaning, anomaly detection, and predictions.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from enum import Enum

from pydantic import BaseModel, Field

from backend.app.services.config import get_settings

logger = logging.getLogger(__name__)


class FormulaResult(BaseModel):
    """Result of natural language to formula conversion."""
    formula: str = Field(..., description="Excel/spreadsheet formula")
    explanation: str = Field(..., description="Explanation of what the formula does")
    examples: List[str] = Field(default_factory=list, description="Example inputs/outputs")
    alternative_formulas: List[str] = Field(default_factory=list, description="Alternative approaches")


class DataCleaningSuggestion(BaseModel):
    """A single data cleaning suggestion."""
    column: str = Field(..., description="Column name or reference")
    issue: str = Field(..., description="Description of the data quality issue")
    suggestion: str = Field(..., description="Suggested fix")
    severity: str = Field(default="medium", description="Severity: high, medium, low")
    affected_rows: int = Field(default=0, description="Number of affected rows")
    auto_fixable: bool = Field(default=False, description="Can be auto-fixed")


class DataCleaningResult(BaseModel):
    """Result of data cleaning analysis."""
    suggestions: List[DataCleaningSuggestion] = Field(default_factory=list)
    quality_score: float = Field(..., description="Overall data quality score 0-100")
    summary: str = Field(..., description="Summary of data quality issues")


class Anomaly(BaseModel):
    """Detected data anomaly."""
    location: str = Field(..., description="Cell reference or row number")
    value: Any = Field(..., description="The anomalous value")
    expected_range: str = Field(..., description="Expected value range")
    confidence: float = Field(..., description="Confidence that this is an anomaly 0-1")
    explanation: str = Field(..., description="Why this is considered anomalous")
    anomaly_type: str = Field(..., description="Type: outlier, missing, inconsistent, etc.")


class AnomalyDetectionResult(BaseModel):
    """Result of anomaly detection."""
    anomalies: List[Anomaly] = Field(default_factory=list)
    total_rows_analyzed: int = Field(..., description="Number of rows analyzed")
    anomaly_count: int = Field(..., description="Number of anomalies found")
    summary: str = Field(..., description="Summary of findings")


class PredictionColumn(BaseModel):
    """Result of predictive column generation."""
    column_name: str = Field(..., description="Name for the new column")
    predictions: List[Any] = Field(default_factory=list, description="Predicted values")
    confidence_scores: List[float] = Field(default_factory=list, description="Confidence for each prediction")
    methodology: str = Field(..., description="Prediction methodology used")
    accuracy_estimate: float = Field(..., description="Estimated accuracy 0-1")


class FormulaExplanation(BaseModel):
    """Explanation of a formula."""
    formula: str = Field(..., description="The formula being explained")
    summary: str = Field(..., description="Brief summary of what it does")
    step_by_step: List[str] = Field(default_factory=list, description="Step-by-step breakdown")
    components: Dict[str, str] = Field(default_factory=dict, description="Explanation of each component")
    potential_issues: List[str] = Field(default_factory=list, description="Potential issues or edge cases")


class SpreadsheetAIService:
    """
    AI-powered spreadsheet assistance service.
    Uses OpenAI for formula generation, data cleaning, anomaly detection, and predictions.
    """

    def __init__(self):
        self._client = None
        self._settings = get_settings()

    def _get_client(self):
        """Lazy-load OpenAI client."""
        if self._client is None:
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self._settings.openai_api_key)
            except ImportError:
                logger.warning("OpenAI package not installed. Install with: pip install openai")
                raise RuntimeError("OpenAI package not installed")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                raise
        return self._client

    def _call_openai(self, system_prompt: str, user_prompt: str, max_tokens: int = 2000) -> str:
        """Make a call to OpenAI API."""
        client = self._get_client()
        model = self._settings.openai_model or "gpt-4"

        try:
            # Newer models (o1, gpt-4o, etc.) use max_completion_tokens instead of max_tokens
            uses_new_param = any(m in model.lower() for m in ["o1", "gpt-4o", "o3"])

            create_params = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
            }

            if uses_new_param:
                create_params["max_completion_tokens"] = max_tokens
            else:
                create_params["max_tokens"] = max_tokens
                create_params["temperature"] = 0.3  # Lower temperature for precise formulas

            response = client.chat.completions.create(**create_params)
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise

    async def natural_language_to_formula(
        self,
        description: str,
        context: Optional[str] = None,
        spreadsheet_type: str = "excel",
    ) -> FormulaResult:
        """
        Convert natural language description to spreadsheet formula.

        Args:
            description: Natural language description of desired calculation
            context: Additional context (column names, data types, etc.)
            spreadsheet_type: Type of spreadsheet (excel, google_sheets)

        Returns:
            FormulaResult with formula and explanation
        """
        context_info = f"\n\nContext about the data:\n{context}" if context else ""

        system_prompt = f"""You are an expert {spreadsheet_type} formula writer.
Convert natural language descriptions into {spreadsheet_type} formulas.
Always provide working, accurate formulas.

Respond in JSON format:
{{
    "formula": "<the formula>",
    "explanation": "<clear explanation of what it does>",
    "examples": ["<example input/output 1>", "<example input/output 2>"],
    "alternative_formulas": ["<alternative approach 1>"]
}}"""

        user_prompt = f"Create a formula for: {description}{context_info}"

        try:
            response = self._call_openai(system_prompt, user_prompt)
            import json
            result = json.loads(response)

            return FormulaResult(
                formula=result.get("formula", ""),
                explanation=result.get("explanation", ""),
                examples=result.get("examples", []),
                alternative_formulas=result.get("alternative_formulas", []),
            )
        except json.JSONDecodeError:
            # Try to extract formula from plain text response
            return FormulaResult(
                formula=response.strip() if response else "",
                explanation="Unable to parse detailed explanation",
                examples=[],
                alternative_formulas=[],
            )

    async def analyze_data_quality(
        self,
        data_sample: List[Dict[str, Any]],
        column_info: Optional[Dict[str, str]] = None,
    ) -> DataCleaningResult:
        """
        Analyze data for quality issues and provide cleaning suggestions.

        Args:
            data_sample: Sample of data rows (list of dicts)
            column_info: Optional dict mapping column names to expected types

        Returns:
            DataCleaningResult with suggestions
        """
        if not data_sample:
            return DataCleaningResult(
                suggestions=[],
                quality_score=100.0,
                summary="No data provided for analysis",
            )

        # Prepare data summary for analysis
        import json
        data_preview = json.dumps(data_sample[:20], indent=2, default=str)
        column_context = ""
        if column_info:
            column_context = f"\n\nExpected column types:\n{json.dumps(column_info, indent=2)}"

        system_prompt = """You are a data quality expert. Analyze the data for issues like:
1. Missing values
2. Inconsistent formatting
3. Invalid data types
4. Duplicates
5. Outliers
6. Inconsistent naming/spelling

Respond in JSON format:
{
    "suggestions": [
        {
            "column": "<column name>",
            "issue": "<description of issue>",
            "suggestion": "<how to fix>",
            "severity": "<high|medium|low>",
            "affected_rows": <estimated count>,
            "auto_fixable": <true|false>
        }
    ],
    "quality_score": <0-100>,
    "summary": "<overall summary>"
}"""

        user_prompt = f"Analyze this data for quality issues:\n\n{data_preview}{column_context}"

        try:
            response = self._call_openai(system_prompt, user_prompt)
            import json
            result = json.loads(response)

            return DataCleaningResult(
                suggestions=[DataCleaningSuggestion(**s) for s in result.get("suggestions", [])],
                quality_score=result.get("quality_score", 0),
                summary=result.get("summary", ""),
            )
        except json.JSONDecodeError:
            return DataCleaningResult(
                suggestions=[],
                quality_score=0,
                summary="Unable to analyze data quality",
            )

    async def detect_anomalies(
        self,
        data: List[Dict[str, Any]],
        columns_to_analyze: Optional[List[str]] = None,
        sensitivity: str = "medium",
    ) -> AnomalyDetectionResult:
        """
        Detect anomalies in data.

        Args:
            data: Data rows to analyze
            columns_to_analyze: Specific columns to focus on
            sensitivity: Detection sensitivity (low, medium, high)

        Returns:
            AnomalyDetectionResult with detected anomalies
        """
        if not data:
            return AnomalyDetectionResult(
                anomalies=[],
                total_rows_analyzed=0,
                anomaly_count=0,
                summary="No data provided",
            )

        import json
        data_preview = json.dumps(data[:50], indent=2, default=str)
        columns_context = ""
        if columns_to_analyze:
            columns_context = f"\n\nFocus on these columns: {', '.join(columns_to_analyze)}"

        sensitivity_desc = {
            "low": "Only flag clear, obvious anomalies",
            "medium": "Flag moderately suspicious values",
            "high": "Flag any potentially unusual values",
        }

        system_prompt = f"""You are a data anomaly detection expert.
Sensitivity level: {sensitivity} - {sensitivity_desc.get(sensitivity, sensitivity_desc['medium'])}

Look for:
1. Statistical outliers
2. Missing or null values in unexpected places
3. Inconsistent patterns
4. Data entry errors
5. Values outside expected ranges

Respond in JSON format:
{{
    "anomalies": [
        {{
            "location": "<cell reference or row number>",
            "value": "<the anomalous value>",
            "expected_range": "<what was expected>",
            "confidence": <0.0-1.0>,
            "explanation": "<why it's anomalous>",
            "anomaly_type": "<outlier|missing|inconsistent|error>"
        }}
    ],
    "total_rows_analyzed": <number>,
    "summary": "<summary of findings>"
}}"""

        user_prompt = f"Detect anomalies in this data:\n\n{data_preview}{columns_context}"

        try:
            response = self._call_openai(system_prompt, user_prompt)
            import json
            result = json.loads(response)

            anomalies = [Anomaly(**a) for a in result.get("anomalies", [])]

            return AnomalyDetectionResult(
                anomalies=anomalies,
                total_rows_analyzed=result.get("total_rows_analyzed", len(data)),
                anomaly_count=len(anomalies),
                summary=result.get("summary", ""),
            )
        except json.JSONDecodeError:
            return AnomalyDetectionResult(
                anomalies=[],
                total_rows_analyzed=len(data),
                anomaly_count=0,
                summary="Unable to detect anomalies",
            )

    async def generate_predictive_column(
        self,
        data: List[Dict[str, Any]],
        target_description: str,
        based_on_columns: List[str],
    ) -> PredictionColumn:
        """
        Generate predictions for a new column based on existing data.

        Args:
            data: Existing data rows
            target_description: Description of what to predict
            based_on_columns: Columns to base predictions on

        Returns:
            PredictionColumn with predictions
        """
        if not data:
            return PredictionColumn(
                column_name="",
                predictions=[],
                confidence_scores=[],
                methodology="",
                accuracy_estimate=0,
            )

        import json
        data_preview = json.dumps(data[:30], indent=2, default=str)

        system_prompt = """You are a predictive analytics expert.
Generate predictions based on patterns in the provided data.

Respond in JSON format:
{
    "column_name": "<suggested name for predicted column>",
    "predictions": [<predicted value for each row>],
    "confidence_scores": [<0.0-1.0 confidence for each prediction>],
    "methodology": "<explain the prediction methodology>",
    "accuracy_estimate": <0.0-1.0 estimated accuracy>
}"""

        user_prompt = f"""Generate predictions for: {target_description}
Based on columns: {', '.join(based_on_columns)}

Data sample:
{data_preview}"""

        try:
            response = self._call_openai(system_prompt, user_prompt, max_tokens=4000)
            import json
            result = json.loads(response)

            return PredictionColumn(
                column_name=result.get("column_name", "Predicted"),
                predictions=result.get("predictions", []),
                confidence_scores=result.get("confidence_scores", []),
                methodology=result.get("methodology", ""),
                accuracy_estimate=result.get("accuracy_estimate", 0),
            )
        except json.JSONDecodeError:
            return PredictionColumn(
                column_name="Predicted",
                predictions=[],
                confidence_scores=[],
                methodology="Unable to generate predictions",
                accuracy_estimate=0,
            )

    async def explain_formula(
        self,
        formula: str,
        context: Optional[str] = None,
    ) -> FormulaExplanation:
        """
        Explain what a formula does in plain language.

        Args:
            formula: The formula to explain
            context: Optional context about the data

        Returns:
            FormulaExplanation with detailed breakdown
        """
        context_info = f"\n\nContext: {context}" if context else ""

        system_prompt = """You are a spreadsheet formula expert.
Explain formulas in clear, understandable terms.

Respond in JSON format:
{
    "formula": "<the formula>",
    "summary": "<one-sentence summary>",
    "step_by_step": ["<step 1>", "<step 2>", ...],
    "components": {
        "<component>": "<what it does>"
    },
    "potential_issues": ["<potential issue or edge case 1>", ...]
}"""

        user_prompt = f"Explain this formula: {formula}{context_info}"

        try:
            response = self._call_openai(system_prompt, user_prompt)
            import json
            result = json.loads(response)

            return FormulaExplanation(
                formula=formula,
                summary=result.get("summary", ""),
                step_by_step=result.get("step_by_step", []),
                components=result.get("components", {}),
                potential_issues=result.get("potential_issues", []),
            )
        except json.JSONDecodeError:
            return FormulaExplanation(
                formula=formula,
                summary="Unable to parse explanation",
                step_by_step=[],
                components={},
                potential_issues=[],
            )

    async def suggest_formulas(
        self,
        data_sample: List[Dict[str, Any]],
        analysis_goals: Optional[str] = None,
    ) -> List[FormulaResult]:
        """
        Suggest useful formulas based on data structure.

        Args:
            data_sample: Sample of the data
            analysis_goals: Optional description of analysis goals

        Returns:
            List of suggested formulas with explanations
        """
        if not data_sample:
            return []

        import json
        data_preview = json.dumps(data_sample[:10], indent=2, default=str)
        goals_context = f"\n\nAnalysis goals: {analysis_goals}" if analysis_goals else ""

        system_prompt = """You are a spreadsheet analytics expert.
Suggest useful formulas based on the data structure.

Respond in JSON format:
{
    "suggestions": [
        {
            "formula": "<formula>",
            "explanation": "<what it calculates>",
            "examples": ["<example>"],
            "alternative_formulas": []
        }
    ]
}"""

        user_prompt = f"Suggest useful formulas for this data:\n\n{data_preview}{goals_context}"

        try:
            response = self._call_openai(system_prompt, user_prompt)
            import json
            result = json.loads(response)

            return [
                FormulaResult(**s) for s in result.get("suggestions", [])
            ]
        except json.JSONDecodeError:
            return []


# Singleton instance
spreadsheet_ai_service = SpreadsheetAIService()
