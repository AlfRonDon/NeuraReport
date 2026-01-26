"""
Writing Service Tests
Comprehensive tests for WritingService with mocked OpenAI.
"""
import json
import pytest
from unittest.mock import Mock, patch, MagicMock

import os
os.environ.setdefault("OPENAI_API_KEY", "test-key")

from backend.app.services.ai.writing_service import (
    WritingService,
    WritingTone,
    GrammarCheckResult,
    SummarizeResult,
    RewriteResult,
    ExpandResult,
    TranslateResult,
)


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def service():
    """Create WritingService instance."""
    return WritingService()


@pytest.fixture
def mock_openai_response():
    """Factory for mock OpenAI responses."""
    def _create_response(content: str):
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = content
        return mock_response
    return _create_response


@pytest.fixture
def mock_openai_client(mock_openai_response):
    """Mock OpenAI client."""
    with patch('backend.app.services.ai.writing_service.OpenAI') as mock_class:
        mock_client = Mock()
        mock_class.return_value = mock_client
        yield mock_client


# =============================================================================
# INITIALIZATION TESTS
# =============================================================================


class TestWritingServiceInit:
    """Tests for WritingService initialization."""

    def test_service_creates_successfully(self):
        """Service instantiates without error."""
        service = WritingService()
        assert service is not None

    def test_client_not_initialized_immediately(self, service):
        """Client is lazy-loaded, not created on init."""
        assert service._client is None

    def test_get_client_creates_client(self, service):
        """_get_client creates OpenAI client on first call."""
        with patch('openai.OpenAI') as mock_class:
            mock_class.return_value = Mock()
            client = service._get_client()
            assert client is not None
            mock_class.assert_called_once()

    def test_get_client_reuses_existing(self, service):
        """_get_client returns same client on subsequent calls."""
        with patch('openai.OpenAI') as mock_class:
            mock_instance = Mock()
            mock_class.return_value = mock_instance

            client1 = service._get_client()
            client2 = service._get_client()

            assert client1 is client2
            mock_class.assert_called_once()


# =============================================================================
# GRAMMAR CHECK TESTS
# =============================================================================


