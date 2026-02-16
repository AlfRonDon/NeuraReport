from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

logger = logging.getLogger(__name__)

_PARAM_RE = re.compile(r"PARAM:([A-Za-z0-9_]+)")
_AGG_FN_RE = re.compile(r"\b(SUM|COUNT|AVG|MIN|MAX)\s*\(", re.IGNORECASE)
_DIRECT_COLUMN_RE = re.compile(r"^\s*(?P<table>[A-Za-z_][\w]*)\s*\.\s*(?P<column>[A-Za-z_][\w]*)\s*$")


def _ensure_mapping(value: Any) -> Dict[str, str]:
    if not isinstance(value, Mapping):
        return {}
    result: Dict[str, str] = {}
    for key, expr in value.items():
        if key is None:
            continue
        key_text = str(key).strip()
        if not key_text:
            continue
        expr_text = "" if expr is None else str(expr).strip()
        if not expr_text:
            continue
        result[key_text] = expr_text
    return result


def _ensure_mapping_mixed(value: Any) -> Dict[str, Any]:
    """Like _ensure_mapping but preserves dict/object values (for declarative ops)."""
    if not isinstance(value, Mapping):
        return {}
    result: Dict[str, Any] = {}
    for key, expr in value.items():
        if key is None:
            continue
        key_text = str(key).strip()
        if not key_text:
            continue
        if expr is None:
            continue
        # Preserve dicts (declarative ops) and numeric values as-is
        if isinstance(expr, (dict, int, float)):
            result[key_text] = expr
        else:
            expr_text = str(expr).strip()
            if expr_text:
                result[key_text] = expr_text
    return result


def _ensure_sequence(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, Iterable):
        return [str(item) for item in value]
    return [str(value)]


def format_decimal_str(value: Any, max_decimals: int = 3) -> str:
    """
    Format numeric values with rounding up to max_decimals and trim trailing zeros.
    Non-numeric values are returned as-is (converted to string).
    """
    if value is None:
        return ""

    decimal_value: Optional[Decimal] = None
    if isinstance(value, Decimal):
        decimal_value = value
    else:
        text = str(value).strip()
        if not text:
            return ""
        try:
            decimal_value = Decimal(text)
        except (InvalidOperation, ValueError):
            return str(value)

    if not decimal_value.is_finite():
        return "0"

    if max_decimals <= 0:
        rounded = decimal_value.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    else:
        quantizer = Decimal("1").scaleb(-max_decimals)
        rounded = decimal_value.quantize(quantizer, rounding=ROUND_HALF_UP)

    formatted = format(rounded, "f")
    if "." in formatted:
        formatted = formatted.rstrip("0").rstrip(".")
    if formatted == "-0":
        formatted = "0"
    return formatted


def format_fixed_decimals(value: Any, decimals: int, max_decimals: int = 3) -> str:
    decimals = max(0, min(decimals, max_decimals))
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return str(value)
    if not number.is_finite():
        number = Decimal(0)
    quantizer = Decimal("1").scaleb(-decimals) if decimals else Decimal("1")
    rounded = number.quantize(quantizer, rounding=ROUND_HALF_UP)
    if rounded == 0:
        rounded = Decimal(0).quantize(quantizer, rounding=ROUND_HALF_UP) if decimals else Decimal(0)
    formatted = format(rounded, "f")
    if formatted.startswith("-0"):
        formatted = format(Decimal(0).quantize(quantizer, rounding=ROUND_HALF_UP) if decimals else Decimal(0), "f")
    return formatted


@dataclass(frozen=True)
class FormatterSpec:
    kind: str
    arg: Optional[str] = None

    @staticmethod
    def parse(raw: str | None) -> Optional["FormatterSpec"]:
        if not raw:
            return None
        text = raw.strip()
        if not text:
            return None
        m = re.match(r"([a-zA-Z0-9_]+)(?:\((.*)\))?$", text)
        if not m:
            return None
        kind = m.group(1).lower()
        arg = m.group(2)
        return FormatterSpec(kind=kind, arg=arg)


