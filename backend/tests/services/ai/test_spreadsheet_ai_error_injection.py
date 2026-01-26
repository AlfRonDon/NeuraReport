"""
Spreadsheet AI Service Error Injection Tests
Tests for error handling, edge cases, and failure scenarios.
"""
import json
import pytest
from unittest.mock import Mock, patch

import os
os.environ.setdefault("OPENAI_API_KEY", "test-key")

from backend.app.services.ai.spreadsheet_ai_service import (
    SpreadsheetAIService,
    FormulaResult,
    DataCleaningResult,
    AnomalyDetectionResult,
    PredictionColumn,
    FormulaExplanation,
)


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def service():
    """Create SpreadsheetAIService instance."""
    return SpreadsheetAIService()


# =============================================================================
# CLIENT INITIALIZATION ERRORS
# =============================================================================


class TestClientInitializationErrors:
    """Tests for OpenAI client initialization failures."""

    def test_client_creation_success(self, service):
        """Client creates successfully when openai is available."""
        fresh_service = SpreadsheetAIService()
        fresh_service._client = None

        with patch('openai.OpenAI') as mock_class:
            mock_class.return_value = Mock()
            client = fresh_service._get_client()
            assert client is not None

    def test_invalid_api_key(self, service):
        """Handle invalid API key error."""
        with patch('openai.OpenAI') as mock_class:
            mock_class.side_effect = Exception("Invalid API key")

            with pytest.raises(Exception, match="Invalid API key"):
                service._get_client()

    def test_network_error_on_init(self, service):
        """Handle network error during initialization."""
        with patch('openai.OpenAI') as mock_class:
            mock_class.side_effect = ConnectionError("Network unreachable")

            with pytest.raises(ConnectionError):
                service._get_client()


# =============================================================================
# API CALL ERRORS
# =============================================================================


