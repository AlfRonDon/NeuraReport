"""
AI Writing Service
Provides AI-powered writing assistance using OpenAI for grammar checking,
summarization, rewriting, expansion, and translation.
"""
from __future__ import annotations

import logging
from typing import Any, List, Optional
from enum import Enum

from pydantic import BaseModel, Field

from backend.app.services.config import get_settings

logger = logging.getLogger(__name__)


class WritingTone(str, Enum):
    """Available writing tones for rewriting."""
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    FORMAL = "formal"
    FRIENDLY = "friendly"
    ACADEMIC = "academic"
    TECHNICAL = "technical"
    PERSUASIVE = "persuasive"
    CONCISE = "concise"


class GrammarIssue(BaseModel):
    """Represents a grammar or style issue found in text."""
    start: int = Field(..., description="Start position in text")
    end: int = Field(..., description="End position in text")
    original: str = Field(..., description="Original text")
    suggestion: str = Field(..., description="Suggested correction")
    issue_type: str = Field(..., description="Type of issue (grammar, spelling, style, etc.)")
    explanation: str = Field(..., description="Explanation of the issue")
    severity: str = Field(default="warning", description="Severity: error, warning, suggestion")


class GrammarCheckResult(BaseModel):
    """Result of grammar check operation."""
    issues: List[GrammarIssue] = Field(default_factory=list)
    corrected_text: str = Field(..., description="Text with all corrections applied")
    issue_count: int = Field(..., description="Total number of issues found")
    score: float = Field(..., description="Quality score 0-100")


class SummarizeResult(BaseModel):
    """Result of summarization operation."""
    summary: str = Field(..., description="Summarized text")
    key_points: List[str] = Field(default_factory=list, description="Key points extracted")
    word_count_original: int = Field(..., description="Original word count")
    word_count_summary: int = Field(..., description="Summary word count")
    compression_ratio: float = Field(..., description="Compression ratio")


class RewriteResult(BaseModel):
    """Result of rewrite operation."""
    rewritten_text: str = Field(..., description="Rewritten text")
    tone: str = Field(..., description="Applied tone")
    changes_made: List[str] = Field(default_factory=list, description="Summary of changes")


class ExpandResult(BaseModel):
    """Result of expansion operation."""
    expanded_text: str = Field(..., description="Expanded text")
    sections_added: List[str] = Field(default_factory=list, description="Sections or points added")
    word_count_original: int = Field(..., description="Original word count")
    word_count_expanded: int = Field(..., description="Expanded word count")


class TranslateResult(BaseModel):
    """Result of translation operation."""
    translated_text: str = Field(..., description="Translated text")
    source_language: str = Field(..., description="Detected or specified source language")
    target_language: str = Field(..., description="Target language")
    confidence: float = Field(default=1.0, description="Translation confidence 0-1")


class WritingService:
    """
    AI-powered writing assistance service.
    Uses OpenAI for grammar checking, summarization, rewriting, expansion, and translation.
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

        try:
            response = client.chat.completions.create(
                model=self._settings.openai_model or "gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise

    async def check_grammar(
        self,
        text: str,
        language: str = "en",
        strict: bool = False,
    ) -> GrammarCheckResult:
        """
        Check text for grammar, spelling, and style issues.

        Args:
            text: Text to check
            language: Language code (default: en)
            strict: Enable strict mode for additional style checks

        Returns:
            GrammarCheckResult with issues and corrected text
        """
        if not text.strip():
            return GrammarCheckResult(
                issues=[],
                corrected_text=text,
                issue_count=0,
                score=100.0,
            )

        system_prompt = f"""You are an expert grammar and style checker for {language} text.
Analyze the text for:
1. Grammar errors
2. Spelling mistakes
3. Punctuation issues
4. Style improvements{' (be strict)' if strict else ''}

