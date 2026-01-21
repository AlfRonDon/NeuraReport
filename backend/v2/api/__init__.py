"""
API layer - HTTP endpoints.

This is a thin layer that handles HTTP concerns and delegates to services.
"""

from .app import create_app
from .dependencies import get_dependencies, Dependencies

__all__ = [
    "create_app",
    "get_dependencies",
    "Dependencies",
]