class TestAPICallErrors:
    """Tests for OpenAI API call failures."""

    def test_api_rate_limit_error(self, service):
        """Handle rate limit error."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_client.chat.completions.create.side_effect = Exception("Rate limit exceeded")

            with pytest.raises(Exception, match="Rate limit"):
                service._call_openai("system", "user")

    def test_api_timeout_error(self, service):
        """Handle timeout error."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_client.chat.completions.create.side_effect = TimeoutError("Request timed out")

            with pytest.raises(TimeoutError):
                service._call_openai("system", "user")

    def test_api_server_error(self, service):
        """Handle server error (500)."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_client.chat.completions.create.side_effect = Exception("Internal server error")

            with pytest.raises(Exception, match="server error"):
                service._call_openai("system", "user")


# =============================================================================
# JSON PARSING ERRORS
# =============================================================================


class TestJSONParsingErrors:
    """Tests for JSON parsing failures."""

    @pytest.mark.asyncio
    async def test_formula_invalid_json(self, service):
        """Formula conversion handles invalid JSON response."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "This is not JSON {invalid"

            result = await service.natural_language_to_formula("Sum column A")

            # Should use raw response as formula
            assert "invalid" in result.formula or "This" in result.formula
            assert "unable" in result.explanation.lower()

    @pytest.mark.asyncio
    async def test_data_quality_invalid_json(self, service):
        """Data quality analysis handles invalid JSON response."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Invalid JSON"

            result = await service.analyze_data_quality([{"a": 1}])

            assert result.quality_score == 0
            assert "unable" in result.summary.lower()

    @pytest.mark.asyncio
    async def test_anomaly_invalid_json(self, service):
        """Anomaly detection handles invalid JSON response."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Not valid JSON"

            result = await service.detect_anomalies([{"value": 100}])

            assert result.anomaly_count == 0
            assert "unable" in result.summary.lower()

    @pytest.mark.asyncio
    async def test_prediction_invalid_json(self, service):
        """Prediction handles invalid JSON response."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Invalid"

            result = await service.generate_predictive_column(
                [{"x": 1}], "Predict", ["x"]
            )

            assert result.predictions == []
            assert result.accuracy_estimate == 0

    @pytest.mark.asyncio
    async def test_explanation_invalid_json(self, service):
        """Formula explanation handles invalid JSON response."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Bad JSON"

            result = await service.explain_formula("=SUM(A:A)")

            assert result.formula == "=SUM(A:A)"
            assert "unable" in result.summary.lower()

    @pytest.mark.asyncio
    async def test_suggestions_invalid_json(self, service):
        """Formula suggestions handles invalid JSON response."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Not JSON"

            result = await service.suggest_formulas([{"a": 1}])

            assert result == []


# =============================================================================
# MALFORMED RESPONSE TESTS
# =============================================================================


class TestMalformedResponses:
    """Tests for malformed API responses."""

    @pytest.mark.asyncio
    async def test_formula_null_response(self, service):
        """Formula raises error on null JSON response (None has no .get())."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "null"

            # null parses as None, then result.get() fails with AttributeError
            with pytest.raises(AttributeError):
                await service.natural_language_to_formula("Sum")

    @pytest.mark.asyncio
    async def test_formula_empty_object(self, service):
        """Formula handles empty object response."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "{}"

            result = await service.natural_language_to_formula("Sum")

            assert result.formula == ""
            assert result.examples == []

    @pytest.mark.asyncio
    async def test_data_quality_missing_fields(self, service):
        """Data quality handles response with missing fields."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "quality_score": 75.0,
                # Missing suggestions and summary
            })

            result = await service.analyze_data_quality([{"a": 1}])

            assert result.quality_score == 75.0
            assert result.suggestions == []

    @pytest.mark.asyncio
    async def test_anomaly_wrong_types(self, service):
        """Anomaly detection raises error on wrong types in response."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "anomalies": "not an array",  # Should be array
                "total_rows_analyzed": "five",  # Should be int
                "summary": 123,  # Should be string
            })

            # Iterating over a string and unpacking chars as dicts raises TypeError
            with pytest.raises(TypeError):
                await service.detect_anomalies([{"value": 100}])


# =============================================================================
# EMPTY DATA TESTS
# =============================================================================


class TestEmptyDataHandling:
    """Tests for handling empty data."""

    @pytest.mark.asyncio
    async def test_data_quality_empty_list(self, service):
        """Data quality handles empty data list."""
        result = await service.analyze_data_quality([])

        assert result.quality_score == 100.0
        assert "no data" in result.summary.lower()

    @pytest.mark.asyncio
    async def test_anomaly_empty_list(self, service):
        """Anomaly detection handles empty data list."""
        result = await service.detect_anomalies([])

        assert result.total_rows_analyzed == 0
        assert result.anomaly_count == 0

    @pytest.mark.asyncio
    async def test_prediction_empty_list(self, service):
        """Prediction handles empty data list."""
        result = await service.generate_predictive_column([], "Predict", ["x"])

        assert result.predictions == []
        assert result.accuracy_estimate == 0

    @pytest.mark.asyncio
    async def test_suggestions_empty_list(self, service):
        """Formula suggestions handles empty data list."""
        result = await service.suggest_formulas([])

        assert result == []


# =============================================================================
# CONTENT EDGE CASES
# =============================================================================


class TestContentEdgeCases:
    """Tests for content edge cases."""

    @pytest.mark.asyncio
    async def test_very_long_description(self, service):
        """Handle very long description input."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "formula": "=SUM(A:A)",
                "explanation": "Sum",
                "examples": [],
                "alternative_formulas": [],
            })

            long_description = "Sum all values " * 1000
            result = await service.natural_language_to_formula(long_description)

            assert isinstance(result, FormulaResult)

    @pytest.mark.asyncio
    async def test_special_characters_in_formula(self, service):
        """Handle special characters in formula."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "formula": '=IF(A1="test",B1,C1)',
                "summary": "Conditional",
                "step_by_step": [],
                "components": {},
                "potential_issues": [],
            })

            result = await service.explain_formula('=IF(A1="special<>chars",B1,C1)')

            assert isinstance(result, FormulaExplanation)

    @pytest.mark.asyncio
    async def test_unicode_in_data(self, service):
        """Handle unicode characters in data."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "suggestions": [],
                "quality_score": 100.0,
                "summary": "No issues",
            })

            unicode_data = [
                {"名前": "田中太郎", "年齢": 30},
                {"名前": "鈴木花子", "年齢": 25},
            ]
            result = await service.analyze_data_quality(unicode_data)

            assert isinstance(result, DataCleaningResult)

    @pytest.mark.asyncio
    async def test_null_values_in_data(self, service):
        """Handle null values in data."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "anomalies": [],
                "total_rows_analyzed": 3,
                "summary": "No anomalies",
            })

            data_with_nulls = [
                {"a": None, "b": 1},
                {"a": 2, "b": None},
                {"a": None, "b": None},
            ]
            result = await service.detect_anomalies(data_with_nulls)

            assert isinstance(result, AnomalyDetectionResult)

    @pytest.mark.asyncio
    async def test_mixed_types_in_data(self, service):
        """Handle mixed types in data."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "suggestions": [],
                "quality_score": 80.0,
                "summary": "Mixed types detected",
            })

            mixed_data = [
                {"value": 100},
                {"value": "hundred"},
                {"value": 100.5},
                {"value": True},
            ]
            result = await service.analyze_data_quality(mixed_data)

            assert isinstance(result, DataCleaningResult)


# =============================================================================
# CONCURRENT ERROR SCENARIOS
# =============================================================================


