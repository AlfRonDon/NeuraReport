"""
OpenAI LLM client implementation.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional

from .base import LLMClient, LLMConfig, LLMResponse, Message
from ...core import Result, Ok, Err, DomainError, LLMError

logger = logging.getLogger("neura.adapters.llm.openai")


class OpenAIClient(LLMClient):
    """
    OpenAI API client.

    Uses the OpenAI Python SDK with async support.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        organization: Optional[str] = None,
        default_config: Optional[LLMConfig] = None,
    ):
        self._api_key = api_key or os.getenv("OPENAI_API_KEY")
        self._organization = organization or os.getenv("OPENAI_ORGANIZATION")
        self._default_config = default_config or LLMConfig()
        self._client = None

    def _get_client(self):
        """Get or create the OpenAI client."""
        if self._client is None:
            try:
                from openai import AsyncOpenAI
            except ImportError:
                raise ImportError("OpenAI package not installed. Run: pip install openai")

            self._client = AsyncOpenAI(
                api_key=self._api_key,
                organization=self._organization,
            )
        return self._client

    async def complete(
        self,
        messages: List[Message],
        config: Optional[LLMConfig] = None,
    ) -> Result[LLMResponse, DomainError]:
        """Generate a completion."""
        cfg = config or self._default_config

        try:
            client = self._get_client()
        except ImportError as e:
            return Err(LLMError(
                code="client_init_failed",
                message=str(e),
                provider="openai",
            ))

        # Convert messages to API format
        api_messages = [{"role": m.role, "content": m.content} for m in messages]

        last_error: Exception | None = None
        for attempt in range(cfg.retry_count + 1):
            try:
                response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=cfg.model,
                        messages=api_messages,
                        temperature=cfg.temperature,
                        max_tokens=cfg.max_tokens,
                    ),
                    timeout=cfg.timeout_seconds,
                )

                choice = response.choices[0]
                usage = {
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0,
                }

                return Ok(LLMResponse(
                    content=choice.message.content or "",
                    model=response.model,
                    usage=usage,
                    finish_reason=choice.finish_reason or "",
                    raw_response=response,
                ))

            except asyncio.TimeoutError:
                last_error = asyncio.TimeoutError(f"Request timed out after {cfg.timeout_seconds}s")
            except Exception as e:
                last_error = e

            if attempt < cfg.retry_count:
                logger.warning(f"LLM request failed (attempt {attempt + 1}), retrying...")
                await asyncio.sleep(cfg.retry_delay_seconds)

        return Err(LLMError(
            code="request_failed",
            message=str(last_error),
            provider="openai",
            model=cfg.model,
            cause=last_error,
        ))

    async def complete_json(
        self,
        messages: List[Message],
        schema: Dict[str, Any],
        config: Optional[LLMConfig] = None,
    ) -> Result[Dict[str, Any], DomainError]:
        """Generate a JSON completion."""
        cfg = config or self._default_config

        # Add JSON instruction to system message
        json_instruction = f"""
Respond with valid JSON matching this schema:
{json.dumps(schema, indent=2)}

Output ONLY the JSON, no additional text or markdown.
"""

        enhanced_messages = list(messages)
        if enhanced_messages and enhanced_messages[0].role == "system":
            enhanced_messages[0] = Message(
                role="system",
                content=f"{enhanced_messages[0].content}\n\n{json_instruction}",
            )
        else:
            enhanced_messages.insert(0, Message(role="system", content=json_instruction))

        result = await self.complete(enhanced_messages, cfg)

        if isinstance(result, Err):
            return result

        # Parse JSON from response
        content = result.value.content.strip()

        # Remove markdown code blocks if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        try:
            parsed = json.loads(content)
            return Ok(parsed)
        except json.JSONDecodeError as e:
            return Err(LLMError(
                code="json_parse_failed",
                message=f"Failed to parse JSON response: {e}",
                provider="openai",
                model=cfg.model,
                details={"content": content[:500]},
            ))

    async def embed(
        self,
        text: str,
    ) -> Result[List[float], DomainError]:
        """Generate embeddings."""
        try:
            client = self._get_client()
        except ImportError as e:
            return Err(LLMError(
                code="client_init_failed",
                message=str(e),
                provider="openai",
            ))

        try:
            response = await client.embeddings.create(
                model="text-embedding-ada-002",
                input=text,
            )
            return Ok(response.data[0].embedding)
        except Exception as e:
            return Err(LLMError(
                code="embedding_failed",
                message=str(e),
                provider="openai",
                cause=e,
            ))