class TestGrammarCheck:
    """Tests for check_grammar method."""

    @pytest.mark.asyncio
    async def test_check_grammar_returns_result(self, service):
        """check_grammar returns GrammarCheckResult."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "issues": [],
                "corrected_text": "Hello world.",
                "score": 100.0,
            })

            result = await service.check_grammar("Hello world.")

            assert isinstance(result, GrammarCheckResult)
            assert result.score == 100.0

    @pytest.mark.asyncio
    async def test_check_grammar_empty_text(self, service):
        """Empty text returns perfect score."""
        result = await service.check_grammar("")

        assert result.issues == []
        assert result.score == 100.0
        assert result.corrected_text == ""

    @pytest.mark.asyncio
    async def test_check_grammar_whitespace_only(self, service):
        """Whitespace-only text returns perfect score."""
        result = await service.check_grammar("   \n\t   ")

        assert result.score == 100.0

    @pytest.mark.asyncio
    async def test_check_grammar_with_issues(self, service):
        """check_grammar identifies issues."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "issues": [
                    {
                        "start": 0,
                        "end": 3,
                        "original": "teh",
                        "suggestion": "the",
                        "issue_type": "spelling",
                        "explanation": "Typo",
                        "severity": "error",
                    }
                ],
                "corrected_text": "the quick fox",
                "score": 85.0,
            })

            result = await service.check_grammar("teh quick fox")

            assert len(result.issues) == 1
            assert result.issues[0].original == "teh"
            assert result.issue_count == 1

    @pytest.mark.asyncio
    async def test_check_grammar_strict_mode(self, service):
        """check_grammar with strict mode."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "issues": [],
                "corrected_text": "text",
                "score": 100.0,
            })

            await service.check_grammar("text", strict=True)

            call_args = mock_call.call_args[0]
            assert "(be strict)" in call_args[0]

    @pytest.mark.asyncio
    async def test_check_grammar_different_language(self, service):
        """check_grammar with different language."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "issues": [],
                "corrected_text": "Bonjour le monde",
                "score": 100.0,
            })

            await service.check_grammar("Bonjour le monde", language="fr")

            call_args = mock_call.call_args[0]
            assert "fr" in call_args[0]

    @pytest.mark.asyncio
    async def test_check_grammar_json_error_fallback(self, service):
        """check_grammar handles JSON parse error."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Invalid JSON response"

            result = await service.check_grammar("test text")

            assert result.issues == []
            assert result.score == 100.0


# =============================================================================
# SUMMARIZE TESTS
# =============================================================================


class TestSummarize:
    """Tests for summarize method."""

    @pytest.mark.asyncio
    async def test_summarize_returns_result(self, service):
        """summarize returns SummarizeResult."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "summary": "This is the summary.",
                "key_points": ["Point 1", "Point 2"],
            })

            result = await service.summarize("Long text " * 100)

            assert isinstance(result, SummarizeResult)
            assert "summary" in result.summary.lower() or len(result.summary) > 0

    @pytest.mark.asyncio
    async def test_summarize_empty_text(self, service):
        """Empty text returns empty summary."""
        result = await service.summarize("")

        assert result.summary == ""
        assert result.word_count_original == 0

    @pytest.mark.asyncio
    async def test_summarize_whitespace_only(self, service):
        """Whitespace-only text returns empty summary."""
        result = await service.summarize("   \n\t   ")

        assert result.summary == ""

    @pytest.mark.asyncio
    async def test_summarize_bullet_points_style(self, service):
        """summarize with bullet_points style."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "summary": "• Point one\n• Point two",
                "key_points": ["Point one", "Point two"],
            })

            await service.summarize("text", style="bullet_points")

            call_args = mock_call.call_args[0]
            assert "bullet points" in call_args[0].lower()

    @pytest.mark.asyncio
    async def test_summarize_paragraph_style(self, service):
        """summarize with paragraph style."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "summary": "A cohesive paragraph summary.",
                "key_points": [],
            })

            await service.summarize("text", style="paragraph")

            call_args = mock_call.call_args[0]
            assert "paragraph" in call_args[0].lower()

    @pytest.mark.asyncio
    async def test_summarize_executive_style(self, service):
        """summarize with executive style."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "summary": "Executive overview with conclusions.",
                "key_points": ["Conclusion 1"],
            })

            await service.summarize("text", style="executive")

            call_args = mock_call.call_args[0]
            assert "executive" in call_args[0].lower()

    @pytest.mark.asyncio
    async def test_summarize_with_max_length(self, service):
        """summarize with max_length constraint."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "summary": "Short summary",
                "key_points": [],
            })

            await service.summarize("text " * 100, max_length=50)

            call_args = mock_call.call_args[0]
            assert "50 words" in call_args[0]

    @pytest.mark.asyncio
    async def test_summarize_compression_ratio(self, service):
        """summarize calculates compression ratio."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "summary": "Short",
                "key_points": [],
            })

            text = "word " * 100  # 100 words
            result = await service.summarize(text)

            assert result.word_count_original == 100
            assert result.compression_ratio < 1.0

    @pytest.mark.asyncio
    async def test_summarize_json_error_fallback(self, service):
        """summarize handles JSON parse error."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Not valid JSON"

            result = await service.summarize("text " * 100)

            # Fallback truncates to 500 chars
            assert len(result.summary) <= 503  # 500 + "..."


# =============================================================================
# REWRITE TESTS
# =============================================================================