class TestConcurrentErrors:
    """Tests for concurrent operation error handling."""

    @pytest.mark.asyncio
    async def test_client_error_during_call(self, service):
        """Handle client error during API call."""
        call_count = 0

        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise Exception("Client error")
            return json.dumps({
                "formula": "=SUM(A:A)",
                "explanation": "Sum",
                "examples": [],
                "alternative_formulas": [],
            })

        with patch.object(service, '_call_openai', side_effect=side_effect):
            result1 = await service.natural_language_to_formula("Sum 1")
            assert isinstance(result1, FormulaResult)

            with pytest.raises(Exception):
                await service.natural_language_to_formula("Sum 2")

    @pytest.mark.asyncio
    async def test_recovery_after_error(self, service):
        """Service recovers after error."""
        call_count = 0

        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("Temporary error")
            return json.dumps({
                "formula": "=SUM(A:A)",
                "explanation": "Sum",
                "examples": [],
                "alternative_formulas": [],
            })

        with patch.object(service, '_call_openai', side_effect=side_effect):
            # First call fails
            with pytest.raises(Exception):
                await service.natural_language_to_formula("Sum")

            # Second call succeeds
            result = await service.natural_language_to_formula("Sum")
            assert isinstance(result, FormulaResult)


# =============================================================================
# MODEL PARAMETER TESTS
# =============================================================================


class TestModelParameters:
    """Tests for model-specific parameter handling."""

    def test_gpt5_model_uses_new_params(self, service):
        """GPT-5 model uses max_completion_tokens."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = "response"
            mock_client.chat.completions.create.return_value = mock_response

            with patch.object(service._settings, 'openai_model', 'gpt-5'):
                service._client = None
                service._call_openai("system", "user")

            call_kwargs = mock_client.chat.completions.create.call_args[1]
            assert "max_completion_tokens" in call_kwargs

    def test_o1_model_uses_new_params(self, service):
        """o1 model uses max_completion_tokens."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = "response"
            mock_client.chat.completions.create.return_value = mock_response

            with patch.object(service._settings, 'openai_model', 'o1-preview'):
                service._client = None
                service._call_openai("system", "user")

            call_kwargs = mock_client.chat.completions.create.call_args[1]
            assert "max_completion_tokens" in call_kwargs

    def test_gpt4_model_uses_legacy_params(self, service):
        """GPT-4 model uses legacy max_tokens."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = "response"
            mock_client.chat.completions.create.return_value = mock_response

            with patch.object(service._settings, 'openai_model', 'gpt-4'):
                service._client = None
                service._call_openai("system", "user")

            call_kwargs = mock_client.chat.completions.create.call_args[1]
            assert "max_tokens" in call_kwargs
            assert "temperature" in call_kwargs


# =============================================================================
# NETWORK EDGE CASES
# =============================================================================


class TestNetworkEdgeCases:
    """Tests for network-related edge cases."""

    def test_connection_reset(self, service):
        """Handle connection reset."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_client.chat.completions.create.side_effect = ConnectionResetError()

            with pytest.raises(ConnectionResetError):
                service._call_openai("system", "user")

    def test_broken_pipe(self, service):
        """Handle broken pipe error."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_client.chat.completions.create.side_effect = BrokenPipeError()

            with pytest.raises(BrokenPipeError):
                service._call_openai("system", "user")

    def test_dns_resolution_failure(self, service):
        """Handle DNS resolution failure."""
        with patch('openai.OpenAI') as mock_class:
            mock_class.side_effect = Exception("getaddrinfo failed")

            with pytest.raises(Exception, match="getaddrinfo"):
                service._get_client()


# =============================================================================
# RESPONSE VALIDATION TESTS
# =============================================================================


class TestResponseValidation:
    """Tests for response structure validation."""

    @pytest.mark.asyncio
    async def test_formula_missing_required_field(self, service):
        """Formula handles missing required 'formula' field."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "explanation": "Missing formula field",
                "examples": [],
            })

            result = await service.natural_language_to_formula("Sum")

            # Should use default empty string
            assert result.formula == ""

    @pytest.mark.asyncio
    async def test_data_cleaning_suggestion_validation(self, service):
        """Data cleaning validates suggestion structure."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "suggestions": [
                    {
                        "column": "A",
                        "issue": "Test",
                        "suggestion": "Fix",
                        # Missing optional fields
                    }
                ],
                "quality_score": 90.0,
                "summary": "Found issue",
            })

            result = await service.analyze_data_quality([{"a": 1}])

            assert len(result.suggestions) == 1
            # Default values should be applied
            assert result.suggestions[0].severity == "medium"

    @pytest.mark.asyncio
    async def test_anomaly_validation(self, service):
        """Anomaly detection validates anomaly structure."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "anomalies": [
                    {
                        "location": "Row 1",
                        "value": 999,
                        "expected_range": "0-100",
                        "confidence": 0.95,
                        "explanation": "Outlier",
                        "anomaly_type": "outlier",
                    }
                ],
                "total_rows_analyzed": 10,
                "summary": "Found anomaly",
            })

            result = await service.detect_anomalies([{"value": 999}])

            assert result.anomaly_count == 1
            assert result.anomalies[0].confidence == 0.95
