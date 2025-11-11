# mypy: ignore-errors
from __future__ import annotations

import base64
import json
import re
from functools import lru_cache
from pathlib import Path
from textwrap import dedent
from typing import Any, Dict, Iterable, Mapping

PROMPT_VERSION = "llm_call_3_v7"
PROMPT_VERSION_3_5 = "v4"
PROMPT_VERSION_4 = "v2"
LLM_CALL_PROMPTS: Dict[str, str] = {
    "llm_call_1": dedent(
        """\
        Produce a COMPLETE, self-contained HTML document (<!DOCTYPE html> ...) with inline <style>. It must visually photocopy the given PDF page image as closely as possible. Mirror fonts, spacing, borders, alignment, and table layouts. Tables must use border-collapse, 1px borders, and table-layout: fixed for neat alignment.

        SCHEMA USAGE
        - If a SCHEMA is provided below, use ONLY placeholders from that SCHEMA exactly as written (same names).
        - If SCHEMA is NOT provided, FIRST infer a compact schema (see OUTPUT FORMAT for SCHEMA_JSON) and then use ONLY those tokens in the HTML.
        - In HTML, placeholders must be written as {token} (single braces). In SCHEMA_JSON they must appear WITHOUT braces (e.g., "report_title").
        - If a value is not in SCHEMA/SCHEMA_JSON, render it as literal text. If a token exists in SCHEMA/SCHEMA_JSON but does not appear on this page, omit it.

        REPEATABLE BLOCK (edge case)
        - If the page clearly contains repeating sections (visually identical blocks stacked vertically), output ONE prototype of that block wrapped exactly as:
        <!-- BEGIN:BLOCK_REPEAT batches -->
        <section class='batch-block'>...</section>
        <!-- END:BLOCK_REPEAT -->
        - Place header/footer OUTSIDE these markers. Do NOT clone or duplicate multiple blocks.

        ROW PROTOTYPES
        - For tables with repeating rows, output headers plus a single <tbody><tr>...</tr></tbody> row prototype.
        - Keep any final summary/total row if it exists.

        STRUCTURE & CSS
        - The result must be printable: use @page size A4 with sensible margins.
        - Prefer flowing layout (avoid fixed heights). Avoid absolute positioning except for persistent header/footer if clearly present.
        - Reproduce what is visible - draw ONLY the rules/lines that exist in the image. Default to no borders and transparent backgrounds; add borders per edge only where a line is visible.
        - Use table markup ONLY for true grids and structured data (never div-based). Use borderless tables or simple divs for key/value areas. Avoid unnecessary nested tables or enclosing frames.
        - Right-align numeric columns where appropriate; keep typographic rhythm tight enough to match the PDF.

        PROJECT-SPECIFIC ADDITIONS (to aid later steps while keeping fidelity)
        - Add a minimal set of CSS custom properties to make column widths and key spacings easy to refine later (e.g., :root { --col-1-w: 24mm; --row-gap: 2mm; }). Use these variables inside the CSS you produce.
        - Add stable IDs for major zones only (no extra wrappers): #report-header, #data-table (main grid), #report-totals (if present). Do NOT add decorative containers.
        - For table header cells, include a data-label attribute with the visible header text normalized (e.g., <th data-label="header_label">Material Name</th>). Visible text must remain unchanged.

        OUTPUT RULES
        - No lorem ipsum or sample values. No external resources.
        - No comments except the repeat markers if applicable.
        - Do NOT rename or invent tokens beyond SCHEMA/SCHEMA_JSON.
        - Return ONLY the outputs described below - no markdown fences, no explanations.

        OUTPUT FORMAT
        1) First, the RAW HTML between these exact markers:
        <!--BEGIN_HTML-->
        ...full html...
        <!--END_HTML-->

        2) Then, the SCHEMA JSON between these markers (EXAMPLE ONLY - replace with actual tokens discovered from THIS page; do NOT output these example names):
        <!--BEGIN_SCHEMA_JSON-->
        {
          "scalars": ["scalar_token_1","scalar_token_2","scalar_token_3"],
          "row_tokens": ["row_token_1","row_token_2","row_token_3"],
          "totals": ["total_token_1","total_token_2","total_token_3"],
          "notes": ""
        }
        <!--END_SCHEMA_JSON-->

        If SCHEMA is provided below, ensure SCHEMA_JSON you output matches it exactly (names and membership). If SCHEMA is not provided, infer SCHEMA_JSON consistently with the placeholders you used in the HTML (one-to-one, no extras).

        [INPUTS]
        - PDF page image is attached.
        - SCHEMA (may be absent):
        SCHEMA:
        {schema_str}
        """
    ).strip(),
    "llm_call_2": dedent(
        """\
        Compare these images: REFERENCE (PDF page) vs RENDER (current HTML). SSIM={{ssim_value:.4f}}.
        Goal: refine the provided HTML/CSS so the render becomes a near-perfect PHOTOCOPY of the reference.

        STRICT RULES (unchanged core)
        - Do NOT rename, add, remove, or move SCHEMA placeholders; keep all tokens exactly as in the current HTML.
        - Do NOT change the number of repeating sections or table rows that currently exist in the HTML.
        - If repeat markers (e.g., <!-- BEGIN:BLOCK_REPEAT ... -->) are present, keep them unchanged with exactly one prototype inside.
        - Prefer CSS edits; only introduce minimal HTML wrappers (e.g., structural containers/colgroups) if strictly necessary to achieve alignment - never alter tokens.

        PROJECT-SPECIFIC ADDITIONS (minimal, to suit our pipeline)
        - First adjust existing CSS custom properties if present (e.g., --col-1-w, --col-2-w, --row-gap, --header-h); only if insufficient, then edit rules.
        - Respect stable IDs/zones if present (#report-header, #data-table, #report-totals). Do not add decorative wrappers.
        - Use millimetre-based sizing where practical for print parity (e.g., widths, padding, margins in mm). Snap adjustments to small increments (~0.1mm / 0.25px) to avoid jitter.
        - For numeric columns, ensure right alignment and enable tabular figures (font-variant-numeric: tabular-nums) so digits align vertically.
        - Borders/lines: match only what is visible in the reference; prefer per-edge borders to mimic single ruled lines. Avoid box-shadows, rounded corners, blurs, gradients, or tints unless clearly present in the reference.
        - Pagination stability: keep .batch-block printable (break-inside: avoid; page-break-inside: avoid); do not fix heights unless the reference shows fixed frames.
        - Do NOT scale the entire page via CSS transforms to "cheat" alignment. Correct geometry via widths, margins, paddings, line-height, letter-spacing, and colgroup widths.

        VISUAL MATCHING (unchanged intent)
        Identify and correct EVERY visible discrepancy between reference and render at any scale. Infer and adjust geometry, proportions, typography and line metrics, borders/line weights, grid/column structure, text/number alignment, intra/inter-block spacing, pagination behavior, page frame presence, and header/footer placement. Derive all values from the reference image; do not assume defaults. The result should be indistinguishable from the reference when printed.

        OUTPUT (tightened for our tooling)
        - Return FULL HTML (<!DOCTYPE html> ...) with inline <style> only - no external resources.
        - No markdown, no commentary, no sample data.
        - Preserve existing IDs/classes/markers; add only what is minimally required for fidelity.
        - Wrap output exactly between these markers:
        <!--BEGIN_HTML-->
        ...full refined html...
        <!--END_HTML-->

        [INPUTS]
        SCHEMA:
        {schema_str}

        [REFERENCE_IMAGE]
        (embedded image URL)

        [RENDER_IMAGE]
        (embedded image URL)

        [CURRENT_HTML]
        {current_html}
        """
    ).strip(),
}

