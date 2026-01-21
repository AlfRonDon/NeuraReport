"""
Rendering adapters - Document output generation.
"""

from .base import Renderer
from .pdf import PlaywrightPDFRenderer
from .docx import HTMLToDocxRenderer

__all__ = [
    "Renderer",
    "PlaywrightPDFRenderer",
    "HTMLToDocxRenderer",
    "PDFRenderer",
    "DOCXRenderer",
]

# Aliases for convenience
PDFRenderer = PlaywrightPDFRenderer
DOCXRenderer = HTMLToDocxRenderer
