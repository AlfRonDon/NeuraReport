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
                if _use_responses_model(cfg.model):
                    payload = _prepare_responses_payload(
                        {
                            "model": cfg.model,
                            "messages": api_messages,
                            "temperature": cfg.temperature,
                            "max_tokens": cfg.max_tokens,
                        }
                    )
                    response = await asyncio.wait_for(
                        client.responses.create(**payload),
                        timeout=cfg.timeout_seconds,
                    )
                    content = _response_output_text(response)
                    usage = _response_usage(response)

                    return Ok(LLMResponse(
                        content=content,
                        model=response.model if hasattr(response, "model") else cfg.model,
                        usage=usage,
                        finish_reason="stop",
                        raw_response=response,
                    ))

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


def _use_responses_model(model_name: Optional[str]) -> bool:
    force = os.getenv("OPENAI_USE_RESPONSES", "").lower() in {"1", "true", "yes"}
    return force or str(model_name or "").lower().startswith("gpt-5")


def _prepare_responses_payload(request_kwargs: Dict[str, Any]) -> Dict[str, Any]:
    payload = dict(request_kwargs)
    messages = payload.pop("messages", [])
    payload["input"] = _messages_to_responses_input(messages)
    if "max_tokens" in payload and "max_output_tokens" not in payload:
        payload["max_output_tokens"] = payload.pop("max_tokens")
    return payload


def _messages_to_responses_input(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    converted: List[Dict[str, Any]] = []
    for message in messages:
        if not isinstance(message, dict):
            continue
        role = message.get("role") or "user"
        content = message.get("content", "")
        if isinstance(content, list):
            parts: List[Dict[str, Any]] = []
            for part in content:
                if isinstance(part, dict):
                    part_type = part.get("type")
                    if part_type == "text":
                        parts.append({"type": "input_text", "text": part.get("text", "")})
                        continue
                    if part_type == "image_url":
                        image_url = part.get("image_url")
                        if isinstance(image_url, dict):
                            image_url = image_url.get("url") or image_url.get("image_url")
                        parts.append({"type": "input_image", "image_url": image_url})
                        continue
                    parts.append(part)
                else:
                    parts.append({"type": "input_text", "text": str(part)})
            content = parts
        converted.append({"role": role, "content": content})
    return converted


def _response_output_text(response: Any) -> str:
    if isinstance(response, dict):
        output_text = response.get("output_text")
        if isinstance(output_text, str) and output_text.strip():
            return output_text
        output = response.get("output")
    else:
        output_text = getattr(response, "output_text", None)
        if isinstance(output_text, str) and output_text.strip():
            return output_text
        output = getattr(response, "output", None)

    if isinstance(output, list):
        texts: List[str] = []
        for item in output:
            if isinstance(item, dict):
                item_type = item.get("type")
                content = item.get("content") or []
            else:
                item_type = getattr(item, "type", None)
                content = getattr(item, "content", None) or []
            if item_type != "message":
                continue
            for segment in content:
                if isinstance(segment, dict):
                    seg_type = segment.get("type")
                    text = segment.get("text")
                else:
                    seg_type = getattr(segment, "type", None)
                    text = getattr(segment, "text", None)
                if seg_type in {"output_text", "text"} and isinstance(text, str):
                    texts.append(text)
        if texts:
            return "\n".join(texts)
    return ""


def _response_usage(response: Any) -> Dict[str, int]:
    usage = response.get("usage") if isinstance(response, dict) else getattr(response, "usage", None)
    if usage is None:
        return {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    if isinstance(usage, dict):
        input_tokens = usage.get("input_tokens") or usage.get("prompt_tokens") or 0
        output_tokens = usage.get("output_tokens") or usage.get("completion_tokens") or 0
    else:
        input_tokens = getattr(usage, "input_tokens", None)
        if input_tokens is None:
            input_tokens = getattr(usage, "prompt_tokens", 0)
        output_tokens = getattr(usage, "output_tokens", None)
        if output_tokens is None:
            output_tokens = getattr(usage, "completion_tokens", 0)
    total_tokens = int(input_tokens or 0) + int(output_tokens or 0)
    return {
        "prompt_tokens": int(input_tokens or 0),
        "completion_tokens": int(output_tokens or 0),
        "total_tokens": int(total_tokens),
    }