_INPUT_MARKER = "[INPUTS]"
_CALL3_PROMPT_SECTION = """
You are given the FULL HTML of a report template and a strict DB CATALOG. Your job now has TWO parts:
A) AUTO-MAPPING:
Identify all visible header/label texts that correspond to data fields (table headers, field labels, totals, footer labels, etc.) and map each token/label to exactly one database column from the allow-list CATALOG.
B) CONSTANT VALUE DISCOVERY:
Detect placeholders/tokens that are visually constant on the reference PDF (e.g., report title, company/brand name, static section captions) and record their literal values WITHOUT editing the HTML. Only capture constants when you are 100% confident the value is not per-run data (i.e., will not vary by date/batch/user). Leave truly dynamic tokens untouched.
--------------------------------------------------------------------------------
GOALS
- Produce a JSON object that (1) proposes a strict mapping, and (2) lists constant placeholders you can safely replace using the sample PDF values.
- Treat the provided HTML as read-only context; do not attempt to rewrite or return it.
- Ignore join/date speculation entirely.
CORE RULES (unchanged)
- Choose strictly from CATALOG (fully-qualified "table.column") when a token maps directly to a single source column.
- If the value should be passed through from request parameters, return params.param_name (lower snake_case).
- For report filter or paging tokens (e.g., from_date, to_date, start_date, end_date, date_from, date_to, range_start, range_end, page_info, page_number, page_no), return the literal string "To Be Selected..." in the mapping so the report generator can populate them later (these surface to users as "To Be Selected in Report generator"). Treat any similar date-range or page metadata fields the same. Do NOT map these to params.* or table columns.
- If no clear source exists, set the mapping value to UNRESOLVED.
- If a header requires combining multiple columns, return a SQL expression that references only catalog columns (standard SQL syntax).
- Never emit legacy wrappers such as DERIVED:, TABLE_COLUMNS[…], or COLUMN_EXP[…]; the raw SQL fragment itself is required.
- Do not invent headers, tokens, tables, columns, or duplicate mappings.
- Prefer concise, human-visible labels (strip punctuation/colons) for header keys.
HEADER KEYING (same as before)
- If a <th> has data-label, only use that value (converted to lowercase snake_case) when the same token name also appears as a {placeholder} in the HTML or is listed in SCHEMA. Otherwise treat the data-label as decorative and fall back to the visible header text.
SYNONYMS/SHORTHANDS TO NORMALIZE
- set/set_wt -> set_weight
- ach/achieved -> achieved_weight
- err -> error_kg
- err%/error% -> error_percent
- sl/serial -> sl_no
- name/material -> material_name
ENUMERATED/AGGREGATE HEADERS
- If a header clearly represents an aggregate across enumerated columns (e.g., bin1_sp..bin12_sp, bin1_act..bin12_act), do NOT guess a single column. Return a valid SQL expression that sums/averages/etc. using only catalog columns (e.g., `SUM(recipes.bin1_sp + ... + recipes.bin12_sp)` or a CASE expression). Record the contributing columns under meta.hints[header], for example:
  { "op": "SUM", "over": ["qualified col1","qualified col2","..."] } derived from CATALOG.
- If you cannot confidently enumerate the contributing columns, keep it UNRESOLVED.
CONSTANT PLACEHOLDERS (UPDATED)
- Report ONLY tokens that are truly constant across runs (e.g., page titles, company name/logo text, static captions).
- NEVER mark tokens that are per-run or DB-driven: dates, row values, totals, page numbers, or anything under schema.row_tokens/totals/date-like fields.
- You may ONLY record a constant when that placeholder actually exists in the provided HTML. If the schema lists a token but you do not see its placeholder in the template, leave it unmapped (and call it out under `meta.unresolved`/`meta.unresolved_missing_tokens`) instead of inventing a constant entry.
- Remove constant tokens from the "mapping" object so downstream steps treat them as literals.
TOKEN SNAPSHOT (UPDATED)
- Emit a "token_samples" object that enumerates EVERY placeholder token from the HTML (exact token name, no braces).
- For each token output the literal string you see on the PDF (best effort). Never leave it blank—if the token is absent or unreadable, return a descriptive fallback such as "NOT_VISIBLE" or "UNREADABLE".
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
"A screenshot of the reference PDF was used to create this template; treat visible page titles/branding as likely constants."
OUTPUT -- STRICT JSON ONLY (v7)
{
  "mapping": {
    "<header_or_token>": "<table.column | params.param_name | UNRESOLVED | SQL expression using only catalog columns>"
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
- Every mapping value must either (a) match a catalog entry exactly, (b) use the params.param_name form for request parameters, (c) be the literal UNRESOLVED, or (d) be a SQL expression that references only catalog columns and uses standard SQL syntax.
- Reject / avoid legacy wrappers such as DERIVED:, TABLE_COLUMNS[…], COLUMN_EXP[…]; if you detect that pattern, resolve it into the raw SQL or fall back to UNRESOLVED.
- Any token you remove from "mapping" (because it is constant) must still appear in "token_samples" with the literal string you inlined.
- Do not add or rename remaining tokens. Do not alter repeat markers/tbody row prototypes.
- "token_samples" must include every placeholder exactly once and each value must be a non-empty string (use "NOT_VISIBLE"/"UNREADABLE" instead of leaving blanks).
""".strip()


