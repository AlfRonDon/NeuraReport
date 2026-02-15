# mypy: ignore-errors
from __future__ import annotations

import json
from functools import lru_cache
from textwrap import dedent
from typing import Any, Dict, Iterable, Mapping

from . import llm_prompts as _pdf_prompts

EXCEL_PROMPT_VERSION = "excel_llm_call_3_v1"
EXCEL_PROMPT_VERSION_3_5 = "excel_llm_call_3_5_v1"
EXCEL_PROMPT_VERSION_4 = "excel_llm_call_4_v2"
EXCEL_PROMPT_VERSION_5 = "excel_llm_call_5_v1"

_INPUT_MARKER = "[INPUTS]"

_sanitize_html = _pdf_prompts._sanitize_html
_format_catalog = _pdf_prompts._format_catalog
_format_schema = _pdf_prompts._format_schema

EXCEL_LLM_CALL_1_PROMPT = dedent(
    """
Produce a COMPLETE, self-contained HTML document (<!DOCTYPE html> ...) with inline <style>. Treat the provided Excel
worksheet prototype HTML (tokens already annotated) as the blueprint and recreate the worksheet layout as a
print-ready template.

PLACEHOLDER & SCHEMA RULES
- Placeholders must use single braces: {token}. Never invent tokens beyond those in SCHEMA_JSON (if provided) or the
  supplied row_* tokens present in the prototype. Re-use them verbatim.
- Emit exactly ONE prototype <tbody><tr>...</tr></tbody> row for repeating data. Do not duplicate multiple data rows.
- Totals/footers that remain dynamic should use tokens; static captions (titles, notes) must remain literal strings.
- Keep casing/spelling from the worksheet prototype for visible labels.

STRUCTURE & CSS
- Use a semantic table for the data grid (table-layout: fixed, border-collapse: collapse). Apply borders only where the
  worksheet shows lines (default to 1px solid #999 for visible lines). Align numeric columns to the right.
- Provide minimal wrappers with stable IDs for major regions (#report-header, #data-table, #report-totals, etc.).
- Include @page { size: A4; margin: sensible } so the HTML prints like a sheet export.
- If the layout implies repeating batch blocks outside the table, wrap the prototype inside:
    <!-- BEGIN:BLOCK_REPEAT batches -->
    <section class="batch-block">...</section>
    <!-- END:BLOCK_REPEAT -->
  Keep headers/footers outside those markers.

PROTOTYPE NOTES
- The supplied HTML already encodes preface rows, column order, and row_* tokens. Preserve that structure while
  improving styling/printability.

OUTPUT FORMAT
1) RAW HTML between these markers:
   <!--BEGIN_HTML-->
   ... full html ...
   <!--END_HTML-->
2) Matching SCHEMA JSON (scalars, row_tokens, totals, notes) between:
   <!--BEGIN_SCHEMA_JSON-->
   { ... }
   <!--END_SCHEMA_JSON-->
Schema tokens must align 1:1 with placeholders in your HTML.

Return ONLY those markers—no markdown fences or commentary.

[INPUTS]
SHEET_SNAPSHOT_JSON:
{sheet_snapshot}

SHEET_PROTOTYPE_HTML:
{sheet_html}

SCHEMA (may be empty):
{schema_str}
"""
).strip()


def build_excel_llm_call_1_prompt(sheet_snapshot: str, sheet_html: str, schema_str: str) -> str:
    snapshot_payload = sheet_snapshot.strip() or "{}"
    sheet_html_payload = sheet_html.strip() or "<html></html>"
    schema_payload = schema_str.strip() or "{}"
    return (
        EXCEL_LLM_CALL_1_PROMPT.replace("{sheet_snapshot}", snapshot_payload)
        .replace("{sheet_html}", sheet_html_payload)
        .replace("{schema_str}", schema_payload)
    )

