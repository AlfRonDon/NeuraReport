"""
PDF renderer using Playwright.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any

from .base import Renderer
from ...core import Result, Ok, Err, DomainError, RenderError

logger = logging.getLogger("neura.adapters.rendering.pdf")


class PlaywrightPDFRenderer(Renderer):
    """
    PDF renderer using Playwright.

    Launches a headless browser to render HTML to PDF.
    """

    def __init__(
        self,
        *,
        page_width: str = "8.5in",
        page_height: str = "11in",
        margin_top: str = "0.5in",
        margin_bottom: str = "0.5in",
        margin_left: str = "0.5in",
        margin_right: str = "0.5in",
        print_background: bool = True,
        timeout_ms: int = 60000,
    ):
        self._page_width = page_width
        self._page_height = page_height
        self._margin_top = margin_top
        self._margin_bottom = margin_bottom
        self._margin_left = margin_left
        self._margin_right = margin_right
        self._print_background = print_background
        self._timeout_ms = timeout_ms

    async def render(
        self,
        source: Path,
        output: Path,
        **options,
    ) -> Result[Path, DomainError]:
        """Render HTML file to PDF."""
        if not source.exists():
            return Err(RenderError(
                code="source_not_found",
                message=f"Source file not found: {source}",
                format="pdf",
                stage="load",
            ))

        try:
            content = source.read_text(encoding="utf-8")
            return await self.render_from_string(content, output, **options)
        except Exception as e:
            return Err(RenderError(
                code="read_failed",
                message=f"Failed to read source file: {e}",
                format="pdf",
                stage="load",
                cause=e,
            ))

    async def render_from_string(
        self,
        content: str,
        output: Path,
        **options,
    ) -> Result[Path, DomainError]:
        """Render HTML string to PDF."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return Err(RenderError(
                code="playwright_not_installed",
                message="Playwright is not installed. Run: pip install playwright && playwright install chromium",
                format="pdf",
                stage="init",
            ))

        output.parent.mkdir(parents=True, exist_ok=True)

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                try:
                    page = await browser.new_page()

                    # Set content with base URL for relative resources
                    base_url = options.get("base_url", "file://")
                    await page.set_content(content, wait_until="networkidle")

                    # Generate PDF
                    pdf_options = {
                        "path": str(output),
                        "format": options.get("format"),
                        "width": options.get("width", self._page_width),
                        "height": options.get("height", self._page_height),
                        "margin": {
                            "top": options.get("margin_top", self._margin_top),
                            "bottom": options.get("margin_bottom", self._margin_bottom),
                            "left": options.get("margin_left", self._margin_left),
                            "right": options.get("margin_right", self._margin_right),
                        },
                        "print_background": options.get("print_background", self._print_background),
                    }

                    # Remove None values
                    pdf_options = {k: v for k, v in pdf_options.items() if v is not None}

                    await page.pdf(**pdf_options)

                finally:
                    await browser.close()

            if not output.exists():
                return Err(RenderError(
                    code="output_not_created",
                    message=f"PDF was not created at {output}",
                    format="pdf",
                    stage="save",
                ))

            logger.info(f"PDF rendered: {output} ({output.stat().st_size} bytes)")
            return Ok(output)

        except asyncio.TimeoutError:
            return Err(RenderError(
                code="timeout",
                message=f"PDF rendering timed out after {self._timeout_ms}ms",
                format="pdf",
                stage="render",
            ))
        except Exception as e:
            return Err(RenderError(
                code="render_failed",
                message=f"PDF rendering failed: {e}",
                format="pdf",
                stage="render",
                cause=e,
            ))
