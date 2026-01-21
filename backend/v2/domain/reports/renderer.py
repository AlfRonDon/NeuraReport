"""
Token engine - Pure token substitution logic.

No IO, no side effects. Just string manipulation.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Iterator


# Token patterns
SCALAR_PATTERN = re.compile(r"\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}")
EACH_PATTERN = re.compile(
    r"\{\{#each\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}(.*?)\{\{/each\}\}",
    re.DOTALL,
)
IF_PATTERN = re.compile(
    r"\{\{#if\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}(.*?)\{\{/if\}\}",
    re.DOTALL,
)
UNLESS_PATTERN = re.compile(
    r"\{\{#unless\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}(.*?)\{\{/unless\}\}",
    re.DOTALL,
)


@dataclass
class RenderContext:
    """Context for rendering tokens."""

    values: dict[str, Any] = field(default_factory=dict)
    tables: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    formatters: dict[str, Callable[[Any], str]] = field(default_factory=dict)
    escape_html: bool = True
    missing_token_value: str = ""

    def get_value(self, token_name: str) -> Any:
        """Get a value, returning missing_token_value if not found."""
        return self.values.get(token_name, self.missing_token_value)

    def get_table(self, token_name: str) -> list[dict[str, Any]]:
        """Get table rows for an each block."""
        return self.tables.get(token_name, [])

    def format_value(self, token_name: str, value: Any) -> str:
        """Format a value for display."""
        if token_name in self.formatters:
            result = self.formatters[token_name](value)
        elif value is None:
            result = self.missing_token_value
        else:
            result = str(value)

        if self.escape_html:
            result = html.escape(result)

        return result


class TokenEngine:
    """
    Replaces tokens in HTML with values from a context.

    Supports:
    - {{token_name}} - scalar replacement
    - {{#each items}}...{{/each}} - iteration
    - {{#if condition}}...{{/if}} - conditional
    - {{#unless condition}}...{{/unless}} - negative conditional
    """

    def __init__(self, context: RenderContext | None = None):
        self.context = context or RenderContext()

    def render(self, template: str) -> str:
        """Render all tokens in the template."""
        result = template

        # Process conditionals first (they may contain other tokens)
        result = self._render_conditionals(result)

        # Process each blocks
        result = self._render_each_blocks(result)

        # Process scalar tokens last
        result = self._render_scalars(result)

        return result

    def _render_scalars(self, template: str) -> str:
        """Replace {{token_name}} with values."""

        def replace(match: re.Match) -> str:
            token_name = match.group(1)
            value = self.context.get_value(token_name)
            return self.context.format_value(token_name, value)

        return SCALAR_PATTERN.sub(replace, template)

    def _render_each_blocks(self, template: str) -> str:
        """Process {{#each items}}...{{/each}} blocks."""

        def replace(match: re.Match) -> str:
            token_name = match.group(1)
            inner_template = match.group(2)
            rows = self.context.get_table(token_name)

            if not rows:
                return ""

            rendered_rows: list[str] = []
            for row in rows:
                # Create a sub-context with row values
                row_context = RenderContext(
                    values={**self.context.values, **row},
                    tables=self.context.tables,
                    formatters=self.context.formatters,
                    escape_html=self.context.escape_html,
                    missing_token_value=self.context.missing_token_value,
                )
                row_engine = TokenEngine(row_context)
                rendered_rows.append(row_engine.render(inner_template))

            return "".join(rendered_rows)

        return EACH_PATTERN.sub(replace, template)

    def _render_conditionals(self, template: str) -> str:
        """Process {{#if condition}} and {{#unless condition}} blocks."""

        def replace_if(match: re.Match) -> str:
            token_name = match.group(1)
            inner = match.group(2)
            value = self.context.get_value(token_name)
            if value and value != self.context.missing_token_value:
                return inner
            return ""

        def replace_unless(match: re.Match) -> str:
            token_name = match.group(1)
            inner = match.group(2)
            value = self.context.get_value(token_name)
            if not value or value == self.context.missing_token_value:
                return inner
            return ""

        result = IF_PATTERN.sub(replace_if, template)
        result = UNLESS_PATTERN.sub(replace_unless, result)
        return result


def render_html_with_tokens(
    html_template: str,
    values: dict[str, Any],
    tables: dict[str, list[dict[str, Any]]] | None = None,
    formatters: dict[str, Callable[[Any], str]] | None = None,
    escape_html: bool = True,
) -> str:
    """
    Convenience function to render tokens in HTML.

    Args:
        html_template: The HTML template with {{tokens}}
        values: Dict of token_name -> value for scalar tokens
        tables: Dict of token_name -> list of row dicts for #each blocks
        formatters: Custom formatters for specific tokens
        escape_html: Whether to HTML-escape values (default True)

    Returns:
        Rendered HTML with tokens replaced
    """
    context = RenderContext(
        values=values,
        tables=tables or {},
        formatters=formatters or {},
        escape_html=escape_html,
    )
    engine = TokenEngine(context)
    return engine.render(html_template)


def extract_tokens(html_template: str) -> set[str]:
    """Extract all token names from a template."""
    tokens: set[str] = set()

    for match in SCALAR_PATTERN.finditer(html_template):
        tokens.add(match.group(1))

    for match in EACH_PATTERN.finditer(html_template):
        tokens.add(match.group(1))
        # Also extract tokens from the inner template
        inner = match.group(2)
        tokens.update(extract_tokens(inner))

    for match in IF_PATTERN.finditer(html_template):
        tokens.add(match.group(1))

    for match in UNLESS_PATTERN.finditer(html_template):
        tokens.add(match.group(1))

    return tokens