_EXCEL_CALL3_PROMPT_SECTION = dedent(
    """
You are given the FULL HTML of an Excel-rendered worksheet template and a strict DB CATALOG. Your job now has TWO parts:
A) AUTO-MAPPING:
Identify all visible header/label texts that correspond to data fields (table headers, field labels, totals, footer labels, etc.) and map each token/label to exactly one database column from the allow-list CATALOG.
B) CONSTANT VALUE DISCOVERY:
Detect placeholders/tokens that are visually constant on the worksheet (e.g., report title, company/brand name, static section captions) and record their literal values WITHOUT editing the HTML. Only capture constants when you are 100% confident the value is not per-run data (i.e., will not vary by date/batch/user). Leave truly dynamic tokens untouched.
--------------------------------------------------------------------------------
GOALS
- Produce a JSON object that (1) proposes a strict mapping, and (2) lists constant placeholders you can safely replace using the sample worksheet values.
- Treat the provided HTML as read-only context; do not attempt to rewrite or return it.
- Ignore join/date speculation entirely.
CORE RULES (unchanged)
- Choose strictly from CATALOG (fully-qualified "table.column") when a token maps directly to a single source column.
- If the value should be passed through from request parameters, return params.param_name (lower snake_case).
- For report filter or paging tokens (e.g., from_date, to_date, start_date, end_date, date_from, date_to, range_start, range_end, page_info, page_number, page_no), return the literal string "To Be Selected..." in the mapping so the report generator can populate them later (these surface to users as "To Be Selected in Report generator"). Treat any similar date-range or page metadata fields the same. Do NOT map these to params.* or table columns.
- If no clear source exists, set the mapping value to UNRESOLVED.
- RUNTIME CONTEXT: All SQL you emit is executed by DuckDB on top of pandas DataFrames that mirror the catalog tables. Use only DuckDB-compatible syntax and reference catalog columns exactly.
- If a header requires combining multiple columns, return a DuckDB-compatible SQL expression that references only catalog columns.
- Never emit legacy wrappers such as DERIVED:, TABLE_COLUMNS[…], or COLUMN_EXP[…]; the raw SQL fragment itself is required.
- Do not invent headers, tokens, tables, columns, or duplicate mappings.
- Prefer concise, human-visible labels (strip punctuation/colons) for header keys.
HEADER KEYING (same as before)
- If a <th> has data-label, use that value (lowercase snake_case) as the header key; otherwise normalize the visible header text (trim, lowercase, spaces/punctuation->underscore).
SYNONYMS/SHORTHANDS TO NORMALIZE
- set/set_wt -> set_weight
- ach/achieved -> achieved_weight
- err -> error_kg
- err%/error% -> error_percent
- sl/serial -> sl_no
- name/material -> material_name
ENUMERATED/AGGREGATE HEADERS
- If a header clearly represents an aggregate across enumerated columns (e.g., bin1_sp..bin12_sp, bin1_act..bin12_act), do NOT guess a single column. Return a valid DuckDB SQL expression that sums/averages/etc. using only catalog columns (e.g., `SUM(recipes.bin1_sp + ... + recipes.bin12_sp)` or a CASE expression). Record the contributing columns under meta.hints[header], for example:
  { "op": "SUM", "over": ["qualified col1","qualified col2","..."] } derived from CATALOG.
- If you cannot confidently enumerate the contributing columns, keep it UNRESOLVED.
CONSTANT PLACEHOLDERS (UPDATED)
- Report ONLY tokens that are truly constant across runs (e.g., page titles, company name/logo text, static captions).
- NEVER mark tokens that are per-run or DB-driven: dates, row values, totals, page numbers, or anything under schema.row_tokens/totals/date-like fields.
- You may ONLY record a constant when that placeholder actually exists in the provided HTML. If the schema lists a token but you do not see its placeholder in the template, leave it unmapped (and call it out under `meta.unresolved`/`meta.unresolved_missing_tokens`) instead of inventing a constant entry.
- Remove constant tokens from the "mapping" object so downstream steps treat them as literals.
TOKEN SNAPSHOT (UPDATED)
- Emit a "token_samples" object that enumerates EVERY placeholder token from the HTML (exact token name, no braces).
- For each token output the literal string you see in the worksheet (via the HTML or reference image) as a best effort. Never leave it blank—if the token is absent or unreadable, return a descriptive fallback such as "NOT_VISIBLE" or "UNREADABLE".
- Match capitalization, punctuation, and spacing exactly when the text is clear.
INPUTS
[FULL_HTML]
{html_for_llm}
[CATALOG]
{catalog_json}
Optional:
[SCHEMA_JSON]
{schema_json_if_any}
[REFERENCE_PNG_HINT]
"A screenshot of the Excel worksheet was used to create this template; treat visible sheet titles/branding as likely constants."
OUTPUT -- STRICT JSON ONLY (v7)
{
  "mapping": {
    "<header_or_token>": "<table.column | params.param_name | UNRESOLVED | DuckDB SQL expression using only catalog columns>"
  },
  "token_samples": {
    "<token>": "<literal string>"
  },
  "meta": {
    "unresolved": ["<token>", "..."],
    "hints": {
      "<token>": { "op": "SUM", "over": ["table.bin1_sp","...","table.bin12_sp"] }
    }
  }
}
VALIDATION & FORMATTING
- Output ONE JSON object only. No markdown, no commentary.
- Every mapping value must either (a) match a catalog entry exactly, (b) use the params.param_name form for request parameters, (c) be the literal UNRESOLVED, or (d) be a DuckDB-compatible SQL expression that references only catalog columns.
- Reject / avoid legacy wrappers such as DERIVED:, TABLE_COLUMNS[…], COLUMN_EXP[…]; if you detect that pattern, resolve it into the raw SQL or fall back to UNRESOLVED.
- Any token you remove from "mapping" (because it is constant) must still appear in "token_samples" with the literal string you inlined.
- Do not add or rename remaining tokens. Do not alter repeat markers/tbody row prototypes.
- "token_samples" must include every placeholder exactly once and each value must be a non-empty string (use "NOT_VISIBLE"/"UNREADABLE" instead of leaving blanks).
"""
).strip()


