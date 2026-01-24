"""
AI Agents Service
Specialized AI agents for research, analysis, email drafting, and more.
"""
from __future__ import annotations

import logging
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class AgentType(str, Enum):
    """Types of AI agents."""
    RESEARCH = "research"
    DATA_ANALYST = "data_analyst"
    EMAIL_DRAFT = "email_draft"
    CONTENT_REPURPOSE = "content_repurpose"
    PROOFREADING = "proofreading"


class AgentStatus(str, Enum):
    """Agent execution status."""
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentTask(BaseModel):
    """Task assigned to an agent."""
    task_id: str
    agent_type: AgentType
    input: Dict[str, Any]
    status: AgentStatus = AgentStatus.IDLE
    progress: float = 0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class ResearchReport(BaseModel):
    """Result from research agent."""
    topic: str
    summary: str
    sections: List[Dict[str, str]] = Field(default_factory=list)  # {title, content}
    sources: List[Dict[str, str]] = Field(default_factory=list)  # {title, url}
    key_findings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    word_count: int = 0


class DataAnalysisResult(BaseModel):
    """Result from data analyst agent."""
    query: str
    answer: str
    data_summary: Dict[str, Any] = Field(default_factory=dict)
    insights: List[str] = Field(default_factory=list)
    charts: List[Dict[str, Any]] = Field(default_factory=list)
    sql_queries: List[str] = Field(default_factory=list)
    confidence: float = 0


class EmailDraft(BaseModel):
    """Result from email draft agent."""
    subject: str
    body: str
    tone: str
    suggested_recipients: List[str] = Field(default_factory=list)
    attachments_suggested: List[str] = Field(default_factory=list)
    follow_up_actions: List[str] = Field(default_factory=list)


class RepurposedContent(BaseModel):
    """Result from content repurposing agent."""
    original_format: str
    outputs: List[Dict[str, Any]] = Field(default_factory=list)  # {format, content, metadata}
    adaptations_made: List[str] = Field(default_factory=list)


class ProofreadingResult(BaseModel):
    """Result from proofreading agent."""
    original_text: str
    corrected_text: str
    issues_found: List[Dict[str, Any]] = Field(default_factory=list)
    style_suggestions: List[str] = Field(default_factory=list)
    readability_score: float = 0
    word_count: int = 0
    reading_level: str = ""


class BaseAgent(ABC):
    """Base class for AI agents."""

    def __init__(self):
        self._client = None

    def _get_client(self):
        """Get OpenAI client."""
        if self._client is None:
            from backend.app.services.config import get_settings
            from openai import OpenAI
            settings = get_settings()
            self._client = OpenAI(api_key=settings.openai_api_key)
        return self._client

    def _get_model(self) -> str:
        """Get model name from settings."""
        from backend.app.services.config import get_settings
        return get_settings().openai_model or "gpt-4"

    def _call_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.7,
    ) -> str:
        """Make an OpenAI API call with proper parameter handling for different models."""
        client = self._get_client()
        model = self._get_model()

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
            create_params["temperature"] = temperature

        response = client.chat.completions.create(**create_params)
        return response.choices[0].message.content or ""

    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        """Execute the agent's task."""
        pass


class ResearchAgent(BaseAgent):
    """
    Research Agent
    Deep-dives into any topic and compiles comprehensive reports.
    """

    async def execute(
        self,
        topic: str,
        depth: str = "comprehensive",  # quick, moderate, comprehensive
        focus_areas: Optional[List[str]] = None,
        max_sections: int = 5,
    ) -> ResearchReport:
        """
        Research a topic and compile a report.

        Args:
            topic: Topic to research
            depth: Research depth level
            focus_areas: Specific areas to focus on
            max_sections: Maximum number of sections

        Returns:
            ResearchReport with findings
        """
        client = self._get_client()
        model = self._get_model()

        focus_prompt = ""
        if focus_areas:
            focus_prompt = f"\nFocus on these areas: {', '.join(focus_areas)}"

        depth_instructions = {
            "quick": "Provide a brief overview with key points only.",
            "moderate": "Provide a balanced report with main points and some detail.",
            "comprehensive": "Provide an in-depth analysis with detailed sections, examples, and recommendations.",
        }

        system_prompt = f"""You are an expert research analyst. Your task is to research the given topic and compile a comprehensive report.

{depth_instructions.get(depth, depth_instructions['moderate'])}
{focus_prompt}

Structure your response as JSON:
{{
    "summary": "<executive summary>",
    "sections": [
        {{"title": "<section title>", "content": "<detailed content>"}},
        ...
    ],
    "key_findings": ["<finding 1>", "<finding 2>", ...],
    "recommendations": ["<recommendation 1>", ...],
    "sources": [{{"title": "<source title>", "url": "<url if applicable>"}}]
}}

Limit to {max_sections} main sections."""

        try:
            content = self._call_openai(
                system_prompt=system_prompt,
                user_prompt=f"Research topic: {topic}",
                max_tokens=4000,
                temperature=0.7,
            )
            import json

            # Handle markdown code blocks
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            result = json.loads(content)

            return ResearchReport(
                topic=topic,
                summary=result.get("summary", ""),
                sections=result.get("sections", []),
                sources=result.get("sources", []),
                key_findings=result.get("key_findings", []),
                recommendations=result.get("recommendations", []),
                word_count=len(content.split()),
            )

        except Exception as e:
            logger.error(f"Research agent failed: {e}")
            return ResearchReport(
                topic=topic,
                summary=f"Research failed: {str(e)}",
            )


