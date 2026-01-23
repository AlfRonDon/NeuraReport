from __future__ import annotations

from typing import Any

from backend.app.services.mapping.AutoMapInline import run_llm_call_3
from backend.app.services.mapping.CorrectionsPreview import run_corrections_preview
from backend.app.services.utils import call_chat_completion


def call_llm_chat(**kwargs: Any) -> Any:
    """Centralized OpenAI chat entrypoint."""
    return call_chat_completion(**kwargs)


def run_llm_mapping(*args, **kwargs):
    """Run mapping prompt round-trip."""
    return run_llm_call_3(*args, **kwargs)


def run_llm_corrections(*args, **kwargs):
    """Run mapping corrections prompt round-trip."""
    return run_corrections_preview(*args, **kwargs)