@lru_cache(maxsize=1)
def _load_llm_call_3_section() -> tuple[str, str]:
    section = _CALL3_PROMPT_SECTION
    if _INPUT_MARKER in section:
        system, remainder = section.split(_INPUT_MARKER, 1)
        system_text = system.strip()
        user_template = f"{_INPUT_MARKER}{remainder}".strip()
    else:
        system_text = section.strip()
        user_template = ""

    return system_text, user_template


def _sanitize_html(html: str) -> str:
    """
    Strip comments, scripts, and excessive whitespace to keep prompts compact.
    """
    html = html or ""
    # remove script tags/HTML comments but preserve repeat markers and inline CSS
    comment_re = re.compile(r"(?is)<!--(?!\s*(BEGIN:BLOCK_REPEAT|END:BLOCK_REPEAT)).*?-->")
    script_re = re.compile(r"(?is)<script\b[^>]*>.*?</script>")
    collapsed = script_re.sub("", comment_re.sub("", html))
    collapsed = re.sub(r"[ \t]{2,}", " ", collapsed)
    collapsed = re.sub(r"\n{3,}", "\n\n", collapsed)
    return collapsed.strip()


def _format_catalog(catalog: Iterable[str]) -> str:
    catalog_list = [str(item).strip() for item in catalog]
    return json.dumps(catalog_list, ensure_ascii=False, indent=2)