class DataAnalystAgent(BaseAgent):
    """
    Data Analyst Agent
    Answers questions about data and generates insights.
    """

    async def execute(
        self,
        question: str,
        data: List[Dict[str, Any]],
        data_description: Optional[str] = None,
        generate_charts: bool = True,
    ) -> DataAnalysisResult:
        """
        Analyze data and answer questions.

        Args:
            question: Question about the data
            data: Data to analyze
            data_description: Description of the data
            generate_charts: Whether to suggest charts

        Returns:
            DataAnalysisResult with analysis
        """
        client = self._get_client()
        model = self._get_model()

        # Prepare data sample
        import json
        data_sample = json.dumps(data[:20], indent=2, default=str)

        # Get column info
        if data:
            columns = list(data[0].keys())
            column_info = f"Columns: {', '.join(columns)}"
        else:
            column_info = "No data provided"

        system_prompt = f"""You are an expert data analyst. Analyze the provided data and answer the question.

Data Description: {data_description or 'Not provided'}
{column_info}
Total rows: {len(data)}

Provide your response as JSON:
{{
    "answer": "<direct answer to the question>",
    "data_summary": {{"key metrics": "..."}},
    "insights": ["<insight 1>", "<insight 2>", ...],
    "charts": [{{"type": "<chart type>", "title": "<title>", "x_column": "<col>", "y_columns": ["<col>"]}}],
    "sql_queries": ["<SQL query that would answer this>"],
    "confidence": <0.0-1.0>
}}"""

        try:
            content = self._call_openai(
                system_prompt=system_prompt,
                user_prompt=f"Data sample:\n{data_sample}\n\nQuestion: {question}",
                max_tokens=2000,
                temperature=0.3,
            )
            import json

            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            result = json.loads(content)

            return DataAnalysisResult(
                query=question,
                answer=result.get("answer", ""),
                data_summary=result.get("data_summary", {}),
                insights=result.get("insights", []),
                charts=result.get("charts", []) if generate_charts else [],
                sql_queries=result.get("sql_queries", []),
                confidence=result.get("confidence", 0.5),
            )

        except Exception as e:
            logger.error(f"Data analyst agent failed: {e}")
            return DataAnalysisResult(
                query=question,
                answer=f"Analysis failed: {str(e)}",
            )