class TestRewrite:
    """Tests for rewrite method."""

    @pytest.mark.asyncio
    async def test_rewrite_returns_result(self, service):
        """rewrite returns RewriteResult."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "rewritten_text": "Professionally written text.",
                "changes_made": ["Improved clarity"],
            })

            result = await service.rewrite("some text")

            assert isinstance(result, RewriteResult)

    @pytest.mark.asyncio
    async def test_rewrite_empty_text(self, service):
        """Empty text returns empty result."""
        result = await service.rewrite("")

        assert result.rewritten_text == ""
        assert result.tone == WritingTone.PROFESSIONAL.value

    @pytest.mark.asyncio
    async def test_rewrite_whitespace_only(self, service):
        """Whitespace-only returns empty result."""
        result = await service.rewrite("   ")

        assert result.rewritten_text == "   "

    @pytest.mark.asyncio
    @pytest.mark.parametrize("tone", list(WritingTone))
    async def test_rewrite_all_tones(self, service, tone: WritingTone):
        """rewrite works with all tone options."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "rewritten_text": f"Text in {tone.value} tone.",
                "changes_made": ["Applied tone"],
            })

            result = await service.rewrite("text", tone=tone)

            assert result.tone == tone.value

    @pytest.mark.asyncio
    async def test_rewrite_preserve_meaning(self, service):
        """rewrite with preserve_meaning flag."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "rewritten_text": "Same meaning, different words.",
                "changes_made": [],
            })

            await service.rewrite("text", preserve_meaning=True)

            call_args = mock_call.call_args[0]
            assert "preserve" in call_args[0].lower()

    @pytest.mark.asyncio
    async def test_rewrite_not_preserve_meaning(self, service):
        """rewrite without preserve_meaning."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "rewritten_text": "Adjusted for clarity.",
                "changes_made": [],
            })

            await service.rewrite("text", preserve_meaning=False)

            call_args = mock_call.call_args[0]
            assert "adjust" in call_args[0].lower()

    @pytest.mark.asyncio
    async def test_rewrite_json_error_fallback(self, service):
        """rewrite handles JSON parse error."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Invalid JSON"

            result = await service.rewrite("test text")

            assert result.rewritten_text == "test text"
            assert result.changes_made == []


# =============================================================================
# EXPAND TESTS
# =============================================================================


class TestExpand:
    """Tests for expand method."""

    @pytest.mark.asyncio
    async def test_expand_returns_result(self, service):
        """expand returns ExpandResult."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "expanded_text": "Much longer expanded text with details.",
                "sections_added": ["Introduction", "Details"],
            })

            result = await service.expand("short text")

            assert isinstance(result, ExpandResult)

    @pytest.mark.asyncio
    async def test_expand_empty_text(self, service):
        """Empty text returns empty result."""
        result = await service.expand("")

        assert result.expanded_text == ""
        assert result.word_count_original == 0

    @pytest.mark.asyncio
    async def test_expand_whitespace_only(self, service):
        """Whitespace-only returns empty result."""
        result = await service.expand("   ")

        assert result.expanded_text == "   "

    @pytest.mark.asyncio
    async def test_expand_with_examples(self, service):
        """expand with add_examples flag."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "expanded_text": "Text with examples: For example...",
                "sections_added": ["Examples"],
            })

            await service.expand("text", add_examples=True)

            call_args = mock_call.call_args[0]
            assert "examples" in call_args[0].lower()

    @pytest.mark.asyncio
    async def test_expand_with_details(self, service):
        """expand with add_details flag."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "expanded_text": "Text with explanatory details.",
                "sections_added": ["Details"],
            })

            await service.expand("text", add_details=True)

            call_args = mock_call.call_args[0]
            assert "details" in call_args[0].lower()

    @pytest.mark.asyncio
    async def test_expand_with_target_length(self, service):
        """expand with target_length constraint."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "expanded_text": "Expanded to target length.",
                "sections_added": [],
            })

            await service.expand("text", target_length=500)

            call_args = mock_call.call_args[0]
            assert "500 words" in call_args[0]

    @pytest.mark.asyncio
    async def test_expand_word_count_tracking(self, service):
        """expand tracks word counts."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "expanded_text": "much longer text " * 10,
                "sections_added": [],
            })

            result = await service.expand("short")

            assert result.word_count_original == 1
            assert result.word_count_expanded > result.word_count_original

    @pytest.mark.asyncio
    async def test_expand_json_error_fallback(self, service):
        """expand handles JSON parse error."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Invalid JSON"

            result = await service.expand("test text")

            assert result.expanded_text == "test text"
            assert result.sections_added == []


# =============================================================================
# TRANSLATE TESTS
# =============================================================================


class TestTranslate:
    """Tests for translate method."""

    @pytest.mark.asyncio
    async def test_translate_returns_result(self, service):
        """translate returns TranslateResult."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "translated_text": "Hola mundo",
                "source_language": "English",
                "confidence": 0.95,
            })

            result = await service.translate("Hello world", "Spanish")

            assert isinstance(result, TranslateResult)
            assert result.target_language == "Spanish"

    @pytest.mark.asyncio
    async def test_translate_empty_text(self, service):
        """Empty text returns empty result."""
        result = await service.translate("", "Spanish")

        assert result.translated_text == ""
        assert result.target_language == "Spanish"

    @pytest.mark.asyncio
    async def test_translate_whitespace_only(self, service):
        """Whitespace-only returns empty result."""
        result = await service.translate("   ", "French")

        assert result.translated_text == "   "

    @pytest.mark.asyncio
    async def test_translate_auto_detect_source(self, service):
        """translate auto-detects source language."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "translated_text": "Bonjour",
                "source_language": "English",
                "confidence": 0.9,
            })

            await service.translate("Hello", "French", source_language=None)

            call_args = mock_call.call_args[0]
            assert "detect" in call_args[0].lower()

    @pytest.mark.asyncio
    async def test_translate_specified_source(self, service):
        """translate with specified source language."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "translated_text": "Hello",
                "source_language": "German",
                "confidence": 0.95,
            })

            await service.translate("Hallo", "English", source_language="German")

            call_args = mock_call.call_args[0]
            assert "German" in call_args[0]

    @pytest.mark.asyncio
    async def test_translate_preserve_formatting(self, service):
        """translate with preserve_formatting flag."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "translated_text": "• Point one\n• Point two",
                "source_language": "English",
                "confidence": 0.9,
            })

            await service.translate("• Item\n• Item", "Spanish", preserve_formatting=True)

            call_args = mock_call.call_args[0]
            assert "formatting" in call_args[0].lower()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("target_lang", [
        "Spanish", "French", "German", "Chinese", "Japanese",
        "Korean", "Portuguese", "Italian", "Russian", "Arabic",
    ])
    async def test_translate_various_languages(self, service, target_lang: str):
        """translate works with various target languages."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "translated_text": f"Translated to {target_lang}",
                "source_language": "English",
                "confidence": 0.9,
            })

            result = await service.translate("Hello", target_lang)

            assert result.target_language == target_lang

    @pytest.mark.asyncio
    async def test_translate_json_error_fallback(self, service):
        """translate handles JSON parse error."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Invalid JSON"

            result = await service.translate("test", "Spanish")

            assert result.translated_text == "test"
            assert result.confidence == 0.0


# =============================================================================
# GENERATE CONTENT TESTS
# =============================================================================


class TestGenerateContent:
    """Tests for generate_content method."""

    @pytest.mark.asyncio
    async def test_generate_content_returns_string(self, service):
        """generate_content returns string."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Generated content here."

            result = await service.generate_content("Write about AI")

            assert isinstance(result, str)
            assert len(result) > 0

    @pytest.mark.asyncio
    async def test_generate_content_with_context(self, service):
        """generate_content uses provided context."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Context-aware content."

            await service.generate_content(
                "Write about topic",
                context="Previous discussion context",
            )

            call_args = mock_call.call_args[0]
            assert "context" in call_args[0].lower()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("tone", list(WritingTone))
    async def test_generate_content_all_tones(self, service, tone: WritingTone):
        """generate_content works with all tones."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = f"Content in {tone.value} tone."

            result = await service.generate_content("prompt", tone=tone)

            assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_generate_content_with_max_length(self, service):
        """generate_content respects max_length."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = "Short content."

            await service.generate_content("prompt", max_length=100)

            call_args = mock_call.call_args[0]
            assert "100 words" in call_args[0]

    @pytest.mark.asyncio
    async def test_generate_content_error_propagates(self, service):
        """generate_content propagates errors."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.side_effect = RuntimeError("API error")

            with pytest.raises(RuntimeError):
                await service.generate_content("prompt")