def _normalize_schema_payload(schema: Mapping[str, Any] | None) -> Dict[str, Any]:
    base = {
        "scalars": [],
        "row_tokens": [],
        "totals": [],
        "notes": "",
    }
    if not isinstance(schema, Mapping):
        return base

    def _collect(key: str) -> list[str]:
        values = schema.get(key, [])
        if isinstance(values, Iterable) and not isinstance(values, (str, bytes)):
            return [str(item).strip() for item in values if str(item).strip()]
        return []

    base["scalars"] = _collect("scalars")
    base["row_tokens"] = _collect("row_tokens")
    base["totals"] = _collect("totals")

    notes = schema.get("notes")
    if notes is not None:
        base["notes"] = str(notes)
    return base


def _format_schema(schema: Dict[str, Any] | None) -> str:
    normalized = _normalize_schema_payload(schema)
    return json.dumps(normalized, ensure_ascii=False, indent=2, sort_keys=True)


def _row_token_hint(schema: Mapping[str, Any] | None) -> str:
    normalized = _normalize_schema_payload(schema)
    row_tokens = [tok for tok in normalized.get("row_tokens", []) if str(tok).lower().startswith("row_")]
    if not row_tokens:
        return ""

    preview = ", ".join(row_tokens[:8])
    if len(row_tokens) > 8:
        preview += ", ..."

    hint_lines = [
        "ROW TOKEN NAMING",
        "- The HTML template exposes repeating-row placeholders that already include the `row_` prefix.",
        "- When producing the mapping, reference those tokens verbatim (including the prefix and casing).",
        f"- Example row tokens: {preview}",
    ]
    return "\n".join(hint_lines)