class EmailDraftAgent(BaseAgent):
    """
    Email Draft Agent
    Composes email responses based on context and previous emails.
    """

    async def execute(
        self,
        context: str,
        purpose: str,
        tone: str = "professional",
        recipient_info: Optional[str] = None,
        previous_emails: Optional[List[str]] = None,
        include_subject: bool = True,
    ) -> EmailDraft:
        """
        Draft an email response.

        Args:
            context: Context for the email
            purpose: Purpose of the email
            tone: Desired tone (professional, friendly, formal, casual)
            recipient_info: Information about the recipient
            previous_emails: Previous emails in the thread
            include_subject: Whether to suggest a subject line

        Returns:
            EmailDraft with the composed email
        """
        client = self._get_client()
        model = self._get_model()

        previous_context = ""
        if previous_emails:
            previous_context = "\n\nPrevious emails in thread:\n" + "\n---\n".join(previous_emails[-3:])

        recipient_context = ""
        if recipient_info:
            recipient_context = f"\n\nRecipient information: {recipient_info}"

        system_prompt = f"""You are an expert email writer. Draft an email based on the context and purpose provided.

Tone: {tone}
{recipient_context}
{previous_context}

Provide your response as JSON:
{{
    "subject": "<email subject line>",
    "body": "<full email body>",
    "tone": "{tone}",
    "suggested_recipients": ["<email if mentioned>"],
    "attachments_suggested": ["<suggested attachment if relevant>"],
    "follow_up_actions": ["<action items from this email>"]
}}"""

        try:
            content = self._call_openai(
                system_prompt=system_prompt,
                user_prompt=f"Context: {context}\n\nPurpose: {purpose}",
                max_tokens=1500,
                temperature=0.7,
            )
            import json

            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            result = json.loads(content)

            return EmailDraft(
                subject=result.get("subject", ""),
                body=result.get("body", ""),
                tone=result.get("tone", tone),
                suggested_recipients=result.get("suggested_recipients", []),
                attachments_suggested=result.get("attachments_suggested", []),
                follow_up_actions=result.get("follow_up_actions", []),
            )

        except Exception as e:
            logger.error(f"Email draft agent failed: {e}")
            return EmailDraft(
                subject="",
                body=f"Draft failed: {str(e)}",
                tone=tone,
            )


class ContentRepurposingAgent(BaseAgent):
    """
    Content Repurposing Agent
    Transforms content from one format to multiple other formats.
    """

    async def execute(
        self,
        content: str,
        source_format: str,
        target_formats: List[str],
        preserve_key_points: bool = True,
        adapt_length: bool = True,
    ) -> RepurposedContent:
        """
        Repurpose content into multiple formats.

        Args:
            content: Original content
            source_format: Original format (article, report, transcript, etc.)
            target_formats: Target formats (tweet_thread, linkedin_post, blog_summary, slides, etc.)
            preserve_key_points: Ensure key points are preserved
            adapt_length: Adapt length for each format

        Returns:
            RepurposedContent with all versions
        """
        client = self._get_client()
        model = self._get_model()

        format_guidelines = {
            "tweet_thread": "Create a Twitter thread (max 280 chars per tweet, 5-10 tweets)",
            "linkedin_post": "Create a LinkedIn post (professional tone, 1300 chars max)",
            "blog_summary": "Create a blog-style summary (300-500 words)",
            "slides": "Create slide content (title + 3-5 bullet points per slide, max 10 slides)",
            "email_newsletter": "Create newsletter content (catchy subject, scannable body)",
            "video_script": "Create a video script (conversational, 2-3 minutes)",
            "infographic": "Create infographic copy (headline, key stats, takeaways)",
            "podcast_notes": "Create podcast show notes (summary, timestamps, links)",
            "press_release": "Create press release format (headline, lead, quotes)",
            "executive_summary": "Create executive summary (1 page, key decisions)",
        }

        outputs = []
        adaptations = []

        for target_format in target_formats:
            guidelines = format_guidelines.get(target_format, f"Create {target_format} format content")

            system_prompt = f"""You are a content repurposing expert. Transform the following {source_format} into {target_format} format.

Guidelines: {guidelines}
{'Preserve all key points and main ideas.' if preserve_key_points else ''}
{'Adapt the length appropriately for the format.' if adapt_length else ''}

Return ONLY the transformed content, no explanations."""

            try:
                transformed = self._call_openai(
                    system_prompt=system_prompt,
                    user_prompt=content,
                    max_tokens=2000,
                    temperature=0.7,
                )

                outputs.append({
                    "format": target_format,
                    "content": transformed,
                    "metadata": {
                        "word_count": len(transformed.split()),
                        "char_count": len(transformed),
                    }
                })

                adaptations.append(f"Converted to {target_format}")

            except Exception as e:
                logger.error(f"Failed to repurpose to {target_format}: {e}")
                outputs.append({
                    "format": target_format,
                    "content": f"Conversion failed: {str(e)}",
                    "metadata": {"error": True}
                })

        return RepurposedContent(
            original_format=source_format,
            outputs=outputs,
            adaptations_made=adaptations,
        )


