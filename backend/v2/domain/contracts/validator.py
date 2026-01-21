"""
Contract validation - Verify contracts are complete and consistent.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .entities import Contract, MappingSource


@dataclass
class ValidationIssue:
    """A single validation issue."""

    severity: str  # "error", "warning", "info"
    code: str
    message: str
    token_name: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class ContractValidationResult:
    """Result of validating a contract."""

    valid: bool
    issues: list[ValidationIssue] = field(default_factory=list)

    @property
    def errors(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == "warning"]

    def to_dict(self) -> dict[str, Any]:
        return {
            "valid": self.valid,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "issues": [
                {
                    "severity": i.severity,
                    "code": i.code,
                    "message": i.message,
                    "token": i.token_name,
                    "details": i.details,
                }
                for i in self.issues
            ],
        }


def validate_contract(contract: Contract) -> ContractValidationResult:
    """
    Validate a contract for completeness and consistency.

    Checks:
    - All required tokens have mappings
    - All mappings reference valid tokens
    - No circular dependencies in computed mappings
    - SQL queries are syntactically valid (basic check)
    """
    issues: list[ValidationIssue] = []

    # Check for unmapped required tokens
    for token in contract.tokens:
        if token.required and token.name not in contract.mapped_tokens:
            issues.append(
                ValidationIssue(
                    severity="error",
                    code="unmapped_required_token",
                    message=f"Required token '{token.name}' has no mapping",
                    token_name=token.name,
                )
            )

    # Check for orphan mappings (mappings without tokens)
    for mapping in contract.mappings:
        if mapping.token_name not in contract.token_names:
            issues.append(
                ValidationIssue(
                    severity="warning",
                    code="orphan_mapping",
                    message=f"Mapping for '{mapping.token_name}' has no corresponding token",
                    token_name=mapping.token_name,
                )
            )

    # Check for circular dependencies in computed mappings
    computed = {m.token_name: m for m in contract.mappings if m.source == MappingSource.COMPUTED}
    for token_name, mapping in computed.items():
        visited: set[str] = set()
        stack = list(mapping.depends_on)
        while stack:
            dep = stack.pop()
            if dep == token_name:
                issues.append(
                    ValidationIssue(
                        severity="error",
                        code="circular_dependency",
                        message=f"Circular dependency detected for '{token_name}'",
                        token_name=token_name,
                    )
                )
                break
            if dep in visited:
                continue
            visited.add(dep)
            if dep in computed:
                stack.extend(computed[dep].depends_on)

    # Basic SQL validation for query mappings
    sql_keywords = {"SELECT", "FROM", "WHERE", "JOIN", "ORDER", "GROUP", "HAVING", "LIMIT"}
    for mapping in contract.mappings:
        if mapping.source == MappingSource.QUERY and mapping.query:
            query_upper = mapping.query.upper().strip()
            if not any(query_upper.startswith(kw) for kw in sql_keywords):
                issues.append(
                    ValidationIssue(
                        severity="warning",
                        code="suspicious_query",
                        message=f"Query for '{mapping.token_name}' may not be valid SQL",
                        token_name=mapping.token_name,
                        details={"query_preview": mapping.query[:100]},
                    )
                )

    # Check for missing parameters in parameter mappings
    for mapping in contract.mappings:
        if mapping.source == MappingSource.PARAMETER:
            if mapping.parameter_key not in contract.parameters:
                issues.append(
                    ValidationIssue(
                        severity="error",
                        code="missing_parameter",
                        message=f"Mapping '{mapping.token_name}' references undeclared parameter '{mapping.parameter_key}'",
                        token_name=mapping.token_name,
                    )
                )

    # Determine overall validity (no errors)
    valid = not any(i.severity == "error" for i in issues)

    return ContractValidationResult(valid=valid, issues=issues)