def build_llm_call_3_prompt(
    html: str,
    catalog: Iterable[str],
    schema_json: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Build the system/user payload for LLM Call 3 (auto-map + constant discovery).
    """
    system_template, user_template = _load_llm_call_3_section()
    if not user_template:
        user_template = system_template
        system_template = (
            "You are a meticulous analyst that performs report auto-mapping and constant inlining. "
            "Follow the subsequent instructions strictly."
        )

    html_block = _sanitize_html(html)
    catalog_block = _format_catalog(catalog)
    schema_block = _format_schema(schema_json)
    row_hint = _row_token_hint(schema_json)

    user_payload = user_template
    for placeholder, value in (
        ("{html_for_llm}", html_block),
        ("{catalog_json}", catalog_block),
        ("{schema_json_if_any}", schema_block),
    ):
        user_payload = user_payload.replace(placeholder, value)

    if row_hint:
        user_payload = f"{user_payload.strip()}\n\n{row_hint}"

    attachments: list[dict[str, Any]] = []
    if "[REFERENCE_PNG_HINT]" not in user_payload:
        attachments.append(
            {
                "type": "text",
                "text": (
                    "[REFERENCE_PNG_HINT]\n"
                    '"A screenshot of the reference PDF was used to create this template; '
                    'treat visible page titles/branding as likely constants."'
                ),
            }
        )

    return {
        "system": system_template.strip(),
        "user": user_payload.strip(),
        "attachments": attachments,
        "version": PROMPT_VERSION,
    }


LLM_CALL_3_5_PROMPT: Dict[str, str] = {
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
        - The `mapping_context.mapping` object reflects the latest binding state after Step 3 and any overrides. Tokens mapped to "INPUT_SAMPLE" must be inlined; leave tokens mapped to SQL expressions or table columns untouched unless instructed otherwise.
        - The `mapping_context.token_samples` dictionary lists the literal strings extracted in Step 3 for every placeholder. Inline tokens using these values exactly.
        - `mapping_context.sample_tokens` / `mapping_context.inline_tokens` highlight placeholders the user wants to double-check; use these cues when reporting lingering uncertainties in the page summary.
        - A reference PNG is attached via `image_url`. Treat it as general context while following all other instructions.
        - `user_input` contains the authoritative instructions for this pass. Follow it exactly.

        Output (strict JSON, no markdown fences, no extra keys):
        {
          "final_template_html": "<string>",  // template after applying user instructions and inlining required constants
          "page_summary": "<string>"          // thorough prose description of the PDF page; must be non-empty
        }

        Validation checklist before responding:
        - Tokens remaining in "final_template_html" match the original tokens minus those explicitly inlined as constants.
        - Repeat markers, <tbody> counts, row prototypes, and data-region attributes are unchanged unless the user asked to modify them.
        - HTML stays free of external resources/scripts and contains no accidental literal leak of unresolved token data.
        - "page_summary" is a detailed narrative (>1 sentence) that reports the exact values you inlined (including any best-guess readings), important metrics, unresolved fields, and uncertainties, without digressing into layout or styling trivia.
        - JSON is valid (UTF-8), strings escaped properly, and only the two required keys are present.




        """
    ).strip(),
    "user": dedent(
        """\
        {
          "template_html": "<HTML from step 3 with constants already inlined where obvious>",
          "schema": {
            "scalars": ["..."],
            "row_tokens": ["..."],
            "totals": ["..."]
          },
          "mapping_context": {
            "mapping": {
              "recipe_code": "recipes.recipe_code",
              "set_weight": "SUM(recipes.bin1_sp + recipes.bin2_sp)",
              "material_name": "INPUT_SAMPLE"
            },
            "mapping_override": { "material_name": "INPUT_SAMPLE" },
            "sample_tokens": ["material_name", "qty"],
            "token_samples": {
              "material_name": "Aluminum Oxide 45 Micron",
              "qty": "12.50 kg"
            }
          },
          "token_samples": {
            "plant_name": "North Works Plant 05",
            "location": "Boulder, CO"
          },
          "user_input": "Free-form instructions and corrections. Examples: 1) Change 'Reciepe' -> 'Recipe'; 2) Inline company_name using what you see on the PDF; 3) Add a bold border to the totals row; 4) Move the logo into the header; 5) Describe visible signatures in the summary."
        }
        """
    ).strip(),
}


def _build_data_uri(path: Path | None) -> str | None:
    if not path or not path.exists():
        return None
    try:
        encoded = base64.b64encode(path.read_bytes()).decode("utf-8")
    except Exception:  # pragma: no cover
        return None
    return f"data:image/png;base64,{encoded}"


def build_llm_call_3_5_prompt(
    template_html: str,
    schema: Mapping[str, Any] | None,
    user_input: str,
    page_png_path: str | None = None,
    mapping_context: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    schema_payload = dict(schema or {})
    payload: Dict[str, Any] = {
        "template_html": template_html,
        "schema": schema_payload,
        "user_input": user_input or "",
    }

    if mapping_context:
        mapping_context_clean = dict(mapping_context)
        payload["mapping_context"] = mapping_context_clean

    data_uri = _build_data_uri(Path(page_png_path) if page_png_path else None)
    payload_json = json.dumps(payload, ensure_ascii=False, indent=2)
    user_content = [
        {
            "type": "text",
            "text": f"USER (JSON payload):\n{payload_json}",
        }
    ]
    if data_uri:
        user_content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": data_uri,
                    "detail": "high",
                },
            }
        )

    messages = [
        {
            "role": "user",
            "content": user_content,
        }
    ]

    return {
        "system": LLM_CALL_3_5_PROMPT["system"],
        "messages": messages,
        "version": PROMPT_VERSION_3_5,
    }


