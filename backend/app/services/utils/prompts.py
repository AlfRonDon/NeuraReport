from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Dict

logger = logging.getLogger("neura.prompts")
_BACKTICK = chr(96)


def _resolve_prompts_path() -> Path:
    env_path = os.getenv("LLM_PROMPTS_PATH")
    base_dir = Path(__file__).resolve().parents[4]
    if env_path:
        path = Path(env_path)
        if not path.is_absolute():
            path = base_dir / path
    else:
        path = base_dir / "llm_prompts.md"
    return path


PROMPTS_PATH = _resolve_prompts_path()


def _parse_prompt_markdown(markdown: str) -> Dict[str, str]:
    prompts: Dict[str, str] = {}
    current_key: str | None = None
    collecting = False
    buffer: list[str] = []

    for line in markdown.splitlines():
        if line.startswith("## "):
            parts = line.split(_BACKTICK)
            current_key = parts[1] if len(parts) > 1 else None
            collecting = False
            buffer = []
        elif line.startswith("```") and "text" in line and current_key:
            collecting = True
            buffer = []
        elif line.startswith("```") and collecting:
            if current_key:
                prompts[current_key] = "\n".join(buffer)
            collecting = False
            current_key = None
            buffer = []
        elif collecting:
            buffer.append(line)

    return prompts


@lru_cache(maxsize=1)
def _prompt_map() -> Dict[str, str]:
    try:
        markdown = PROMPTS_PATH.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise RuntimeError(f"Prompt file not found: {PROMPTS_PATH}") from exc
    prompts = _parse_prompt_markdown(markdown)
    if not prompts:
        logger.warning("No prompts parsed from %s", PROMPTS_PATH)
    return prompts


def load_prompt(key: str, replacements: Dict[str, str] | None = None) -> str:
    """
    Load a prompt by code block key from llm_prompts.md and optionally replace tokens.
    """
    prompts = _prompt_map()
    if key not in prompts:
        available = ", ".join(sorted(prompts))
        raise KeyError(f"Prompt '{key}' not found in {PROMPTS_PATH}. Available keys: {available}")
    prompt = prompts[key]
    if replacements:
        for needle, value in replacements.items():
            prompt = prompt.replace(needle, value)
    return prompt


def available_prompts() -> Dict[str, str]:
    """
    Return a copy of the loaded prompt mapping (key -> prompt text).
    """
    return dict(_prompt_map())