# =============================================================================
# OPENAI CALL TESTS
# =============================================================================


class TestOpenAICall:
    """Tests for _call_openai method."""

    def test_call_openai_uses_correct_model(self, service):
        """_call_openai uses configured model."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = "response"
            mock_client.chat.completions.create.return_value = mock_response

            service._call_openai("system", "user")

            call_kwargs = mock_client.chat.completions.create.call_args[1]
            assert "model" in call_kwargs

    def test_call_openai_sets_messages(self, service):
        """_call_openai sets system and user messages."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = "response"
            mock_client.chat.completions.create.return_value = mock_response

            service._call_openai("system prompt", "user prompt")

            call_kwargs = mock_client.chat.completions.create.call_args[1]
            messages = call_kwargs["messages"]
            assert len(messages) == 2
            assert messages[0]["role"] == "system"
            assert messages[1]["role"] == "user"

    def test_call_openai_error_propagates(self, service):
        """_call_openai propagates API errors."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_client.chat.completions.create.side_effect = Exception("API Error")

            with pytest.raises(Exception, match="API Error"):
                service._call_openai("system", "user")

    def test_call_openai_handles_empty_response(self, service):
        """_call_openai handles empty content."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = None
            mock_client.chat.completions.create.return_value = mock_response

            result = service._call_openai("system", "user")

            assert result == ""