LLM_CALL_4_SYSTEM_PROMPT = dedent(
    """\
    LLM CALL 4 - Step-5 Hand-off Builder
    You generate the structured payload that LLM Call 5 will consume. Your job is to:
    1. Interpret the user's instructions, template structure, and catalog context to finalize report logic and reshape rules.
    2. Produce a precise overview plus the Step-5 requirements bundle (datasets, parameter semantics, transformations).
    3. Emit a fully mapped contract object so Call 5 can compile SQL without guessing.
    You must:
    * Use only columns from the provided CATALOG allow-list. If a necessary column is absent, surface it via validation; never invent table/column names.
    * Preserve every dynamic token from the schema. Do not add, remove, or rename tokens; constants already inlined in HTML are not tokens.
    * Map every token with exactly one of:
        - `TABLE.COLUMN` (direct source, obeying the catalog allow-list),
        - `DATASET.COLUMN` (use dataset aliases produced by Step-5, e.g., `rows.row_token`, `totals.total_token`),
        - `PARAM:name` (header/parameter passthrough),
        - a SQL expression that is valid in the target dialect and references only catalog columns or dataset aliases (no `DERIVED:` prefix).
    * When you emit a SQL expression, reuse the identical expression inside `row_computed` / `totals_math` so the runtime stays consistent.
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
      "page_summary": "Detailed narrative of the PDF page from Step 3.5",
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
        "notes": "Domain notes from the user that matter in SQL"
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
    * Mapping Table: Markdown table Token -> source (TABLE.COLUMN / PARAM / SQL expression).
    * Join & Date Rules: tables, joins, filter semantics.
    * Transformations: explicit unpivot/union shapes, computed fields, totals rationale.
    * Parameters: required/optional, semantics, examples (note pass-through vs. filter behaviour).
    * Checklist for Step 5: bullet list of SQL requirements (column orders, filters, grouping, NULLIF guards, optional filter behaviour).
    Model self-check expectations:
    * `unknown_tokens` must be [] because every token is mapped.
    * `unknown_columns` must be [] because every column reference is in the catalog allow-list.
    * `token_coverage` should report 100% across scalars/rows/totals once mapping is complete.

    """
).strip()

