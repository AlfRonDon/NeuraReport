"""Adapters layer - IO operations isolated behind interfaces."""

from .persistence import Repository, UnitOfWork
from .databases import DataSource
from .rendering import Renderer, RenderResult
from .llm import LLMClient, LLMResponse
from .extraction import Extractor, ExtractionResult

__all__ = [
    "Repository",
    "UnitOfWork",
    "DataSource",
    "Renderer",
    "RenderResult",
    "LLMClient",
    "LLMResponse",
    "Extractor",
    "ExtractionResult",
]