class ContractAdapter:
    """
    Convenience wrapper around a Step-5 contract payload.

    Exposes normalised accessors and helper methods that the discovery and
    report generation flows can rely on without duplicating parsing logic.
    """

    def __init__(self, contract: Mapping[str, Any] | None):
        self._raw = contract or {}

        tokens = self._raw.get("tokens") or {}
        self._scalar_tokens = _ensure_sequence(tokens.get("scalars"))
        self._row_tokens = _ensure_sequence(tokens.get("row_tokens"))
        self._total_tokens = _ensure_sequence(tokens.get("totals"))

        join_block = self._raw.get("join") or {}
        self._parent_table = str(join_block.get("parent_table") or "").strip()
        self._child_table = str(join_block.get("child_table") or "").strip()
        self._parent_key = join_block.get("parent_key")
        self._child_key = join_block.get("child_key")

        self._date_columns = _ensure_mapping(self._raw.get("date_columns"))

        filters = self._raw.get("filters") or {}
        self._required_filters = _ensure_mapping(filters.get("required"))
        self._optional_filters = _ensure_mapping(filters.get("optional"))

        self._reshape_rules = self._raw.get("reshape_rules") or []
        self._row_computed = _ensure_mapping_mixed(self._raw.get("row_computed"))
        self._totals_math = _ensure_mapping_mixed(self._raw.get("totals_math"))
        self._formatters_raw = _ensure_mapping(self._raw.get("formatters"))

        order_by_block = self._raw.get("order_by") or {}
        self._order_by_rows = _ensure_sequence(order_by_block.get("rows"))
        self._row_order = _ensure_sequence(self._raw.get("row_order"))

        self._totals_mapping = _ensure_mapping_mixed(self._raw.get("totals"))
        self._mapping = _ensure_mapping(self._raw.get("mapping"))
        if not self._parent_table:
            inferred_parent = self._infer_parent_table(self._mapping)
            if inferred_parent:
                self._parent_table = inferred_parent

        self._param_tokens = self._discover_param_tokens()
        self._formatter_cache: Dict[str, FormatterSpec | None] = {}

    # ------------------------------------------------------------------ #
    # Basic properties
    # ------------------------------------------------------------------ #
    @property
    def mapping(self) -> Dict[str, str]:
        return dict(self._mapping)

    @property
    def scalar_tokens(self) -> List[str]:
        return list(self._scalar_tokens)

    @property
    def row_tokens(self) -> List[str]:
        return list(self._row_tokens)

    @property
    def total_tokens(self) -> List[str]:
        return list(self._total_tokens)

    @property
    def parent_table(self) -> str:
        return self._parent_table

    @property
    def child_table(self) -> str:
        return self._child_table

    @property
    def parent_key(self) -> Any:
        return self._parent_key

    @property
    def child_key(self) -> Any:
        return self._child_key

    @property
    def date_columns(self) -> Dict[str, str]:
        return dict(self._date_columns)

    @property
    def required_filters(self) -> Dict[str, str]:
        return dict(self._required_filters)

    @property
    def optional_filters(self) -> Dict[str, str]:
        return dict(self._optional_filters)

    @property
    def reshape_rules(self) -> Sequence[Mapping[str, Any]]:
        return list(self._reshape_rules)

    @property
    def row_computed(self) -> Dict[str, str]:
        return dict(self._row_computed)

    @property
    def totals_math(self) -> Dict[str, str]:
        return dict(self._totals_math)

    @property
    def formatters(self) -> Dict[str, str]:
        return dict(self._formatters_raw)

    @property
    def order_by_rows(self) -> List[str]:
        return list(self._order_by_rows)

    @property
    def row_order(self) -> List[str]:
        return list(self._row_order)

    @property
    def totals_mapping(self) -> Dict[str, str]:
        return dict(self._totals_mapping)

    @property
    def param_tokens(self) -> List[str]:
        return sorted(self._param_tokens)

    # ------------------------------------------------------------------ #
    # Formatting helpers
    # ------------------------------------------------------------------ #
    def get_formatter_spec(self, token: str) -> Optional[FormatterSpec]:
        if token in self._formatter_cache:
            return self._formatter_cache[token]
        raw = self._formatters_raw.get(token)
        spec = FormatterSpec.parse(raw)
        self._formatter_cache[token] = spec
        return spec

    def format_value(self, token: str, value: Any) -> str:
        spec = self.get_formatter_spec(token)
        if spec is None:
            if value is None:
                return ""
            if isinstance(value, (int, float, Decimal)):
                return format_decimal_str(value)
            if isinstance(value, str):
                candidate = value.strip()
                if not candidate:
                    return ""
                lowered = candidate.lower()
                if "." in candidate or "e" in lowered:
                    return format_decimal_str(candidate)
                return value
            return str(value)
        kind = spec.kind
        if value is None:
            return ""

        if kind == "number":
            decimals = 0
            if spec.arg:
                try:
                    decimals = int(spec.arg.strip())
                except ValueError:
                    decimals = 0
            return format_fixed_decimals(value, decimals, max_decimals=3)

        if kind == "percent":
            decimals = 0
            if spec.arg:
                try:
                    decimals = int(spec.arg.strip())
                except ValueError:
                    decimals = 0
            try:
                text = str(value).strip()
                if text.endswith("%"):
                    text = text[:-1].strip()
                number = Decimal(text)
            except (InvalidOperation, ValueError, TypeError):
                return str(value)
            if not number.is_finite():
                number = Decimal(0)
            if abs(number) <= 1:
                number *= Decimal(100)
            formatted = format_fixed_decimals(number, decimals, max_decimals=3)
            return f"{formatted}%"

        if kind == "date":
            fmt = (spec.arg or "YYYY-MM-DD").strip()
            return self._format_date_like(value, fmt)

        return str(value)

    @staticmethod
    def _format_date_like(value: Any, fmt: str) -> str:
        from datetime import datetime

        if value is None:
            return ""
        text = str(value).strip()
        if not text:
            return ""
        dt: Optional[datetime] = None
        for pattern in (
            "%Y-%m-%d",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%d/%m/%Y",
            "%m/%d/%Y",
        ):
            try:
                dt = datetime.strptime(text, pattern)
                break
            except ValueError:
                continue
        if dt is None:
            try:
                dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
            except ValueError:
                return text

        fmt_map = {
            "DD/MM/YYYY": "%d/%m/%Y",
            "YYYY-MM-DD": "%Y-%m-%d",
            "DD-MM-YYYY": "%d-%m-%Y",
            "MM/DD/YYYY": "%m/%d/%Y",
        }
        pattern = fmt_map.get(fmt.upper(), "%Y-%m-%d")
        return dt.strftime(pattern)

    @staticmethod
    def _infer_parent_table(mapping: Mapping[str, str]) -> Optional[str]:
        for expr in mapping.values():
            if not isinstance(expr, str):
                continue
            match = _DIRECT_COLUMN_RE.match(expr.strip())
            if not match:
                continue
            table_name = match.group("table").strip(' "`[]')
            if table_name and not table_name.lower().startswith("params"):
                return table_name
        return None

    # ------------------------------------------------------------------ #
    # SQL builders
    # ------------------------------------------------------------------ #
    def _translate_expression(self, expr: str) -> Tuple[str, List[str]]:
        tokens: List[str] = []

        def replacer(match: re.Match[str]) -> str:
            name = match.group(1)
            tokens.append(name)
            return f":{name}"

        translated = _PARAM_RE.sub(replacer, expr)
        return translated, tokens

    def build_base_where_clauses(self, include_date_range: bool = True) -> Tuple[List[str], List[str]]:
        """
        Returns `(predicates, params)` for the parent table using required + optional filters.

        Optional filters are converted to `(:param IS NULL OR TRIM(:param) = '' OR expr = :param)`
        form so that callers may bind NULL/blank to skip them.
        """
        predicates: List[str] = []
        params: List[str] = []
        used_tokens: set[str] = set()

        if include_date_range and self._parent_table:
            date_col = self._date_columns.get(self._parent_table)
            if date_col:
                predicates.append(f"datetime({date_col}) BETWEEN datetime(:from_date) AND datetime(:to_date)")
                params.extend(["from_date", "to_date"])
                used_tokens.update({"from_date", "to_date"})

        def _wrap_date_param(sql: str, param: str) -> str:
            pattern = re.compile(rf":{param}\b")

            def _replace(match: re.Match[str]) -> str:
                start = match.start()
                prefix = sql[:start].rstrip()
                prefix_lower = prefix.lower()
                if prefix_lower.endswith("date(") or prefix_lower.endswith("datetime("):
                    return match.group(0)
                return f"DATE({match.group(0)})"

            return pattern.sub(_replace, sql)

        for token, expr in self._required_filters.items():
            if include_date_range and token in used_tokens:
                continue
            translated, tokens = self._translate_expression(expr)
            if not tokens:
                param_name = str(token or "").strip()
                if param_name:
                    placeholder = f":{param_name}"
                    translated = f"{translated} = {placeholder}"
                    tokens = [param_name]
            if "DATE(" in expr.upper():
                translated = _wrap_date_param(translated, "from_date")
                translated = _wrap_date_param(translated, "to_date")
            predicates.append(translated)
            for name in tokens:
                if name not in params:
                    params.append(name)
            used_tokens.update(tokens)
        for token, expr in self._optional_filters.items():
            if include_date_range and token in used_tokens:
                continue
            translated, tokens = self._translate_expression(expr)
            if not tokens:
                param_name = str(token or "").strip()
                if not param_name:
                    predicates.append(translated)
                    continue
                placeholder = f":{param_name}"
                translated = f"{translated} = {placeholder}"
                tokens = [param_name]
            if "DATE(" in expr.upper():
                translated = _wrap_date_param(translated, "from_date")
                translated = _wrap_date_param(translated, "to_date")
            clauses = [f":{name} IS NULL OR TRIM(:{name}) = ''" for name in tokens]
            clauses.append(translated)
            predicates.append("(" + " OR ".join(clauses) + ")")
            for name in tokens:
                if name not in params:
                    params.append(name)
            used_tokens.update(tokens)
        return predicates, params

    def build_union_cte(self, base_alias: str = "base", cte_name: str = "long_bins") -> Tuple[str, List[str]]:
        """
        Construct SQL for the reshape_rules UNION_ALL description.
        Returns (cte_sql, output_columns).
        """
        if not self._reshape_rules:
            raise ValueError("contract.reshape_rules is required to synthesise SQL")
        rule = next(
            (item for item in self._reshape_rules if isinstance(item, Mapping) and item.get("columns")),
            None,
        )
        if not rule:
            raise ValueError("contract.reshape_rules must include at least one rule with column definitions")
        columns = rule.get("columns") or []
        if not columns:
            raise ValueError("contract.reshape_rules columns must define at least one column")

        per_column_sources: List[Tuple[str, List[str]]] = []
        select_aliases: List[str] = []

        for col in columns:
            alias = str(col.get("as") or "").strip()
            if not alias:
                raise ValueError("reshape_rules columns must specify 'as'")
            sources = col.get("from")
            if not isinstance(sources, Sequence) or not sources:
                raise ValueError(f"reshape_rules column {alias} must provide a non-empty 'from' list")
            select_aliases.append(alias)
            normalized_sources = []
            for item in sources:
                source_expr = str(item).strip()
                if self._parent_table and f"{self._parent_table}." in source_expr:
                    source_expr = source_expr.replace(f"{self._parent_table}.", f"{base_alias}.")
                normalized_sources.append(source_expr)
            per_column_sources.append((alias, normalized_sources))

        column_count = len(per_column_sources[0][1])
        for _, sources in per_column_sources:
            if len(sources) != column_count:
                raise ValueError("All reshape_rules column 'from' lists must be the same length")

        union_selects: List[str] = []
        for idx in range(column_count):
            select_parts = []
            for alias, sources in per_column_sources:
                source_expr = sources[idx]
                select_parts.append(f"{source_expr} AS {alias}")
            union_selects.append(f"SELECT {', '.join(select_parts)} FROM {base_alias}")

        union_sql = "\n  UNION ALL\n  ".join(union_selects)
        cte_sql = f"{cte_name} AS (\n  {union_sql}\n)"
        return cte_sql, select_aliases

    def build_row_aggregate_sql(
        self,
        long_cte_name: str,
        union_columns: Sequence[str],
        rows_alias: str = "rows",
    ) -> Tuple[List[str], List[str], str]:
        """
        Build row-level CTEs (aggregated dataset and ordered dataset) from the long-form data.
        Returns ([cte_sql_strings], available_row_tokens).
        """
        union_set = {col.strip() for col in union_columns}

        aggregated_alias = f"{rows_alias}_agg"
        select_clauses: List[str] = []
        group_by_exprs: List[str] = []
        handled_tokens: set[str] = set()

        def _sanitize_order_clause(raw_order: Sequence[str], fallback_tokens: Sequence[str]) -> str:
            cleaned: List[str] = []
            for clause in raw_order:
                text = str(clause or "").strip()
                if not text:
                    continue
                if "rowid" in text.replace(" ", "").lower():
                    continue
                cleaned.append(text)
            if not cleaned:
                for token in fallback_tokens:
                    token_text = str(token or "").strip()
                    if token_text:
                        return f"{token_text} ASC"
                return ""
            return ", ".join(cleaned)

        def _normalise_expr(expr: str) -> str:
            translated, _ = self._translate_expression(expr)
            for prefix in (
                f"{long_cte_name}.",
                "long_bins.",
                f"{rows_alias}.",
                f"{aggregated_alias}.",
            ):
                translated = translated.replace(prefix, "")
            return translated.strip()

        def _add_clause_from_expr(token: str, expr: str) -> None:
            nonlocal select_clauses, group_by_exprs
            if not expr:
                return
            translated = _normalise_expr(expr)
            if not translated:
                return
            aggregate = bool(_AGG_FN_RE.search(expr))
            # Avoid duplicate aliases; later tokens take precedence to favour explicit mappings.
            existing_aliases = {alias for _, alias in (clause.split(" AS ") for clause in select_clauses)}
            if token in existing_aliases:
                select_clauses[:] = [clause for clause in select_clauses if not clause.endswith(f" AS {token}")]
            select_clauses.append(f"{translated} AS {token}")
            if not aggregate:
                group_by_exprs.append(translated)
            handled_tokens.add(token)

        # Prioritise explicit mapping definitions for row tokens (excluding sl_no)
        for token in self._row_tokens:
            if token.lower() == "sl_no":
                continue
            mapping_expr = self._mapping.get(token)
            if mapping_expr and "ROW_NUMBER" not in mapping_expr.upper():
                _add_clause_from_expr(token, mapping_expr)

        # Supplement with row_computed entries for tokens still missing
        for token in self._row_tokens:
            if token in handled_tokens or token.lower() == "sl_no":
                continue
            computed_expr = self._row_computed.get(token)
            if computed_expr and isinstance(computed_expr, str):
                _add_clause_from_expr(token, computed_expr)

        # Fallback to union columns for any remaining tokens (e.g., material_name)
        for token in self._row_tokens:
            if token in handled_tokens or token.lower() == "sl_no":
                continue
            if token in union_set:
                fallback_expr = token
                if token == "material_name":
                    fallback_expr = "TRIM(material_name)"
                _add_clause_from_expr(token, fallback_expr)

        if not select_clauses:
            raise ValueError("Unable to build row dataset without select expressions")

        # Ensure material name exists for grouping/filtering
        has_material = any(clause.endswith(" AS material_name") for clause in select_clauses)
        material_expr = None
        if has_material:
            material_expr = next(
                clause.split(" AS ")[0] for clause in select_clauses if clause.endswith(" AS material_name")
            )
        elif "material_name" in union_set:
            material_expr = "TRIM(material_name)"
            _add_clause_from_expr("material_name", material_expr)
            has_material = True

        unique_group_by: List[str] = []
        for expr in group_by_exprs:
            expr_clean = expr.strip()
            if expr_clean and expr_clean not in unique_group_by:
                unique_group_by.append(expr_clean)

        group_by_clause = ""
        if unique_group_by:
            group_by_clause = "GROUP BY " + ", ".join(unique_group_by)

        where_clause = ""
        if has_material and material_expr:
            where_clause = f"WHERE TRIM(COALESCE({material_expr}, '')) <> ''"

        aggregated_cte = (
            f"{aggregated_alias} AS (\n"
            f"  SELECT\n    " + ",\n    ".join(select_clauses) + f"\n  FROM {long_cte_name}\n"
            f"  {where_clause}\n"
            f"  {group_by_clause}\n)"
        )

        available_order_tokens = [clause.rsplit(" AS ", 1)[1] for clause in select_clauses]
        if "material_name" in available_order_tokens:
            fallback_order_tokens = ["material_name"]
        else:
            fallback_order_tokens = available_order_tokens[:1]
        order_clause = _sanitize_order_clause(self._row_order, fallback_order_tokens)
        ordered_cte = (
            f"{rows_alias} AS (\n"
            f"  SELECT\n"
            f"    ROW_NUMBER() OVER (ORDER BY {order_clause}) AS sl_no,\n"
            f"    {aggregated_alias}.*\n"
            f"  FROM {aggregated_alias}\n)"
        )

        available_tokens = ["sl_no"] + [clause.split(" AS ")[1] for clause in select_clauses]
        return [aggregated_cte, ordered_cte], available_tokens, order_clause

    def build_totals_sql(self, rows_alias: str = "rows", totals_alias: str = "totals") -> Tuple[str, List[str]]:
        """
        Build SQL SELECT for totals tokens based on totals_math mapping.
        """
        if not self._totals_math:
            raise ValueError("contract.totals_math is required to compute totals")

        select_clauses: List[str] = []
        tokens_in_order: List[str] = []
        for token in self._total_tokens or self._totals_math.keys():
            expr = self._totals_math.get(token)
            if not expr:
                continue
            # Skip declarative op dicts — handled by DF pipeline only
            if isinstance(expr, Mapping):
                continue
            translated = str(expr).replace(f"{rows_alias}.", "")
            select_clauses.append(f"{translated} AS {token}")
            tokens_in_order.append(token)

        if not select_clauses:
            raise ValueError("Unable to build totals dataset without expressions")

        totals_sql = (
            f"{totals_alias} AS (\n" f"  SELECT\n    " + ",\n    ".join(select_clauses) + f"\n  FROM {rows_alias}\n)"
        )
        return totals_sql, tokens_in_order

    def build_default_sql_pack(self) -> Dict[str, Any]:
        """
        Synthesise a minimal sql_pack (dialect + entrypoints + script + params)
        based purely on the contract declarative data. Used as a fallback when the
        LLM did not produce generator SQL or it was invalid.
        """
        if not self._parent_table:
            raise ValueError("contract.join.parent_table is required to synthesise SQL")

        predicates, _ = self.build_base_where_clauses()
        where_clause = ""
        if predicates:
            where_clause = "WHERE " + "\n    AND ".join(predicates)

        base_cte = f"base AS (\n  SELECT *\n  FROM {self._parent_table}\n  {where_clause}\n)"
        long_cte, long_columns = self.build_union_cte(base_alias="base")
        row_ctes, available_row_tokens, row_order_clause = self.build_row_aggregate_sql(
            long_cte_name="long_bins", union_columns=long_columns
        )
        totals_cte, totals_tokens = self.build_totals_sql(rows_alias="rows")

        cte_parts = [base_cte, long_cte] + row_ctes + [totals_cte]
        cte_chain = ",\n".join(cte_parts)

        header_select_parts: List[str] = []
        for token in self._scalar_tokens:
            target = self._mapping.get(token)
            if not target:
                header_select_parts.append(f"'' AS {token}")
                continue
            if target.startswith("PARAM:"):
                param = target.split(":", 1)[1]
                header_select_parts.append(f":{param} AS {token}")
            else:
                header_select_parts.append(f"{target} AS {token}")
        header_sql = "SELECT " + ", ".join(header_select_parts)
        if self._parent_table:
            header_from = f"\nFROM {self._parent_table}"
            if where_clause:
                header_from += f"\n  {where_clause}"
            header_sql += f"{header_from}\nLIMIT 1"

        available_set = set(available_row_tokens)
        row_select_exprs: List[str] = []
        for token in self._row_tokens:
            if token in available_set:
                row_select_exprs.append(token)
            else:
                # Check if stripping "row_" prefix matches (e.g. sl_no for row_sl_no)
                stripped = token[4:] if token.startswith("row_") else token
                if stripped in available_set:
                    row_select_exprs.append(f"{stripped} AS {token}")
        if not row_select_exprs:
            row_select_exprs = list(available_row_tokens)

        rows_select = "SELECT " + ", ".join(row_select_exprs)
        rows_select += " FROM rows"
        if row_order_clause:
            rows_select += f"\nORDER BY {row_order_clause}"

        totals_select = "SELECT " + ", ".join([f"{token}" for token in totals_tokens]) + " FROM totals"

        script = (
            "-- HEADER SELECT --\n"
            f"{header_sql};\n\n"
            "-- ROWS SELECT --\n"
            f"WITH {cte_chain}\n{rows_select};\n\n"
            "-- TOTALS SELECT --\n"
            f"WITH {cte_chain}\n{totals_select};"
        )

        entrypoints = {
            "header": header_sql,
            "rows": f"WITH {cte_chain}\n{rows_select}",
            "totals": f"WITH {cte_chain}\n{totals_select}",
        }

        params_required = sorted(self._required_filters.keys())
        params_optional = sorted(set(self._optional_filters.keys()) | set(self._param_tokens))

        return {
            "dialect": "duckdb",
            "script": script,
            "entrypoints": entrypoints,
            "params": {
                "required": params_required,
                "optional": params_optional,
            },
        }

    # ------------------------------------------------------------------ #
    # DataFrame resolve methods (used when NEURA_USE_DATAFRAME_PIPELINE=true)
    # ------------------------------------------------------------------ #

    def _resolve_mapping_column(self, token: str) -> Optional[Tuple[str, str]]:
        """Return (table, column) from a token's mapping, or None if not a direct ref."""
        expr = self._mapping.get(token, "")
        m = _DIRECT_COLUMN_RE.match(expr)
        if m:
            return m.group("table"), m.group("column")
        return None

    def _apply_date_filter_df(self, df, table: str, start_date: str | None, end_date: str | None):
        """Apply date range filter to a DataFrame using contract date_columns."""
        import pandas as pd
        from .discovery_excel import _coerce_datetime_series, _parse_date_like

        date_col = self._date_columns.get(table.lower()) or self._date_columns.get(table)
        if not date_col or date_col not in df.columns:
            return df
        if not start_date and not end_date:
            return df
        start_dt = _parse_date_like(start_date) if start_date else None
        end_dt = _parse_date_like(end_date) if end_date else None
        if start_dt is None and end_dt is None:
            return df

        dt_series = _coerce_datetime_series(df[date_col])
        mask = pd.Series(True, index=df.index)
        if start_dt:
            mask = mask & (dt_series >= start_dt)
        if end_dt:
            mask = mask & (dt_series <= end_dt)
        return df.loc[mask.fillna(False)]

    def _apply_value_filters_df(self, df, value_filters: Dict[str, list]):
        """Apply equality filters from contract optional_filters."""
        import pandas as pd

        if not value_filters:
            return df
        mask = pd.Series(True, index=df.index)
        for filter_key, filter_values in value_filters.items():
            col_expr = self._optional_filters.get(filter_key, "")
            m = _DIRECT_COLUMN_RE.match(col_expr)
            col_name = m.group("column") if m else filter_key
            if col_name not in df.columns:
                continue
            normalized = [str(v).strip() for v in filter_values if str(v or "").strip()]
            if not normalized:
                continue
            series = df[col_name].astype(str).str.strip()
            mask = mask & series.isin(normalized)
        return df.loc[mask.fillna(False)]

    def _apply_declarative_op(self, df, op_spec) -> Any:
        """Interpret a declarative operation spec and return computed result.

        Supports both new-style dict ops and legacy SQL expression strings.
        """
        import pandas as pd

        if isinstance(op_spec, str):
            return self._interpret_legacy_computed(df, op_spec)

        if not isinstance(op_spec, dict):
            return None

        op = op_spec.get("op", "").lower()
        if op == "subtract":
            left = self._resolve_agg_or_col(df, op_spec.get("left", 0))
            right = self._resolve_agg_or_col(df, op_spec.get("right", 0))
            return left - right
        elif op == "add":
            left = self._resolve_agg_or_col(df, op_spec.get("left", 0))
            right = self._resolve_agg_or_col(df, op_spec.get("right", 0))
            return left + right
        elif op == "multiply":
            left = self._resolve_agg_or_col(df, op_spec.get("left", 0))
            right = self._resolve_agg_or_col(df, op_spec.get("right", 0))
            return left * right
        elif op == "divide":
            num_spec = op_spec.get("numerator", op_spec.get("left", ""))
            den_spec = op_spec.get("denominator", op_spec.get("right", ""))
            num = self._resolve_agg_or_col(df, num_spec)
            den = self._resolve_agg_or_col(df, den_spec)
            if isinstance(den, (int, float)) and den == 0:
                return None
            if isinstance(num, pd.Series) and isinstance(den, pd.Series):
                return num / den.replace(0, float("nan"))
            return num / den if den else None
        elif op == "sum":
            col = op_spec.get("column", "")
            if col in df.columns:
                return df[col].sum()
            return 0
        elif op == "mean":
            col = op_spec.get("column", "")
            if col in df.columns:
                return df[col].mean()
            return 0
        elif op == "count":
            col = op_spec.get("column", "")
            if col in df.columns:
                return df[col].count()
            return len(df)
        elif op == "concat":
            cols = op_spec.get("columns", [])
            sep = op_spec.get("separator", " ")
            parts = [df[c].astype(str) for c in cols if c in df.columns]
            if parts:
                result = parts[0]
                for p in parts[1:]:
                    result = result + sep + p
                return result
            return ""
        elif op == "format_date":
            col = op_spec.get("column", "")
            fmt = op_spec.get("format", "%Y-%m-%d")
            if col in df.columns:
                from .discovery_excel import _coerce_datetime_series
                dt_s = _coerce_datetime_series(df[col])
                return dt_s.dt.strftime(fmt).fillna("")
            return ""
        elif op == "format_number":
            col = op_spec.get("column", "")
            decimals = op_spec.get("decimals", 2)
            if col in df.columns:
                return df[col].round(decimals)
            return 0
        else:
            logger.warning("unknown_declarative_op", extra={"op": op})
            return None

    def _resolve_agg_or_col(self, df, spec) -> Any:
        """Resolve a spec that can be a column name string, nested op dict, or numeric literal."""
        if isinstance(spec, (int, float)):
            return spec
        if isinstance(spec, str):
            if spec in df.columns:
                return df[spec]
            return 0
        if isinstance(spec, dict):
            return self._apply_declarative_op(df, spec)
        return 0

    def _interpret_legacy_computed(self, df, expr: str) -> Any:
        """Regex-based fallback for old SQL expressions like SUM(col1) - SUM(col2)."""
        import pandas as pd

        # Try simple column reference: table.column
        m = _DIRECT_COLUMN_RE.match(expr.strip())
        if m:
            col = m.group("column")
            if col in df.columns:
                return df[col]
            return None

        # Try SUM(column)
        sum_match = re.match(r"^\s*SUM\s*\(\s*(?:\w+\.)?(\w+)\s*\)\s*$", expr, re.IGNORECASE)
        if sum_match:
            col = sum_match.group(1)
            if col in df.columns:
                return df[col].sum()
            return 0

        # Try SUM(a) - SUM(b)
        diff_match = re.match(
            r"^\s*SUM\s*\(\s*(?:\w+\.)?(\w+)\s*\)\s*-\s*SUM\s*\(\s*(?:\w+\.)?(\w+)\s*\)\s*$",
            expr, re.IGNORECASE,
        )
        if diff_match:
            col_a, col_b = diff_match.group(1), diff_match.group(2)
            a = df[col_a].sum() if col_a in df.columns else 0
            b = df[col_b].sum() if col_b in df.columns else 0
            return a - b

        # Try SUM(a) / NULLIF(SUM(b), 0) or similar ratio
        ratio_match = re.match(
            r"^\s*SUM\s*\(\s*(?:\w+\.)?(\w+)\s*\)\s*/\s*(?:NULLIF\s*\()?\s*SUM\s*\(\s*(?:\w+\.)?(\w+)\s*\)\s*(?:,\s*0\s*\))?\s*$",
            expr, re.IGNORECASE,
        )
        if ratio_match:
            col_a, col_b = ratio_match.group(1), ratio_match.group(2)
            a = df[col_a].sum() if col_a in df.columns else 0
            b = df[col_b].sum() if col_b in df.columns else 0
            return a / b if b else None

        logger.warning("uninterpretable_legacy_computed", extra={"expr": expr})
        return None

    def resolve_header_data(
        self,
        loader,
        params: Dict[str, Any],
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> Dict[str, Any]:
        """Fetch scalar/header values via DataFrame access. Returns {token: value}."""
        result: Dict[str, Any] = {}
        header_tokens = _ensure_sequence(self._raw.get("header_tokens")) or self._scalar_tokens

        for token in header_tokens:
            # Check if it's a PARAM
            pm = _PARAM_RE.match(self._mapping.get(token, ""))
            if pm:
                param_name = pm.group(1)
                result[token] = params.get(param_name, "")
                continue

            ref = self._resolve_mapping_column(token)
            if not ref:
                result[token] = ""
                continue

            table, column = ref
            try:
                df = loader.frame(table)
            except Exception:
                result[token] = ""
                continue

            df = self._apply_date_filter_df(df, table, start_date, end_date)
            if df.empty or column not in df.columns:
                result[token] = ""
                continue

            # Take first non-null value
            non_null = df[column].dropna()
            result[token] = str(non_null.iloc[0]) if not non_null.empty else ""

        return result

    def resolve_row_data(
        self,
        loader,
        params: Dict[str, Any],
        start_date: str | None = None,
        end_date: str | None = None,
        value_filters: Dict[str, list] | None = None,
    ):
        """Fetch row data via DataFrame filtering and return a DataFrame."""
        import pandas as pd

        row_tokens = _ensure_sequence(self._raw.get("row_tokens")) or self._row_tokens
        if not row_tokens:
            return pd.DataFrame()

        # Determine source table from first row token mapping
        source_table = self._parent_table
        if not source_table:
            for tok in row_tokens:
                ref = self._resolve_mapping_column(tok)
                if ref:
                    source_table = ref[0]
                    break

        if not source_table:
            return pd.DataFrame()

        try:
            df = loader.frame(source_table).copy()
        except Exception:
            return pd.DataFrame()

        # Apply date filter
        df = self._apply_date_filter_df(df, source_table, start_date, end_date)

        # Apply value filters
        if value_filters:
            df = self._apply_value_filters_df(df, value_filters)

        # Apply reshape rules if present
        melt_alias_set: set[str] = set()
        if self._reshape_rules:
            df = self._apply_reshape_df(df, loader, source_table)
            # Build set of MELT alias column names for fallback resolution
            for rule in self._reshape_rules:
                for col_spec in rule.get("columns", []):
                    alias = col_spec.get("as", "")
                    if alias:
                        melt_alias_set.add(alias)

        # Build result with mapped columns.
        # Add computed columns back to df so subsequent computations can reference them.
        result_cols: Dict[str, Any] = {}
        for tok in row_tokens:
            resolved = False
            short = tok.removeprefix("row_") if tok.startswith("row_") else tok

            # 1. Try direct mapping resolution (table.column)
            ref = self._resolve_mapping_column(tok)
            if ref:
                _, col = ref
                if col in df.columns:
                    result_cols[tok] = df[col].values
                    resolved = True
                elif melt_alias_set and short in df.columns:
                    # After MELT, columns are named by alias
                    result_cols[tok] = df[short].values
                    resolved = True

            # 2. Try MELT alias match by stripped name
            if not resolved and melt_alias_set and short in df.columns:
                result_cols[tok] = df[short].values
                resolved = True

            # 3. Try row_computed
            if not resolved and tok in self._row_computed:
                computed = self._apply_declarative_op(df, self._row_computed[tok])
                if computed is not None:
                    result_cols[tok] = computed
                    resolved = True
                    # Feed computed column back to df under both token name and
                    # short name so subsequent ops can reference it
                    try:
                        df[tok] = computed
                        if short != tok:
                            df[short] = computed
                    except Exception:
                        pass

            # 4. Fallback
            if not resolved:
                result_cols[tok] = ""

        result_df = pd.DataFrame(result_cols)

        # Carry forward __batch_idx__ and metadata columns for BLOCK_REPEAT grouping
        if melt_alias_set and "__batch_idx__" in df.columns:
            result_df["__batch_idx__"] = df["__batch_idx__"].values
            # Collect the set of all melted source columns
            _all_melted_src: set[str] = set()
            for rule in self._reshape_rules:
                for cs in rule.get("columns", []):
                    for f in cs.get("from", []):
                        if f != "INDEX" and "." in f:
                            _all_melted_src.add(f.split(".", 1)[1])
            for col in df.columns:
                if col.startswith("__") or col in _all_melted_src:
                    continue
                if col not in result_df.columns and col not in melt_alias_set:
                    result_df[f"__cf_{col}"] = df[col].values

        # Apply ordering
        order_cols = self._row_order or self._order_by_rows
        if order_cols:
            sort_by: list[str] = []
            ascending: list[bool] = []
            for clause in order_cols:
                parts = clause.strip().split()
                col_name = parts[0] if parts else ""
                if col_name in result_df.columns:
                    sort_by.append(col_name)
                    ascending.append(not (len(parts) > 1 and parts[1].upper() == "DESC"))
            if sort_by:
                result_df = result_df.sort_values(sort_by, ascending=ascending, ignore_index=True)

        return result_df

    def resolve_totals_data(self, rows_df) -> Dict[str, Any]:
        """Compute totals from the rows DataFrame using declarative specs."""
        import pandas as pd

        result: Dict[str, Any] = {}
        total_tokens = self._total_tokens
        totals_math = self._totals_math
        totals_mapping = self._totals_mapping

        # Add short aliases (strip row_ prefix) so totals_math can reference
        # "set_wt" even though column is "row_set_wt"
        if isinstance(rows_df, pd.DataFrame) and not rows_df.empty:
            for col in list(rows_df.columns):
                if col.startswith("row_"):
                    short = col.removeprefix("row_")
                    if short not in rows_df.columns:
                        rows_df = rows_df.copy()
                        rows_df[short] = rows_df[col]

        for tok in total_tokens or list(totals_math.keys()):
            if tok in totals_math:
                val = self._apply_declarative_op(rows_df, totals_math[tok])
                result[tok] = val if val is not None else ""
            elif tok in totals_mapping:
                val = self._apply_declarative_op(rows_df, totals_mapping[tok])
                result[tok] = val if val is not None else ""
            else:
                result[tok] = ""

        return result

    def _apply_reshape_df(self, df, loader, source_table: str):
        """Apply reshape rules (UNION_ALL / MELT) to produce long-form data."""
        import pandas as pd

        for rule in self._reshape_rules:
            strategy = str(rule.get("strategy", "")).upper()
            columns = rule.get("columns", [])

            if strategy == "UNION_ALL" and columns:
                frames: list[pd.DataFrame] = []
                # Each column spec: {"as": "alias", "from": ["col1", "col2", ...]}
                n_rows = len(columns[0].get("from", [])) if columns else 0
                for i in range(n_rows):
                    row_df = pd.DataFrame()
                    for col_spec in columns:
                        alias = col_spec.get("as", "")
                        sources = col_spec.get("from", [])
                        if i < len(sources):
                            src = sources[i]
                            # Source can be table.column or just column
                            if "." in src:
                                _, src_col = src.split(".", 1)
                            else:
                                src_col = src
                            if src_col in df.columns:
                                row_df[alias] = df[src_col].values
                            else:
                                row_df[alias] = ""
                    if not row_df.empty:
                        frames.append(row_df)

                if frames:
                    df = pd.concat(frames, ignore_index=True)
                    # Drop rows where all aliased columns are empty
                    alias_cols = [c.get("as", "") for c in columns if c.get("as")]
                    existing = [c for c in alias_cols if c in df.columns]
                    if existing:
                        df = df.dropna(subset=existing, how="all")
                        str_mask = df[existing].astype(str).apply(
                            lambda row: not all(v.strip() == "" for v in row), axis=1
                        )
                        df = df.loc[str_mask].reset_index(drop=True)

            elif strategy == "MELT" and columns:
                # Melt: unpivot wide columns into long format.
                # Each column spec: {"as": "alias", "from": ["table.col1", "table.col2", ...]}
                # Special: {"as": "alias", "from": ["INDEX"]} → 1-based position index
                frames: list[pd.DataFrame] = []
                # Determine number of positions from the first non-INDEX column
                n_positions = 0
                for col_spec in columns:
                    froms = col_spec.get("from", [])
                    if froms and froms != ["INDEX"]:
                        n_positions = len(froms)
                        break

                # Tag each original row with a batch index for BLOCK_REPEAT grouping
                import numpy as np
                df["__batch_idx__"] = np.arange(len(df))

                for i in range(n_positions):
                    slice_df = pd.DataFrame()
                    for col_spec in columns:
                        alias = col_spec.get("as", "")
                        froms = col_spec.get("from", [])
                        if froms == ["INDEX"]:
                            # Generate 1-based index for each original row
                            slice_df[alias] = [i + 1] * len(df)
                        elif i < len(froms):
                            src = froms[i]
                            src_col = src.split(".", 1)[1] if "." in src else src
                            if src_col in df.columns:
                                slice_df[alias] = df[src_col].values
                            else:
                                # Not a column — treat as literal value (e.g. bin_number: "1", "2", ...)
                                slice_df[alias] = [src if src else ""] * len(df)
                    if not slice_df.empty:
                        # Carry forward non-melted columns (e.g. recipe_name, id, start_time)
                        melted_src_cols: set[str] = set()
                        for cs in columns:
                            for f in cs.get("from", []):
                                if f != "INDEX" and "." in f:
                                    melted_src_cols.add(f.split(".", 1)[1])
                        for orig_col in df.columns:
                            if orig_col not in melted_src_cols and orig_col not in slice_df.columns:
                                slice_df[orig_col] = df[orig_col].values
                        frames.append(slice_df)

                if frames:
                    df = pd.concat(frames, ignore_index=True)
                    # Drop rows where the primary alias (first non-INDEX) is null/empty
                    primary_alias = ""
                    for cs in columns:
                        if cs.get("from", []) != ["INDEX"]:
                            primary_alias = cs.get("as", "")
                            break
                    if primary_alias and primary_alias in df.columns:
                        mask = df[primary_alias].notna()
                        str_vals = df[primary_alias].astype(str).str.strip()
                        mask = mask & (str_vals != "") & (str_vals.str.lower() != "nan") & (str_vals.str.lower() != "none")
                        df = df.loc[mask].reset_index(drop=True)

        return df

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    def _discover_param_tokens(self) -> List[str]:
        tokens: set[str] = set()
        for expr in self._mapping.values():
            for match in _PARAM_RE.findall(expr):
                tokens.add(match)
        for expr in self._required_filters.values():
            tokens.update(_PARAM_RE.findall(expr))
        for expr in self._optional_filters.values():
            tokens.update(_PARAM_RE.findall(expr))
        return list(tokens)