LLM_CALL_5_PROMPT: Dict[str, str] = {
    "system": dedent(
        """\
        LLM CALL 5 - Generator Assets Emitter
        You are the Step-5 generator bundle author. Given the final template HTML, the complete Step-4 payload, and an optional reference image, you must emit every runtime artifact required by the Python pipeline.

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
            "dialect": "sqlite|postgres",
            "script": "-- HEADER SELECT --\n<SQL>\n-- ROWS SELECT --\n<SQL>\n-- TOTALS SELECT --\n<SQL>",
            "entrypoints": { "header": "<SQL>", "rows": "<SQL>", "totals": "<SQL>" },
            "params": { "required": ["<param>", ...], "optional": ["<param>", ...] }
          },
          "dialect": "sqlite|postgres",
          "invalid": false
        }
        Use [] for empty arrays, {} for empty objects, and "" for empty strings.

        Dialect rules:
        * sqlite: named params (:param); use NULLIF(x, 0) to prevent division by zero; FILTER not supported.
        * postgres: named params allowed; NULLIF/COALESCE allowed; FILTER allowed.

        Contract requirements:
        * Copy tokens, mappings, reshape rules, row_computed, totals_math, formatters, filters, date_columns, join, `order_by`, `row_order`, and notes from the Step-4 contract. Ensure every SQL expression matches between `mapping`, `row_computed`, and `totals_math`.
        * Mapping values must use only `TABLE.COLUMN`, `PARAM:name`, dataset aliases, or SQL expressions built from catalog/dataset columns (no prefixes or prose).
        * Populate any missing optional sections (e.g., empty objects/arrays) so the JSON validates against `contract_v2.schema.json`.
        * Join block must remain present with non-empty `parent_table`, `parent_key`, `child_table`, `child_key`. If there is no logical child table, set `child_table` equal to the parent and reuse the same key; never leave keys blank or null.
        * Mirror Step-4 `reshape_rules` exactly (strategy, datasets, alias ordering) and guarantee every rule carries a non-empty `"purpose"` summary. If Step-4 omitted it, synthesize a concise description (<= 15 words) before returning.
        * Ensure `order_by.rows` and `row_order` remain aligned (both arrays). If Step-4 provided only one of them, copy it to the other; if neither exists, emit `["ROWID"]` for both instead of leaving blanks.
        * Every token listed in `contract.tokens` must appear exactly once across the header/rows/totals SELECTs (no duplicate aliases or alternate spellings).

        SQL pack requirements:
        * Implement `reshape_rules`, joins, filters, parameter semantics, and math exactly as described by the contract and `step5_requirements`.
        * Provide a single consolidated `script` string that contains the header, rows, and totals SELECT statements in order. Include clear section markers such as:
          -- HEADER SELECT --
          ...select...
          -- ROWS SELECT --
          ...select...
          -- TOTALS SELECT --
          ...select...
        * Ensure each SELECT projects aliases exactly matching the tokens for that section; do not emit multiple SELECT statements per token or redundant aliases.
        * Whenever you aggregate the detail rows, materialize that result as a named CTE (e.g., `WITH long_bins AS (...), rows AS (...)`) and reuse it everywhere. Window functions must order by the CTE column names (never aliases defined later in the same SELECT), and the totals SELECT must read directly from that shared `rows` CTE rather than referencing an undefined table.
        * Provide an `entrypoints` object where each SELECT projects aliases exactly matching the contract token order (header → scalars, rows → row tokens, totals → totals tokens).
        * Reflect the contract join keys and filters in the SQL. Header, rows, and totals must reference the parent key columns in their FROM/JOIN clauses, respecting optional filter semantics.
        * Every entrypoint SQL must compile as-is. Return a single finalized SELECT per section; do not leave dangling `WITH` clauses, ellipses, comments like `-- TODO`, or placeholder text.
        * The header SELECT must read from the parent table (or a CTE derived from it) and apply the same predicates used by the row/totals datasets. `SELECT ...` without `FROM` is only acceptable when you project literals/params exclusively; otherwise include the table reference.
        * Rows entrypoints must select directly from the aggregated dataset defined in the reshape rules (e.g., the `rows` CTE) and end with a concrete `ORDER BY` that matches `row_order`.
        * Totals entrypoints must select from a concrete dataset (`rows`, `totals`, etc.) and may not reference undefined aliases or rely on spreadsheet math outside SQL.
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
          "reference_pdf_image": "OPTIONAL: data URI or URL to the page PNG/JPG used as visual reference",
          "key_tokens": ["plant_name", "recipe_code"],
          "dialect": "sqlite"
        }
        """
    ).strip(),
}

PROMPT_LIBRARY: Dict[str, str] = {
    **LLM_CALL_PROMPTS,
    "llm_call_3_5_system": LLM_CALL_3_5_PROMPT["system"],
    "llm_call_3_5_user": LLM_CALL_3_5_PROMPT["user"],
    "llm_call_4_system": LLM_CALL_4_SYSTEM_PROMPT,
    "llm_call_5_system": LLM_CALL_5_PROMPT["system"],
    "llm_call_5_user": LLM_CALL_5_PROMPT["user"],
}


def build_llm_call_4_prompt(
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
    """
    Build the payload for LLM Call 4 (contract builder + overview).
    """
    system_text = LLM_CALL_4_SYSTEM_PROMPT
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
        "system": system_text,
        "messages": messages,
        "version": PROMPT_VERSION_4,
    }


@lru_cache(maxsize=1)
def get_prompt_generator_assets() -> Dict[str, str]:
    """Return the system and user template strings for LLM CALL 5."""
    return dict(LLM_CALL_5_PROMPT)


__all__ = [
    "build_llm_call_3_prompt",
    "build_llm_call_3_5_prompt",
    "PROMPT_VERSION",
    "PROMPT_VERSION_3_5",
    "PROMPT_VERSION_4",
    "build_llm_call_4_prompt",
    "LLM_CALL_PROMPTS",
    "PROMPT_LIBRARY",
    "get_prompt_generator_assets",
]