@lru_cache(maxsize=1)
def _load_excel_llm_call_3_section() -> tuple[str, str]:
    section = _EXCEL_CALL3_PROMPT_SECTION
    if _INPUT_MARKER in section:
        system, remainder = section.split(_INPUT_MARKER, 1)
        system_text = system.strip()
        user_template = f"{_INPUT_MARKER}{remainder}".strip()
    else:
        system_text = section
        user_template = ""
    return system_text, user_template


def build_excel_llm_call_3_prompt(
    html: str,
    catalog: Iterable[str],
    schema_json: Dict[str, Any] | None = None,
    *,
    sample_data: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    system_template, user_template = _load_excel_llm_call_3_section()
    if not user_template:
        user_template = system_template
        system_template = (
            "You are the Excel auto-mapping analyst. Follow the subsequent instructions exactly and return JSON only."
        )

    html_block = _sanitize_html(html)
    catalog_block = _format_catalog(catalog)
    schema_block = _format_schema(schema_json)
    sample_block = json.dumps(sample_data, ensure_ascii=False, indent=2) if sample_data else ""

    user_payload = user_template
    for placeholder, value in (
        ("{html_for_llm}", html_block),
        ("{catalog_json}", catalog_block),
        ("{schema_json_if_any}", schema_block),
        ("{sample_row_json_if_any}", sample_block),
    ):
        user_payload = user_payload.replace(placeholder, value)

    return {
        "system": system_template.strip(),
        "user": user_payload.strip(),
        "attachments": [],
        "version": EXCEL_PROMPT_VERSION,
    }


EXCEL_LLM_CALL_3_5_PROMPT: Dict[str, str] = {
    "system": dedent(
        """\
        You are the Step 3.5 corrections specialist.
        Your responsibilities:
        A) Apply every explicit user instruction to the HTML template. Text edits, structural tweaks, CSS adjustments, and token changes are all allowed when the user asks. Do not invent changes or perform a wholesale redesign unless the user requests it.
        B) Inline any token whose mapping (or explicit user instruction) marks it as a constant (e.g., mapping value "INPUT_SAMPLE"). Use the literals provided in `mapping_context.token_samples` whenever available—copy the string exactly.
        C) Produce a `page_summary` that captures the page's business/data content for Step 4: list the constants you inlined, key field values, notable numeric totals, dates, codes, unresolved tokens, and uncertainties. Do not rehash layout, typography, or other presentation details unless they directly affect data interpretation.

        Core invariants (must hold unless a user instruction explicitly overrides them):
        1) Preserve the DOM hierarchy, repeat markers, data-region attributes, and row prototypes; only adjust them when the user explicitly says so.
        2) Preserve all remaining dynamic tokens exactly (examples: "{token}", "{{ token }}", "<span id='tok-x'>{{token}}</span>"). Only inline tokens you were instructed to convert to constants.
        3) Keep the HTML self-contained (no external resources or <script> tags). Maintain semantic structure.

        Hints:
        - The `mapping_context.mapping` object reflects the latest binding state after Step 3 and any overrides. Tokens mapped to "INPUT_SAMPLE" must be inlined; leave tokens mapped to DuckDB SQL expressions or table columns untouched unless instructed otherwise.
        - The `mapping_context.token_samples` dictionary lists the literal strings extracted in Step 3 for every placeholder. Inline tokens using these values exactly.
        - `mapping_context.sample_tokens` / `mapping_context.inline_tokens` highlight placeholders the user wants to double-check; use these cues when reporting lingering uncertainties in the page summary.
        - When provided, `reference_worksheet_html` contains a data-only rendering of the worksheet used to derive the template. Use it only to confirm literal strings; do not re-map tokens based on it.
        - `user_input` contains the authoritative instructions for this pass. Follow it exactly.

        Output (strict JSON, no markdown fences, no extra keys):
        {
          "final_template_html": "<string>",  // template after applying user instructions and inlining required constants
          "page_summary": "<string>"          // thorough prose description of the worksheet; must be non-empty
        }

        Validation checklist before responding:
        - Tokens remaining in "final_template_html" match the original tokens minus those explicitly inlined as constants.
        - Repeat markers, <tbody> counts, row prototypes, and data-region attributes are unchanged unless the user asked to modify them.
        - HTML stays free of external resources/scripts and contains no accidental literal leak of unresolved token data.
        - "page_summary" is a detailed narrative (>1 sentence) that reports the exact values you inlined (including any best-guess readings), important metrics, unresolved fields, and uncertainties, without digressing into layout or styling trivia.
        - JSON is valid (UTF-8), strings escaped properly, and only the two required keys are present.




        """
    ).strip(),
    "user": "USER (JSON payload):\n{payload}",
}


def build_excel_llm_call_3_5_prompt(
    *,
    template_html: str,
    schema: Mapping[str, Any] | None,
    user_input: str,
    page_png_path: str | None = None,
    reference_worksheet_html: str | None = None,
    mapping_context: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    schema_payload = dict(schema or {})
    payload: Dict[str, Any] = {
        "template_html": template_html,
        "schema": schema_payload,
        "user_input": user_input or "",
    }
    if mapping_context:
        payload["mapping_context"] = dict(mapping_context)
    if isinstance(reference_worksheet_html, str) and reference_worksheet_html.strip():
        payload["reference_worksheet_html"] = reference_worksheet_html

    # Prefer full worksheet HTML when provided; otherwise, attach optional page image as a fallback.
    from pathlib import Path as _Path  # local import to avoid cycles

    try:
        _build_data_uri = _pdf_prompts._build_data_uri  # type: ignore[attr-defined]
    except Exception:  # pragma: no cover

        def _null_build_data_uri(_p):  # type: ignore
            return None

        _build_data_uri = _null_build_data_uri  # type: ignore

    data_uri = None if reference_worksheet_html else _build_data_uri(_Path(page_png_path) if page_png_path else None)
    payload_json = json.dumps(payload, ensure_ascii=False, indent=2)
    user_content = [{"type": "text", "text": EXCEL_LLM_CALL_3_5_PROMPT["user"].format(payload=payload_json)}]
    if data_uri:
        user_content.append({"type": "image_url", "image_url": {"url": data_uri, "detail": "high"}})

    messages = [{"role": "user", "content": user_content}]

    return {
        "system": EXCEL_LLM_CALL_3_5_PROMPT["system"],
        "messages": messages,
        "version": EXCEL_PROMPT_VERSION_3_5,
    }


EXCEL_LLM_CALL_4_SYSTEM_PROMPT = dedent(
    """\
    LLM CALL 4 - Step-5 Hand-off Builder
    You generate the structured payload that LLM Call 5 will consume. Your job is to:
    1. Interpret the user's instructions, template structure, and catalog context to finalize report logic and reshape rules.
    2. Produce a precise overview plus the Step-5 requirements bundle (datasets, parameter semantics, transformations).
    3. Emit a fully mapped contract object so Call 5 can compile SQL without guessing.
    You must:
    * Use only columns from the provided CATALOG allow-list. If a necessary column is absent, surface it via validation; never invent table/column names.
    * RUNTIME CONTEXT: The downstream engine materialises every catalog table as a pandas DataFrame and executes your SQL via DuckDB. Stick to DuckDB-compatible expressions and reference dataset/table aliases exactly.
    * Preserve every dynamic token from the schema. Do not add, remove, or rename tokens; constants already inlined in HTML are not tokens.
    * Map every token with exactly one of:
        - `TABLE.COLUMN` (direct source, obeying the catalog allow-list),
        - `DATASET.COLUMN` (use dataset aliases produced by Step-5, e.g., `rows.row_token`, `totals.total_token`),
        - `PARAM:name` (header/parameter passthrough),
        - a DuckDB SQL expression that references only catalog columns or dataset aliases (no `DERIVED:` prefix).
    * When you emit a DuckDB SQL expression, reuse the identical expression inside `row_computed` / `totals_math` so the runtime stays consistent.
    * The auto_mapping_proposal.mapping and mapping_override values may contain SQL expressions; treat them as guidance (mapping_override is authoritative when provided).
    * Describe reshape rules with exact column ordering, filters to apply before aggregation, and any dedup or ordering requirements. Ensure `step5_requirements.datasets.rows.grouping` / `ordering` mirror those expectations. Every reshape rule must include a non-empty `"purpose"` sentence (plain-English summary, <= 15 words) so downstream validators understand its intent.
    * Guarantee `order_by.rows` and `row_order` are non-empty arrays. Mirror the stable ordering you describe (typically timestamp ASC) and default to `["ROWID"]` only when no explicit ordering exists. Never leave `row_order` missing or blank.
      * Spell out parameter semantics: which parameters are pass-through, which drive filters, and the condition for applying optional filters (e.g., "only when non-empty").
      * Treat `key_tokens` (see payload) as required user filters. Preserve their mappings (typically `PARAM:<name>`), list them under `step5_requirements.parameters.required`, and explain that downstream SQL must apply equality predicates for them in parent/child/totals entrypoints when values are supplied.
    * Leave `validation.unknown_tokens` and `validation.unknown_columns` empty; by the end of this call every token must be mapped and every column reference resolved.
    * Return exactly one JSON object that matches the output shape described below. No extra text outside JSON.
    User message (JSON payload):
    {
      "final_template_html": "<HTML from Step 3.5 (constants already inlined; dynamic tokens preserved)>",
      "page_summary": "Detailed narrative of the worksheet from Step 3.5",
      "schema": {
        "scalars": ["..."],
        "row_tokens": ["..."],
        "totals": ["..."]
      },
      "auto_mapping_proposal": {
        "mapping": {
          "set_weight": "SUM(recipes.bin1_sp + recipes.bin2_sp + ... + recipes.bin12_sp)",
          "material_name": "recipes.bin_content_normalized"
        },
        "join": { "parent_table": "...", "parent_key": "...", "child_table": "...", "child_key": "..." },
        "date_columns": { "table": "date_col" },
        "unresolved": ["token_a", "token_b"],
        "warnings": ["..."]
      },
      "mapping_override": {
        "set_weight": "SUM(recipes.bin1_sp + ... + recipes.bin12_sp)",
        "achieved_weight": "SUM(recipes.bin1_act + ... + recipes.bin12_act)"
      },
        "user_instructions": "Free-form explanation from the user. May describe reshaping, grouping keys, aggregations, filters, etc.",
        "key_tokens": ["plant_name", "recipe_code"],
        "catalog": ["table.column", "..."],
      "dialect_hint": "sqlite or postgres"
    }
    Expected output (single JSON object):
    {
      "overview_md": "STRING (Markdown). A comprehensive, in-depth overview that Step 5 will rely on. Include the sections listed below.",
      "step5_requirements": {
        "datasets": {
          "header": {"description": "One-row header dataset", "columns": ["<scalar tokens in order>"]},
          "rows": {
            "description": "Detail rows dataset",
            "columns": ["<row tokens in order>"],
            "grouping": ["Describe logical grouping keys, include any trimming or dedup rules."],
            "ordering": ["Describe stable sort order with tie-breakers and case handling (e.g., ORDER BY material_name ASC, bin_index ASC). Ensure this exact ordering is copied into both `order_by.rows` and `row_order`."]
          },
          "totals": {"description": "Aggregate totals dataset", "columns": ["<totals tokens in order>"]}
        },
        "semantics": "Explain required filters versus pass-through parameters and when optional filters apply (e.g., only when non-empty).",
        "parameters": {
          "required": [{"name": "from_date", "type": "date"}, {"name": "to_date", "type": "date"}],
          "optional": [{"name": "plant_name", "type": "string"}, {"name": "recipe_code", "type": "string"}]
        },
        "transformations": [
          "Explicit reshaping rules (for example UNION ALL across bin1..bin12 -> material_name/set/ach) with filters applied before grouping.",
          "Row-level computed columns and staging tables required to produce row tokens (note COALESCE/NULLIF guards).",
          "Totals math rationale mirroring the contract expressions."
        ]
      },
      "contract": {
        "tokens": {
          "scalars": ["..."],
          "row_tokens": ["..."],
          "totals": ["..."]
        },
        "mapping": {
          "plant_name": "PARAM:plant_name",
          "from_date": "PARAM:from_date",
          "row_material_name": "TRIM(long_bins.material_name)",
          "row_set_wt": "SUM(long_bins.set_wt_kg)",
          "total_set_wt": "SUM(rows.row_set_wt)",
          "print_date": "PARAM:print_date"
        },
        "unresolved": [],
        "join": {
          "parent_table": "recipes",
          "parent_key": "id",
          "child_table": null,
          "child_key": null
        },
        "date_columns": { "recipes": "start_time" },
        "filters": { "optional": { "recipe_code": "recipes.recipe_name" } },
        "reshape_rules": [
          {
            "purpose": "Produce rows dataset",
            "strategy": "UNION_ALL",
            "explain": "Union bin1..bin12 columns into long form, trim material names, drop blanks before grouping",
            "columns": [
              {"as": "material_name", "from": ["recipes.bin1_content", "...", "recipes.bin12_content"]},
              {"as": "set_wt_kg", "from": ["recipes.bin1_sp", "...", "recipes.bin12_sp"]},
              {"as": "ach_wt_kg", "from": ["recipes.bin1_act", "...", "recipes.bin12_act"]}
            ]
          }
        ],
        "row_computed": {
          "row_error_kg": "SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)",
          "row_error_pct": "CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg))/SUM(long_bins.set_wt_kg) END"
        },
        "totals_math": {
          "total_set_wt": "SUM(rows.row_set_wt)",
          "total_ach_wt": "SUM(rows.row_ach_wt)",
          "total_error_kg": "SUM(rows.row_error_kg)",
          "total_error_percent": "SUM(rows.row_error_kg) / NULLIF(SUM(rows.row_set_wt), 0)"
        },
        "formatters": {
          "row_error_pct": "percent(2)",
          "total_error_pct": "percent(2)",
          "print_date": "date(YYYY-MM-DD)"
        },
        "order_by": {"rows": ["row_material_name ASC"]},
        "notes": "Domain notes from the user that matter in the DuckDB/DataFrame runtime"
      },
      "validation": {
        "unknown_tokens": [],
        "unknown_columns": [],
        "token_coverage": {
          "scalars_mapped_pct": 100,
          "row_tokens_mapped_pct": 100,
          "totals_mapped_pct": 100
        }
      }
    }
    Guidance for overview_md:
    * Executive Summary: what the user wants; special reshaping, grouping, totals.
    * Token Inventory: list tokens that remain dynamic.
    * Mapping Table: Markdown table Token -> source (TABLE.COLUMN / PARAM / DuckDB SQL expression).
    * Join & Date Rules: tables, joins, filter semantics.
    * Transformations: explicit unpivot/union shapes, computed fields, totals rationale.
    * Parameters: required/optional, semantics, examples (note pass-through vs. filter behaviour).
    * Checklist for Step 5: bullet list of DuckDB SQL requirements (column orders, filters, grouping, NULLIF guards, optional filter behaviour).
    Model self-check expectations:
    * `unknown_tokens` must be [] because every token is mapped.
    * `unknown_columns` must be [] because every column reference is in the catalog allow-list.
    * `token_coverage` should report 100% across scalars/rows/totals once mapping is complete.

    """
).strip()


def build_excel_llm_call_4_prompt(
    *,
    final_template_html: str,
    page_summary: str,
    schema: Mapping[str, Any] | None,
    auto_mapping_proposal: Mapping[str, Any],
    mapping_override: Mapping[str, Any] | None,
    user_instructions: str,
    catalog: Iterable[str],
    dialect_hint: str | None = None,
    key_tokens: Iterable[str] | None = None,
) -> Dict[str, Any]:
    key_tokens_list: list[str] = []
    if key_tokens:
        seen: set[str] = set()
        for token in key_tokens:
            text = str(token or "").strip()
            if not text or text in seen:
                continue
            seen.add(text)
            key_tokens_list.append(text)

    payload: Dict[str, Any] = {
        "final_template_html": final_template_html,
        "page_summary": page_summary,
        "schema": dict(schema or {}),
        "auto_mapping_proposal": dict(auto_mapping_proposal or {}),
        "mapping_override": dict(mapping_override or {}),
        "user_instructions": user_instructions or "",
        "catalog": [str(item) for item in catalog],
    }
    if key_tokens_list:
        payload["key_tokens"] = key_tokens_list
    if dialect_hint is not None:
        payload["dialect_hint"] = str(dialect_hint)

    payload_json = json.dumps(payload, ensure_ascii=False, indent=2)
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": payload_json,
                }
            ],
        }
    ]

    return {
        "system": EXCEL_LLM_CALL_4_SYSTEM_PROMPT,
        "messages": messages,
        "version": EXCEL_PROMPT_VERSION_4,
    }


