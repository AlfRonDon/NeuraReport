"""
LLM adapters - Large Language Model integration.
"""

from .base import LLMClient, LLMResponse, LLMConfig
from .openai import OpenAIClient

__all__ = [
    "LLMClient",
    "LLMResponse",
    "LLMConfig",
    "OpenAIClient",
]