# =============================================================================
# INTEGRATION TESTS
# =============================================================================


class TestServiceIntegration:
    """Integration tests for WritingService."""

    @pytest.mark.asyncio
    async def test_multiple_operations_share_client(self, service):
        """Multiple operations reuse the same client."""
        with patch('openai.OpenAI') as mock_class:
            mock_client = Mock()
            mock_class.return_value = mock_client
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message.content = json.dumps({
                "issues": [], "corrected_text": "text", "score": 100.0,
            })
            mock_client.chat.completions.create.return_value = mock_response

            await service.check_grammar("text1")
            await service.check_grammar("text2")

            mock_class.assert_called_once()

    @pytest.mark.asyncio
    async def test_unicode_text_handling(self, service):
        """Service handles unicode text properly."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "translated_text": "你好世界",
                "source_language": "English",
                "confidence": 0.95,
            })

            result = await service.translate("Hello world", "Chinese")

            assert "你好" in result.translated_text

    @pytest.mark.asyncio
    async def test_long_text_handling(self, service):
        """Service handles very long text."""
        long_text = "word " * 10000  # 10000 words

        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "summary": "Summary of long text.",
                "key_points": ["Main point"],
            })

            result = await service.summarize(long_text)

            assert result.word_count_original == 10000


# =============================================================================
# EDGE CASE TESTS
# =============================================================================


class TestEdgeCases:
    """Edge case tests."""

    @pytest.mark.asyncio
    async def test_special_characters_in_text(self, service):
        """Service handles special characters."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "issues": [],
                "corrected_text": "Text with <>&\"' chars",
                "score": 100.0,
            })

            result = await service.check_grammar("Text with <>&\"' chars")

            assert result.corrected_text == "Text with <>&\"' chars"

    @pytest.mark.asyncio
    async def test_newlines_in_text(self, service):
        """Service handles multi-line text."""
        text = "Line 1\nLine 2\nLine 3"

        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "rewritten_text": "Line 1\nLine 2\nLine 3",
                "changes_made": [],
            })

            result = await service.rewrite(text)

            assert "\n" in result.rewritten_text

    @pytest.mark.asyncio
    async def test_emoji_in_text(self, service):
        """Service handles emoji."""
        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "expanded_text": "Hello! 👋 More text here.",
                "sections_added": [],
            })

            result = await service.expand("Hello! 👋")

            assert "👋" in result.expanded_text

    @pytest.mark.asyncio
    async def test_mixed_languages_in_text(self, service):
        """Service handles mixed language text."""
        text = "Hello 你好 Bonjour"

        with patch.object(service, '_call_openai') as mock_call:
            mock_call.return_value = json.dumps({
                "issues": [],
                "corrected_text": text,
                "score": 100.0,
            })

            result = await service.check_grammar(text)

            assert "你好" in result.corrected_text
