"""
Contract builder - Construct contracts from templates.

This is pure business logic. LLM calls are handled by adapters.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .entities import Contract, Token, Mapping, TokenType, MappingSource


# Token patterns in HTML templates
TOKEN_PATTERN = re.compile(r"\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}")
TABLE_START_PATTERN = re.compile(r"\{\{#each\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}")
TABLE_END_PATTERN = re.compile(r"\{\{/each\}\}")
CONDITIONAL_PATTERN = re.compile(r"\{\{#if\s+([a-zA-Z_][a-zA-Z0-9_]*)\}\}")


@dataclass
class ExtractedTokens:
    """Result of extracting tokens from HTML."""

    scalars: list[str] = field(default_factory=list)
    tables: list[str] = field(default_factory=list)
    conditionals: list[str] = field(default_factory=list)
    all_names: set[str] = field(default_factory=set)


def extract_tokens_from_html(html: str) -> ExtractedTokens:
    """
    Extract all tokens from HTML template.

    Identifies:
    - {{token_name}} - scalar tokens
    - {{#each table_name}}...{{/each}} - table tokens
    - {{#if condition}}...{{/if}} - conditional tokens
    """
    result = ExtractedTokens()

    # Find all scalar tokens
    for match in TOKEN_PATTERN.finditer(html):
        name = match.group(1)
        if name not in result.all_names:
            result.scalars.append(name)
            result.all_names.add(name)

    # Find table tokens
    for match in TABLE_START_PATTERN.finditer(html):
        name = match.group(1)
        if name not in result.all_names:
            result.tables.append(name)
            result.all_names.add(name)
        # Remove from scalars if it was added there
        if name in result.scalars:
            result.scalars.remove(name)

    # Find conditional tokens
    for match in CONDITIONAL_PATTERN.finditer(html):
        name = match.group(1)
        if name not in result.all_names:
            result.conditionals.append(name)
            result.all_names.add(name)
        # Remove from scalars if it was added there
        if name in result.scalars:
            result.scalars.remove(name)

    return result


class ContractBuilder:
    """
    Builds contracts incrementally.

    Usage:
        builder = ContractBuilder(template_id="my_template")
        builder.add_token("customer_name", TokenType.SCALAR)
        builder.add_mapping("customer_name", query="SELECT name FROM customers WHERE id = ?")
        contract = builder.build()
    """

    def __init__(self, template_id: str, dialect: str = "sqlite"):
        self._template_id = template_id
        self._dialect = dialect
        self._tokens: dict[str, Token] = {}
        self._mappings: dict[str, Mapping] = {}
        self._parameters: set[str] = set()

    def add_token(
        self,
        name: str,
        token_type: TokenType = TokenType.SCALAR,
        description: str = "",
        default_value: Any = None,
        format_spec: str | None = None,
        required: bool = True,
    ) -> ContractBuilder:
        """Add a token to the contract."""
        self._tokens[name] = Token(
            name=name,
            token_type=token_type,
            description=description,
            default_value=default_value,
            format_spec=format_spec,
            required=required,
        )
        return self

    def add_tokens_from_html(self, html: str) -> ContractBuilder:
        """Extract and add all tokens from HTML template."""
        extracted = extract_tokens_from_html(html)

        for name in extracted.scalars:
            if name not in self._tokens:
                self.add_token(name, TokenType.SCALAR)

        for name in extracted.tables:
            if name not in self._tokens:
                self.add_token(name, TokenType.TABLE)

        for name in extracted.conditionals:
            if name not in self._tokens:
                self.add_token(name, TokenType.CONDITIONAL)

        return self

    def add_mapping(
        self,
        token_name: str,
        *,
        query: str | None = None,
        parameter_key: str | None = None,
        expression: str | None = None,
        static_value: Any = None,
        column: str | None = None,
        aggregate: str | None = None,
    ) -> ContractBuilder:
        """Add a mapping for a token."""
        # Determine source type
        if query:
            source = MappingSource.QUERY
        elif parameter_key:
            source = MappingSource.PARAMETER
            self._parameters.add(parameter_key)
        elif expression:
            source = MappingSource.COMPUTED
        else:
            source = MappingSource.STATIC

        self._mappings[token_name] = Mapping(
            token_name=token_name,
            source=source,
            query=query,
            parameter_key=parameter_key,
            expression=expression,
            static_value=static_value,
            column=column,
            aggregate=aggregate,
        )
        return self

    def add_parameter(self, name: str) -> ContractBuilder:
        """Add a required parameter."""
        self._parameters.add(name)
        return self

    def build(self) -> Contract:
        """Build the immutable Contract."""
        return Contract(
            template_id=self._template_id,
            tokens=tuple(self._tokens.values()),
            mappings=tuple(self._mappings.values()),
            parameters=tuple(sorted(self._parameters)),
            dialect=self._dialect,
        )

    @classmethod
    def from_html_and_schema(
        cls,
        template_id: str,
        html: str,
        schema: dict[str, Any],
        dialect: str = "sqlite",
    ) -> ContractBuilder:
        """
        Create a builder pre-populated from HTML and database schema.

        The schema should be a dict of table_name -> list of column names.
        This allows auto-mapping tokens to likely columns.
        """
        builder = cls(template_id, dialect)
        builder.add_tokens_from_html(html)

        # Build a flat list of all columns for fuzzy matching
        all_columns: dict[str, str] = {}  # column_name -> table_name
        for table_name, columns in schema.items():
            for col in columns:
                col_lower = col.lower()
                if col_lower not in all_columns:
                    all_columns[col_lower] = table_name

        # Try to auto-map tokens to columns
        for token_name in builder._tokens:
            token_lower = token_name.lower()
            # Direct match
            if token_lower in all_columns:
                table = all_columns[token_lower]
                builder.add_mapping(
                    token_name,
                    query=f"SELECT {token_name} FROM {table}",
                    column=token_name,
                )
            # Try without underscores
            elif token_lower.replace("_", "") in all_columns:
                col = token_lower.replace("_", "")
                table = all_columns[col]
                builder.add_mapping(
                    token_name,
                    query=f"SELECT {col} FROM {table}",
                    column=col,
                )

        return builder
