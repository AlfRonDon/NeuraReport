from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

_PARAM_RE = re.compile(r"PARAM:([A-Za-z0-9_]+)")
_AGG_FN_RE = re.compile(r"\b(SUM|COUNT|AVG|MIN|MAX)\s*\(", re.IGNORECASE)


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
        self._row_computed = _ensure_mapping(self._raw.get("row_computed"))
        self._totals_math = _ensure_mapping(self._raw.get("totals_math"))
        self._formatters_raw = _ensure_mapping(self._raw.get("formatters"))

        order_by_block = self._raw.get("order_by") or {}
        self._order_by_rows = _ensure_sequence(order_by_block.get("rows"))
        self._row_order = _ensure_sequence(self._raw.get("row_order"))

        self._totals_mapping = _ensure_mapping(self._raw.get("totals"))
        self._mapping = _ensure_mapping(self._raw.get("mapping"))

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
            return format_fixed_decimals(value, decimals, max_decimals=3)

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
                continue
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

        def _sanitize_order_clause(raw_order: Sequence[str]) -> str:
            cleaned: List[str] = []
            for clause in raw_order:
                text = str(clause or "").strip()
                if not text:
                    continue
                if "rowid" in text.replace(" ", "").lower():
                    continue
                cleaned.append(text)
            if not cleaned:
                return "material_name ASC"
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
            if computed_expr:
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

        order_clause = _sanitize_order_clause(self._row_order or ["material_name ASC"])
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
            translated = expr.replace(f"{rows_alias}.", "")
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
        totals_cte, _ = self.build_totals_sql(rows_alias="rows")

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

        row_tokens_to_use = [token for token in self._row_tokens if token in available_row_tokens]
        if not row_tokens_to_use:
            row_tokens_to_use = available_row_tokens

        rows_select = "SELECT " + ", ".join([f"{token}" for token in row_tokens_to_use])
        rows_select += " FROM rows"
        if row_order_clause:
            rows_select += f"\nORDER BY {row_order_clause}"

        totals_select = "SELECT " + ", ".join([f"{token}" for token in self._total_tokens]) + " FROM totals"

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
            "dialect": "sqlite",
            "script": script,
            "entrypoints": entrypoints,
            "params": {
                "required": params_required,
                "optional": params_optional,
            },
        }

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
