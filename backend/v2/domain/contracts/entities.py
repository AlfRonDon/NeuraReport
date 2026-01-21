"""
Contract entities - Immutable data structures for report contracts.

A Contract defines:
- Tokens: placeholders in templates to be replaced with data
- Mappings: how to get data from the database to fill tokens
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class TokenType(str, Enum):
    """Types of tokens that can appear in templates."""

    SCALAR = "scalar"  # Single value replacement
    TABLE = "table"  # Repeating table rows
    CONDITIONAL = "conditional"  # Show/hide sections
    IMAGE = "image"  # Dynamic image
    CHART = "chart"  # Dynamic chart
    FORMULA = "formula"  # Computed value


class MappingSource(str, Enum):
    """Where mapping data comes from."""

    QUERY = "query"  # SQL query result
    PARAMETER = "parameter"  # User-provided parameter
    COMPUTED = "computed"  # Derived from other mappings
    STATIC = "static"  # Hardcoded value


@dataclass(frozen=True)
class Token:
    """
    A placeholder in a template that gets replaced with data.

    Tokens use the format {{token_name}} in HTML templates.
    """

    name: str
    token_type: TokenType = TokenType.SCALAR
    description: str = ""
    default_value: Any = None
    format_spec: str | None = None  # e.g., "%.2f", "%Y-%m-%d"
    required: bool = True

    def format_value(self, value: Any) -> str:
        """Format a value according to this token's format spec."""
        if value is None:
            return str(self.default_value or "")
        if self.format_spec:
            try:
                return self.format_spec % value
            except (TypeError, ValueError):
                return str(value)
        return str(value)


@dataclass(frozen=True)
class Mapping:
    """
    Defines how to get data for a token from the database.

    A mapping can be:
    - A SQL query that returns values
    - A user parameter passed at runtime
    - A computed value derived from other mappings
    """

    token_name: str
    source: MappingSource
    query: str | None = None  # SQL for QUERY source
    parameter_key: str | None = None  # Key for PARAMETER source
    expression: str | None = None  # Formula for COMPUTED source
    static_value: Any = None  # Value for STATIC source
    column: str | None = None  # Which column from query result
    aggregate: str | None = None  # SUM, AVG, COUNT, etc.
    filter_expression: str | None = None  # WHERE clause addition
    depends_on: tuple[str, ...] = ()  # Other mappings this depends on

    def __post_init__(self):
        # Validate that appropriate fields are set for source type
        if self.source == MappingSource.QUERY and not self.query:
            raise ValueError(f"Mapping {self.token_name}: QUERY source requires query")
        if self.source == MappingSource.PARAMETER and not self.parameter_key:
            raise ValueError(
                f"Mapping {self.token_name}: PARAMETER source requires parameter_key"
            )
        if self.source == MappingSource.COMPUTED and not self.expression:
            raise ValueError(
                f"Mapping {self.token_name}: COMPUTED source requires expression"
            )


@dataclass(frozen=True)
class TableDefinition:
    """Definition for a table token - how to repeat rows."""

    token_name: str
    row_query: str  # Query that returns rows
    columns: tuple[str, ...]  # Column names to extract
    order_by: str | None = None
    limit: int | None = None


@dataclass(frozen=True)
class Contract:
    """
    A complete contract defining all tokens and mappings for a template.

    The contract is the bridge between the template (HTML with placeholders)
    and the data source (database queries).
    """

    template_id: str
    version: str = "1.0"
    tokens: tuple[Token, ...] = ()
    mappings: tuple[Mapping, ...] = ()
    tables: tuple[TableDefinition, ...] = ()
    parameters: tuple[str, ...] = ()  # Required parameters at runtime
    dialect: str = "sqlite"  # SQL dialect

    @property
    def token_names(self) -> frozenset[str]:
        """All token names in this contract."""
        return frozenset(t.name for t in self.tokens)

    @property
    def mapped_tokens(self) -> frozenset[str]:
        """Tokens that have mappings defined."""
        return frozenset(m.token_name for m in self.mappings)

    @property
    def unmapped_tokens(self) -> frozenset[str]:
        """Tokens without mappings - need manual intervention."""
        return self.token_names - self.mapped_tokens

    def get_token(self, name: str) -> Token | None:
        """Get a token by name."""
        for token in self.tokens:
            if token.name == name:
                return token
        return None

    def get_mapping(self, token_name: str) -> Mapping | None:
        """Get the mapping for a token."""
        for mapping in self.mappings:
            if mapping.token_name == token_name:
                return mapping
        return None

    def with_mappings(self, new_mappings: tuple[Mapping, ...]) -> Contract:
        """Return a new contract with updated mappings."""
        return Contract(
            template_id=self.template_id,
            version=self.version,
            tokens=self.tokens,
            mappings=new_mappings,
            tables=self.tables,
            parameters=self.parameters,
            dialect=self.dialect,
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary for persistence."""
        return {
            "template_id": self.template_id,
            "version": self.version,
            "tokens": [
                {
                    "name": t.name,
                    "type": t.token_type.value,
                    "description": t.description,
                    "default": t.default_value,
                    "format": t.format_spec,
                    "required": t.required,
                }
                for t in self.tokens
            ],
            "mappings": [
                {
                    "token": m.token_name,
                    "source": m.source.value,
                    "query": m.query,
                    "parameter_key": m.parameter_key,
                    "expression": m.expression,
                    "static_value": m.static_value,
                    "column": m.column,
                    "aggregate": m.aggregate,
                    "filter": m.filter_expression,
                    "depends_on": list(m.depends_on),
                }
                for m in self.mappings
            ],
            "tables": [
                {
                    "token": t.token_name,
                    "query": t.row_query,
                    "columns": list(t.columns),
                    "order_by": t.order_by,
                    "limit": t.limit,
                }
                for t in self.tables
            ],
            "parameters": list(self.parameters),
            "dialect": self.dialect,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Contract:
        """Deserialize from dictionary."""
        tokens = tuple(
            Token(
                name=t["name"],
                token_type=TokenType(t.get("type", "scalar")),
                description=t.get("description", ""),
                default_value=t.get("default"),
                format_spec=t.get("format"),
                required=t.get("required", True),
            )
            for t in data.get("tokens", [])
        )
        mappings = tuple(
            Mapping(
                token_name=m["token"],
                source=MappingSource(m.get("source", "query")),
                query=m.get("query"),
                parameter_key=m.get("parameter_key"),
                expression=m.get("expression"),
                static_value=m.get("static_value"),
                column=m.get("column"),
                aggregate=m.get("aggregate"),
                filter_expression=m.get("filter"),
                depends_on=tuple(m.get("depends_on", [])),
            )
            for m in data.get("mappings", [])
        )
        tables = tuple(
            TableDefinition(
                token_name=t["token"],
                row_query=t["query"],
                columns=tuple(t.get("columns", [])),
                order_by=t.get("order_by"),
                limit=t.get("limit"),
            )
            for t in data.get("tables", [])
        )
        return cls(
            template_id=data["template_id"],
            version=data.get("version", "1.0"),
            tokens=tokens,
            mappings=mappings,
            tables=tables,
            parameters=tuple(data.get("parameters", [])),
            dialect=data.get("dialect", "sqlite"),
        )