Respond in JSON format:
{{
    "issues": [
        {{
            "start": <position>,
            "end": <position>,
            "original": "<original text>",
            "suggestion": "<corrected text>",
            "issue_type": "<grammar|spelling|punctuation|style>",
            "explanation": "<brief explanation>",
            "severity": "<error|warning|suggestion>"
        }}
    ],
    "corrected_text": "<full text with all corrections applied>",
    "score": <0-100 quality score>
}}"""

        user_prompt = f"Check this text:\n\n{text}"

        try:
            response = self._call_openai(system_prompt, user_prompt)
            import json
            result = json.loads(response)

            return GrammarCheckResult(
                issues=[GrammarIssue(**issue) for issue in result.get("issues", [])],
                corrected_text=result.get("corrected_text", text),
                issue_count=len(result.get("issues", [])),
                score=result.get("score", 100.0),
            )
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return GrammarCheckResult(
                issues=[],
                corrected_text=text,
                issue_count=0,
                score=100.0,
            )

    async def summarize(
        self,
        text: str,
        max_length: Optional[int] = None,
        style: str = "bullet_points",
    ) -> SummarizeResult:
        """
        Summarize text with optional length limit.

        Args:
            text: Text to summarize
            max_length: Maximum length of summary in words
            style: Output style (bullet_points, paragraph, executive)

        Returns:
            SummarizeResult with summary and key points
        """
        if not text.strip():
            return SummarizeResult(
                summary="",
                key_points=[],
                word_count_original=0,
                word_count_summary=0,
                compression_ratio=1.0,
            )

        word_count_original = len(text.split())
        length_instruction = f"Keep the summary under {max_length} words." if max_length else ""

        style_instructions = {
            "bullet_points": "Use bullet points for key takeaways.",
            "paragraph": "Write as a cohesive paragraph.",
            "executive": "Write an executive summary with overview and key conclusions.",
        }

        system_prompt = f"""You are an expert summarizer. Create a clear, concise summary.
{style_instructions.get(style, style_instructions['paragraph'])}
{length_instruction}

Respond in JSON format:
{{
    "summary": "<the summary>",
    "key_points": ["<point 1>", "<point 2>", ...]
}}"""

        user_prompt = f"Summarize this text:\n\n{text}"

        try:
            response = self._call_openai(system_prompt, user_prompt)
            import json
            result = json.loads(response)

            summary = result.get("summary", "")
            word_count_summary = len(summary.split())

            return SummarizeResult(
                summary=summary,
                key_points=result.get("key_points", []),
                word_count_original=word_count_original,
                word_count_summary=word_count_summary,
                compression_ratio=word_count_summary / word_count_original if word_count_original > 0 else 1.0,
            )
        except json.JSONDecodeError:
            return SummarizeResult(
                summary=text[:500] + "..." if len(text) > 500 else text,
                key_points=[],
                word_count_original=word_count_original,
                word_count_summary=word_count_original,
                compression_ratio=1.0,
            )

    async def rewrite(
        self,
        text: str,
        tone: WritingTone = WritingTone.PROFESSIONAL,
        preserve_meaning: bool = True,
    ) -> RewriteResult:
        """
        Rewrite text with specified tone.

        Args:
            text: Text to rewrite
            tone: Target tone for rewriting
            preserve_meaning: Whether to preserve original meaning

        Returns:
            RewriteResult with rewritten text
        """
        if not text.strip():
            return RewriteResult(
                rewritten_text=text,
                tone=tone.value,
                changes_made=[],
            )

        tone_descriptions = {
            WritingTone.PROFESSIONAL: "professional and business-appropriate",
            WritingTone.CASUAL: "casual and conversational",
            WritingTone.FORMAL: "formal and official",
            WritingTone.FRIENDLY: "friendly and approachable",
            WritingTone.ACADEMIC: "academic and scholarly",
            WritingTone.TECHNICAL: "technical and precise",
            WritingTone.PERSUASIVE: "persuasive and compelling",
            WritingTone.CONCISE: "concise and direct",
        }

        system_prompt = f"""You are an expert writer. Rewrite the text to be {tone_descriptions.get(tone, 'professional')}.
{'Preserve the original meaning.' if preserve_meaning else 'You may adjust the meaning for clarity.'}

Respond in JSON format:
{{
    "rewritten_text": "<rewritten text>",
    "changes_made": ["<change 1>", "<change 2>", ...]
}}"""

        user_prompt = f"Rewrite this text:\n\n{text}"

        try:
            response = self._call_openai(system_prompt, user_prompt)
            import json
            result = json.loads(response)

            return RewriteResult(
                rewritten_text=result.get("rewritten_text", text),
                tone=tone.value,
                changes_made=result.get("changes_made", []),
            )
        except json.JSONDecodeError:
            return RewriteResult(
                rewritten_text=text,
                tone=tone.value,
                changes_made=[],
            )

    async def expand(
        self,
        text: str,
        target_length: Optional[int] = None,
        add_examples: bool = False,
        add_details: bool = True,
    ) -> ExpandResult:
        """
        Expand text with additional details and examples.

        Args:
            text: Text to expand
            target_length: Target word count
            add_examples: Whether to include examples
            add_details: Whether to add explanatory details

        Returns:
            ExpandResult with expanded text
        """
        if not text.strip():
            return ExpandResult(
                expanded_text=text,
                sections_added=[],
                word_count_original=0,
                word_count_expanded=0,
            )

        word_count_original = len(text.split())

        instructions = []
        if add_examples:
            instructions.append("Include relevant examples")
        if add_details:
            instructions.append("Add explanatory details")
        if target_length:
            instructions.append(f"Aim for approximately {target_length} words")

        system_prompt = f"""You are an expert content writer. Expand the text with more depth.
