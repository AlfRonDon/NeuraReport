"""
LLM client interface.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ...core import Result, DomainError


@dataclass
class LLMConfig:
    """Configuration for LLM calls."""

    model: str = "gpt-5"
    temperature: float = 0.0
    max_tokens: int = 4096
    timeout_seconds: float = 60.0
    retry_count: int = 3
    retry_delay_seconds: float = 1.0


@dataclass
class LLMResponse:
    """Response from an LLM call."""

    content: str
    model: str
    usage: Dict[str, int] = field(default_factory=dict)
    finish_reason: str = ""
    raw_response: Any = None

    @property
    def prompt_tokens(self) -> int:
        return self.usage.get("prompt_tokens", 0)

    @property
    def completion_tokens(self) -> int:
        return self.usage.get("completion_tokens", 0)

    @property
    def total_tokens(self) -> int:
        return self.usage.get("total_tokens", 0)


@dataclass
class Message:
    """A message in a conversation."""

    role: str  # "system", "user", "assistant"
    content: str


class LLMClient(ABC):
    """Abstract interface for LLM clients."""

    @abstractmethod
    async def complete(
        self,
        messages: List[Message],
        config: Optional[LLMConfig] = None,
    ) -> Result[LLMResponse, DomainError]:
        """
        Generate a completion for the given messages.

        Args:
            messages: List of conversation messages
            config: Optional configuration overrides

        Returns:
            Ok(LLMResponse) on success, Err on failure
        """
        pass

    @abstractmethod
    async def complete_json(
        self,
        messages: List[Message],
        schema: Dict[str, Any],
        config: Optional[LLMConfig] = None,
    ) -> Result[Dict[str, Any], DomainError]:
        """
        Generate a JSON completion matching the given schema.

        Args:
            messages: List of conversation messages
            schema: JSON schema for the expected response
            config: Optional configuration overrides

        Returns:
            Ok(parsed_json) on success, Err on failure
        """
        pass

    @abstractmethod
    async def embed(
        self,
        text: str,
    ) -> Result[List[float], DomainError]:
        """
        Generate embeddings for the given text.

        Args:
            text: Text to embed

        Returns:
            Ok(embedding_vector) on success, Err on failure
        """
        pass
