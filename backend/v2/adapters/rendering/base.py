"""
Renderer interface - Abstract document rendering.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from ...core import Result, DomainError


class Renderer(ABC):
    """Abstract interface for document renderers."""

    @abstractmethod
    async def render(
        self,
        source: Path,
        output: Path,
        **options,
    ) -> Result[Path, DomainError]:
        """
        Render a document from source to output.

        Args:
            source: Source file path (e.g., HTML)
            output: Output file path (e.g., PDF)
            **options: Renderer-specific options

        Returns:
            Ok(output_path) on success, Err on failure
        """
        pass

    @abstractmethod
    async def render_from_string(
        self,
        content: str,
        output: Path,
        **options,
    ) -> Result[Path, DomainError]:
        """
        Render a document from string content.

        Args:
            content: Source content (e.g., HTML string)
            output: Output file path
            **options: Renderer-specific options

        Returns:
            Ok(output_path) on success, Err on failure
        """
        pass