class ProofreadingAgent(BaseAgent):
    """
    Proofreading Agent
    Comprehensive style and grammar checking.
    """

    async def execute(
        self,
        text: str,
        style_guide: Optional[str] = None,
        focus_areas: Optional[List[str]] = None,
        preserve_voice: bool = True,
    ) -> ProofreadingResult:
        """
        Proofread and improve text.

        Args:
            text: Text to proofread
            style_guide: Style guide to follow (AP, Chicago, etc.)
            focus_areas: Specific areas to focus on
            preserve_voice: Preserve author's voice

        Returns:
            ProofreadingResult with corrections
        """
        client = self._get_client()
        model = self._get_model()

        style_context = f"\nFollow {style_guide} style guide." if style_guide else ""
        focus_context = f"\nFocus especially on: {', '.join(focus_areas)}" if focus_areas else ""
        voice_context = "\nPreserve the author's unique voice while making corrections." if preserve_voice else ""

        system_prompt = f"""You are an expert editor and proofreader. Review the text for:
1. Grammar and spelling errors
2. Punctuation issues
3. Style and clarity improvements
4. Consistency issues
5. Readability enhancements
{style_context}{focus_context}{voice_context}

Provide your response as JSON:
{{
    "corrected_text": "<the improved text>",
    "issues_found": [
        {{"type": "<error type>", "original": "<original text>", "correction": "<corrected>", "explanation": "<why>"}}
    ],
    "style_suggestions": ["<suggestion 1>", ...],
    "readability_score": <0-100>,
    "reading_level": "<grade level>"
}}"""

        try:
            content = self._call_openai(
                system_prompt=system_prompt,
                user_prompt=text,
                max_tokens=4000,
                temperature=0.3,
            )
            import json

            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]

            result = json.loads(content)

            return ProofreadingResult(
                original_text=text,
                corrected_text=result.get("corrected_text", text),
                issues_found=result.get("issues_found", []),
                style_suggestions=result.get("style_suggestions", []),
                readability_score=result.get("readability_score", 0),
                word_count=len(text.split()),
                reading_level=result.get("reading_level", ""),
            )

        except Exception as e:
            logger.error(f"Proofreading agent failed: {e}")
            return ProofreadingResult(
                original_text=text,
                corrected_text=text,
                issues_found=[{"type": "error", "original": "", "correction": "", "explanation": str(e)}],
            )


class AgentService:
    """
    Central service for managing AI agents.
    """

    def __init__(self):
        self._agents = {
            AgentType.RESEARCH: ResearchAgent(),
            AgentType.DATA_ANALYST: DataAnalystAgent(),
            AgentType.EMAIL_DRAFT: EmailDraftAgent(),
            AgentType.CONTENT_REPURPOSE: ContentRepurposingAgent(),
            AgentType.PROOFREADING: ProofreadingAgent(),
        }
        self._tasks: Dict[str, AgentTask] = {}

    async def run_agent(
        self,
        agent_type: AgentType,
        **kwargs,
    ) -> AgentTask:
        """
        Run an agent with the given parameters.

        Args:
            agent_type: Type of agent to run
            **kwargs: Agent-specific parameters

        Returns:
            AgentTask with results
        """
        task_id = hashlib.sha256(f"{agent_type}:{datetime.utcnow().isoformat()}".encode()).hexdigest()[:12]

        task = AgentTask(
            task_id=task_id,
            agent_type=agent_type,
            input=kwargs,
            status=AgentStatus.RUNNING,
        )
        self._tasks[task_id] = task

        try:
            agent = self._agents.get(agent_type)
            if not agent:
                raise ValueError(f"Unknown agent type: {agent_type}")

            result = await agent.execute(**kwargs)
            task.result = result.model_dump() if hasattr(result, "model_dump") else result
            task.status = AgentStatus.COMPLETED

        except Exception as e:
            task.status = AgentStatus.FAILED
            task.error = str(e)
            logger.error(f"Agent {agent_type} failed: {e}")

        task.completed_at = datetime.utcnow()
        return task

    def get_task(self, task_id: str) -> Optional[AgentTask]:
        """Get task by ID."""
        return self._tasks.get(task_id)

    def list_tasks(self, agent_type: Optional[AgentType] = None) -> List[AgentTask]:
        """List all tasks, optionally filtered by agent type."""
        tasks = list(self._tasks.values())
        if agent_type:
            tasks = [t for t in tasks if t.agent_type == agent_type]
        return sorted(tasks, key=lambda t: t.created_at, reverse=True)


# Singleton instances
agent_service = AgentService()