# ------------------------- LLM CALL 5 (Excel) -------------------------
EXCEL_LLM_CALL_5_PROMPT = {
    "system": dedent(
        """\
        LLM CALL 5 - Generator Assets Emitter (Excel)
        You are the Step-5 generator bundle author. Given the final template HTML and the complete Step-4 payload, you must emit every runtime artifact required by the Python pipeline. An optional reference worksheet HTML may be provided for context.

        Canonical sources:
        * Treat `step4_output.contract` as the authoritative blueprint for tokens, bindings, reshape rules, joins, filters, and math. Do not add/drop/rename tokens.
        * Mirror the contract exactly in your `contract` output (same ordering, same expressions). If you cannot satisfy a requirement, leave data unchanged and set `"invalid": true`.
        * When SQL entrypoints produce dataset aliases (`header`, `rows`, `totals`), reference those explicitly in the contract mapping (e.g., `rows.row_token`, `totals.total_token`) so the runtime can hydrate values without re-deriving them.

        Required output structure (output exactly this object shape; no extra keys, no missing keys):
        {
          "contract": {
            "tokens": { "scalars": [...], "row_tokens": [...], "totals": [...] },
            "mapping": { "<token>": "TABLE.COLUMN|DATASET.COLUMN|PARAM:name|<sql expression>" },
            "join": { "parent_table": "...", "parent_key": "...", "child_table": "...", "child_key": "..." },
            "date_columns": { "<table>": "<date column>" },
            "filters": { ...copy of Step-4 filters object... },
            "reshape_rules": [...],
            "row_computed": { "<token>": "<sql expression>" },
            "totals_math": { "<token>": "<sql expression>" },
            "formatters": { "<token>": "<formatter spec>" },
            "order_by": { "rows": ["<order clause>", ...] },
            "header_tokens": ["<scalar token>", ...],
            "row_tokens": ["<row token>", ...],
            "totals": { "<total token>": "DATASET.COLUMN|<sql expression>" },
            "row_order": ["<order clause>", ...]
          },
          "sql_pack": {
            "dialect": "duckdb|postgres",
            "script": "-- HEADER SELECT --\n<SQL>\n-- ROWS SELECT --\n<SQL>\n-- TOTALS SELECT --\n<SQL>",
            "entrypoints": { "header": "<SQL>", "rows": "<SQL>", "totals": "<SQL>" },
            "params": { "required": ["<param>", ...], "optional": ["<param>", ...] }
          },
          "dialect": "duckdb|postgres",
          "invalid": false
        }
        Use [] for empty arrays, {} for empty objects, and "" for empty strings.

        Dialect rules (executed via DuckDB in every case):
        * sqlite: treat this as the DuckDB subset that mimics SQLite; named params (:param); use NULLIF(x, 0) to prevent division by zero; FILTER not supported.
        * postgres: DuckDB supports most Postgres syntax; named params allowed; NULLIF/COALESCE allowed; FILTER allowed.

        Contract requirements:
        * Copy tokens, mappings, reshape rules, row_computed, totals_math, formatters, filters, date_columns, join, `order_by`, `row_order`, and notes from the Step-4 contract. Ensure every DuckDB SQL expression matches between `mapping`, `row_computed`, and `totals_math`.
        * Mapping values must use only `TABLE.COLUMN`, `PARAM:name`, dataset aliases, or DuckDB SQL expressions built from catalog/dataset columns (no prefixes or prose).
        * Populate any missing optional sections (e.g., empty objects/arrays) so the JSON validates against `contract_v2.schema.json`.
        * Join block must remain present with non-empty `parent_table`, `parent_key`, `child_table`, `child_key`. If there is no logical child table, set `child_table` equal to the parent and reuse the same key; never leave keys blank or null.
        * Mirror Step-4 `reshape_rules` exactly (strategy, datasets, alias ordering) and guarantee every rule carries a non-empty `"purpose"` summary. If Step-4 omitted it, synthesize a concise description (<= 15 words) before returning.
        * Ensure `order_by.rows` and `row_order` remain aligned (both arrays). If Step-4 provided only one of them, copy it to the other; if neither exists, emit `["ROWID"]` for both instead of leaving blanks.
        * Every token listed in `contract.tokens` must appear exactly once across the header/rows/totals SELECTs (no duplicate aliases or alternate spellings).

        SQL pack requirements (DuckDB over pandas DataFrames):
        * Implement `reshape_rules`, joins, filters, parameter semantics, and math exactly as described by the contract and `step5_requirements`.
        * Provide a single consolidated `script` string that contains the header, rows, and totals SELECT statements in order. Include clear section markers such as:
          -- HEADER SELECT --
          ...select...
          -- ROWS SELECT --
          ...select...
          -- TOTALS SELECT --
          ...select...
        * Ensure each SELECT projects aliases exactly matching the tokens for that section; do not emit multiple SELECT statements per token or redundant aliases.
        * Provide an `entrypoints` object where each SELECT projects aliases exactly matching the contract token order (header → scalars, rows → row tokens, totals → totals tokens).
        * Reflect the contract join keys and filters in the SQL. Header, rows, and totals must reference the parent key columns in their FROM/JOIN clauses, respecting optional filter semantics.
        * Ensure `params.required/optional` aligns with the contract bindings and Step-4 requirements. Optional filters only apply when the parameter is non-null/non-empty.
        * Treat `key_tokens` (see payload) as mandatory equality filters. Add them to `params.required`, keep their mappings as `PARAM:<name>`, and ensure each entrypoint's WHERE clause applies `= :token` tests on the correct table aliases.
        * Header entrypoints must return exactly one row. If you only project parameters or literals, emit `SELECT ...` with no FROM clause (or aggregate) rather than scanning base tables.
        * When reshape_rules specify `UNION_ALL`, emit one SELECT per source entry in `columns[*].from`, referencing each catalog column directly and aliasing it with the provided `as` name. Do not replace this pattern with CASE expressions or references to columns that are not enumerated.
        * Ensure `output_schemas.header`, `output_schemas.rows`, and `output_schemas.totals` list tokens in the exact order defined by the contract; resolve any mismatch yourself instead of flagging schema issues.

        Quality gating before returning:
        * Ensure SQL aliases align 1:1 with the contract token order for header, rows, and totals sections.
        * Verify `contract.join.parent_table`, `contract.join.parent_key`, `contract.join.child_table`, and `contract.join.child_key` are non-empty strings (reuse the parent table/key for the child when no separate child exists).
        * Do not emit `needs_user_fix` entries or set `"invalid": true`; resolve the underlying mismatch before responding so the bundle is production ready.

        Reference HTML/image:
        * Use only for sanity checks (naming consistency, visual ordering). Do NOT alter tokens or data logic based on appearance alone.
        """
    ).strip(),
    "user": dedent(
        """\
        {
          "final_template_html": "<HTML from Step 3.5 (constants already inlined; dynamic tokens preserved)>",
          "step4_output": {
            "contract": { /* EXACT Step-4 contract object */ },
            "overview_md": "OPTIONAL: the Step-4 overview markdown as a single string",
            "step5_requirements": { /* OPTIONAL: Step-4 step5_requirements payload */ },
            "assumptions": [/* OPTIONAL strings */],
            "warnings": [/* OPTIONAL strings */],
            "validation": { /* OPTIONAL validation report */ }
          },
          "reference_worksheet_html": "OPTIONAL: full worksheet HTML snapshot for context (do not re-derive tokens from this)",
          "key_tokens": ["plant_name", "recipe_code"],
          "dialect": "sqlite"
        }
        """
    ).strip(),
}


@lru_cache(maxsize=1)
def get_excel_prompt_generator_assets() -> Dict[str, str]:
    """Return the Excel-specific system/user templates for LLM CALL 5."""
    return dict(EXCEL_LLM_CALL_5_PROMPT)


__all__ = [
    "EXCEL_PROMPT_VERSION",
    "EXCEL_PROMPT_VERSION_3_5",
    "EXCEL_PROMPT_VERSION_4",
    "EXCEL_PROMPT_VERSION_5",
    "build_excel_llm_call_1_prompt",
    "build_excel_llm_call_3_prompt",
    "build_excel_llm_call_3_5_prompt",
    "build_excel_llm_call_4_prompt",
    "get_excel_prompt_generator_assets",
]