Instructions: {', '.join(instructions) if instructions else 'Expand naturally'}

Respond in JSON format:
{{
    "expanded_text": "<expanded text>",
    "sections_added": ["<section/topic added 1>", "<section/topic added 2>", ...]
}}"""

        user_prompt = f"Expand this text:\n\n{text}"

        try:
            response = self._call_openai(system_prompt, user_prompt, max_tokens=4000)
            import json
            result = json.loads(response)

            expanded = result.get("expanded_text", text)

            return ExpandResult(
                expanded_text=expanded,
                sections_added=result.get("sections_added", []),
                word_count_original=word_count_original,
                word_count_expanded=len(expanded.split()),
            )
        except json.JSONDecodeError:
            return ExpandResult(
                expanded_text=text,
                sections_added=[],
                word_count_original=word_count_original,
                word_count_expanded=word_count_original,
            )

    async def translate(
        self,
        text: str,
        target_language: str,
        source_language: Optional[str] = None,
        preserve_formatting: bool = True,
    ) -> TranslateResult:
        """
        Translate text to target language.

        Args:
            text: Text to translate
            target_language: Target language (e.g., "Spanish", "French", "es", "fr")
            source_language: Source language (auto-detect if None)
            preserve_formatting: Whether to preserve original formatting

        Returns:
            TranslateResult with translated text
        """
        if not text.strip():
            return TranslateResult(
                translated_text=text,
                source_language=source_language or "unknown",
                target_language=target_language,
                confidence=1.0,
            )

        source_instruction = f"from {source_language}" if source_language else "(detect source language)"

        system_prompt = f"""You are an expert translator. Translate the text {source_instruction} to {target_language}.
{'Preserve the original formatting (line breaks, bullet points, etc.).' if preserve_formatting else ''}

Respond in JSON format:
{{
    "translated_text": "<translated text>",
    "source_language": "<detected or specified source language>",
    "confidence": <0.0-1.0 confidence score>
}}"""

        user_prompt = f"Translate:\n\n{text}"

        try:
            response = self._call_openai(system_prompt, user_prompt, max_tokens=4000)
            import json
            result = json.loads(response)

            return TranslateResult(
                translated_text=result.get("translated_text", text),
                source_language=result.get("source_language", source_language or "auto"),
                target_language=target_language,
                confidence=result.get("confidence", 0.9),
            )
        except json.JSONDecodeError:
            return TranslateResult(
                translated_text=text,
                source_language=source_language or "unknown",
                target_language=target_language,
                confidence=0.0,
            )

    async def generate_content(
        self,
        prompt: str,
        context: Optional[str] = None,
        tone: WritingTone = WritingTone.PROFESSIONAL,
        max_length: Optional[int] = None,
    ) -> str:
        """
        Generate new content based on a prompt.

        Args:
            prompt: Content generation prompt
            context: Additional context for generation
            tone: Target tone
            max_length: Maximum length in words

        Returns:
            Generated content string
        """
        tone_desc = {
            WritingTone.PROFESSIONAL: "professional",
            WritingTone.CASUAL: "casual",
            WritingTone.FORMAL: "formal",
            WritingTone.FRIENDLY: "friendly",
            WritingTone.ACADEMIC: "academic",
            WritingTone.TECHNICAL: "technical",
            WritingTone.PERSUASIVE: "persuasive",
            WritingTone.CONCISE: "concise",
        }

        system_prompt = f"""You are an expert content writer.
Generate content that is {tone_desc.get(tone, 'professional')} in tone.
{f'Keep the response under {max_length} words.' if max_length else ''}
{f'Context: {context}' if context else ''}"""

        try:
            return self._call_openai(system_prompt, prompt, max_tokens=4000)
        except Exception as e:
            logger.error(f"Content generation failed: {e}")
            raise


# Singleton instance
writing_service = WritingService()
