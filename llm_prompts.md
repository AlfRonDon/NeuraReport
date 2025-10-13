# Backend LLM Prompts

## backend/app/services/templates/TemplateVerify.py:170 – request_schema_for_page (`template_schema_page`)
- Role: user
- Message text:
```text
Infer a placeholder schema for this PDF page. Identify dynamic fields and repeating blocks. Return ONLY compact JSON with keys: { 'scalars': { ... }, 'blocks': { 'rows': ['sl','name','set','ach','err','errp'] }, 'notes': '...' }. Do not generate HTML in this step.
```
- Additional content:
  - `image_url` encoded from `page_png`

## backend/app/services/templates/TemplateVerify.py:199 – request_initial_html (`template_initial_html`)
- Role: user
- Message text:
```text
Produce a COMPLETE, self-contained HTML document (<!DOCTYPE html> …) with inline <style>. It must visually photocopy the given PDF page image as closely as possible. Mirror fonts, spacing, borders, alignment, and table layouts. Tables must use border-collapse, 1px borders, and table-layout: fixed for neat alignment.

SCHEMA USAGE
- Use ONLY placeholders from the provided SCHEMA exactly as written (same braces, same names). - If a value is not in SCHEMA, render it as literal text. - If a token exists in SCHEMA but not on this page, omit it.

REPEATABLE BLOCK (edge case)
- If the page clearly contains repeating sections (visually identical blocks stacked vertically), output ONE prototype of that block wrapped exactly as:
<!-- BEGIN:BLOCK_REPEAT batches -->
<section class='batch-block'>…</section>
<!-- END:BLOCK_REPEAT -->
- Place header/footer OUTSIDE these markers. - Do NOT clone or duplicate multiple blocks.

ROW PROTOTYPES
- For tables with repeating rows, output headers plus a single <tbody><tr>…</tr></tbody> row prototype. - Keep any final summary/total row if it exists.

STRUCTURE & CSS
- Support flowing content with unlimited repeats: .batch-block { break-inside: avoid; page-break-inside: avoid; margin: 6mm 0; } - Avoid fixed heights or absolute positioning (except optional fixed header/footer if persistent across pages).  Do not put contents in tables if they are not present in the original PDF - Preserve clean typography and mirrors the page ; numbers right-aligned where appropriate.

- Reproduce what is visible—draw ONLY the rules/lines that exist in the image. Default to no borders and transparent backgrounds; add borders per edge only where a line is visible. No shaded headers, zebra-stripes, or gray fills unless clearly present. Use table markup for ONLY for true grids and structured data (never div-based). Use borderless tables or simple divs for key/value areas. Avoid unnecessary nested tables or enclosing frames.
- Flow is printable: @page A4 with sensible margins; avoid fixed heights and absolute positioning; OUTPUT RULES
- No lorem ipsum or sample values. - No external resources. - No comments except the repeat markers if applicable. - Return RAW HTML only (no markdown fences, no explanations).
```
- Additional content:
  - Text segment `SCHEMA:\n{schema_str}`
  - `image_url` encoded from `page_png`

## backend/app/services/templates/TemplateVerify.py:267 – request_fix_html (`template_fix_html`)
- Role: user
- Message text:
```text
Compare these images: REFERENCE (PDF page) vs RENDER (current HTML). SSIM={{ssim_value:.4f}}.
Goal: refine the provided HTML/CSS so the render becomes a near-perfect PHOTOCOPY of the reference.

STRICT RULES
- Do NOT rename, add, remove, or move SCHEMA placeholders; keep all tokens exactly as in the current HTML.
- Do NOT change the number of repeating sections or table rows that currently exist in the HTML.
- If repeat markers (e.g., <!-- BEGIN:BLOCK_REPEAT ... -->) are present, keep them unchanged with exactly one prototype inside.
- Prefer CSS edits; only introduce minimal HTML wrappers (e.g., structural containers/colgroups) if strictly necessary to achieve alignment—never alter tokens.

VISUAL MATCHING (inference-based)
Identify and correct EVERY visible discrepancy between reference and render at any scale. Infer and adjust geometry, proportions, typography and line metrics, borders/line weights, grid/column structure, text/number alignment, intra/inter-block spacing, pagination behavior, page frame presence, and header/footer placement. Derive all values from the reference image; do not assume defaults. The result should be indistinguishable from the reference when printed.

OUTPUT
- Return FULL HTML (<!DOCTYPE html> …) with inline <style> only—no external resources.
- No markdown, no commentary, no sample data.
- Preserve existing IDs/classes/markers; add only what is minimally required for fidelity.
```
- Additional content:
  - Text segment `SCHEMA:\n{schema_str}`
  - Text segment `{current_html}`
  - `image_url` encoded from `ref_png`
  - `image_url` encoded from `render_png`

## backend/app/services/mapping/HeaderMapping.py:116 – llm_pick_with_chat_completions_full_html (`mapping_full_html`)
- Role: user
- Message text:
```text
Task:
You are given the FULL HTML of a report template. Identify all visible header/label texts that correspond
to data fields (table headers, field labels, totals, etc.). For repeating sections (e.g., tables, cards),
infer the per-row/per-item labels from the structure.

Goal:
Map each discovered header/label to exactly one database column from the allow-list CATALOG.

Rules:
- Choose strictly from CATALOG (fully-qualified 'table.column').
- If no clear column exists, set the value to UNRESOLVED.
- Do not invent headers or duplicate mappings.
- Prefer concise, human-visible labels (strip punctuation/colons).

Inputs:
[FULL_HTML]
{html_for_llm}

[CATALOG]
{json.dumps(catalog_list, ensure_ascii=False)}

Return strict JSON only in this shape:
{
  "<header>": "<table.column or UNRESOLVED>",
  ...
}
```
- Additional content:
  - Optional `image_contents` entries passed through when available

## backend/app/services/mapping/auto_fill.py:458 – run_after_approve `step1_system` (`auto_fill_step1`)
- Role: system
- Message text:
```text
You are a meticulous HTML filler. Start from the provided HTML and return it EXACTLY as received except for the allowed edits below.
Allowed edits:
  • Replace placeholders whose mapping is exactly "pick from input sample" with the exact VERBATIM text from the PDF image(s).
  • Fill obvious non-JSON blanks (underscores, 'XXXX', '<< >>') using the PDF as reference.
Forbidden edits:
  • Do not touch any other placeholders (including UNRESOLVED or DB-mapped tokens).
  • Do not alter page-number placeholders.
  • Do not add/remove/reorder tags, attributes, CSS, JS, whitespace, comments, or structure.
  • Do not inject explanations or extra markup.
If there is nothing to fill, output the original HTML unchanged.
Return ONLY the HTML between these markers:
<!--BEGIN_HTML-->
...html...
<!--END_HTML-->
```
- Additional content: none

## backend/app/services/mapping/auto_fill.py:474 – run_after_approve `step1_user` (`auto_fill_step1`)
- Role: user
- Message text:
```text
Inputs follow.

[HTML_INPUT]
{full_html}

[MAPPINGS_JSON]
{mappings_json_text}

Tokens to FILL (exactly these; leave all other placeholders untouched):
{json.dumps(pick_sample_tokens, ensure_ascii=False)}

Page-number placeholders to PROTECT:
{json.dumps(page_tokens_protect, ensure_ascii=False)}

Strict rules:
• Only replace literal tokens {token} or {{token}} that are listed above.
• For non-JSON blanks (underscores, 'XXXX', '<< >>'), copy the exact characters from the PDF region near the label.
• Do not edit any <section class="batch-block"> ... </section>.
• Preserve whitespace, tag order, attributes, CSS, JS, and all other placeholders exactly.
• Do not modify anything that looks like a page number.
• If you cannot confidently fill a value, leave the token unchanged.
```
- Additional content:
  - Optional `image_contents` entries passed through when provided

## backend/app/services/mapping/auto_fill.py:521 – run_after_approve `step2_system` (`auto_fill_step2`)
- Role: system
- Message text:
```text
You are a precise HTML editor. Start from the provided HTML and return it EXACTLY as received except for filling the UNRESOLVED placeholders listed.
Use these sources of truth (in order):
  1. The user's free-form values.
  2. If the user does not mention a token but the PDF clearly shows the value, copy it from the PDF to match formatting.
Rules:
  • Replace only literal tokens {token} or {{token}} whose mapping is UNRESOLVED.
  • Preserve all other content, tokens, whitespace, attributes, CSS, JS, and structure exactly as-is.
  • Do not modify page-number placeholders.
  • Do not add commentary or extra markup.
If no UNRESOLVED tokens can be filled, return the HTML unchanged.
Return ONLY the HTML between these markers:
<!--BEGIN_HTML-->
...html...
<!--END_HTML-->
```
- Additional content: none

## backend/app/services/mapping/auto_fill.py:538 – run_after_approve `step2_user` (`auto_fill_step2`)
- Role: user
- Message text:
```text
User free-form input (values to apply to UNRESOLVED placeholders):
{(user_values_text or '').strip()}

[HTML_INPUT]
{html_step1}

[MAPPINGS_JSON]
{mappings_json_text}

UNRESOLVED placeholders (replace only these):
{json.dumps(unresolved_tokens, ensure_ascii=False)}

Page-number placeholders to LEAVE ALONE:
{json.dumps(page_tokens_protect, ensure_ascii=False)}

Instructions:
• Map the user's text to these UNRESOLVED tokens by label/meaning.
• If the user omitted a token but the PDF shows a single clear value, copy it verbatim.
• Preserve whitespace, structure, and every other placeholder exactly as-is.
• Do not edit <section class="batch-block"> ... </section>.
• Do not modify anything that looks like a page number.
• If unsure about a value, leave the token unchanged.
```
- Additional content:
  - Optional `image_contents` entries passed through when provided

## backend/app/services/mapping/auto_fill.py:719 – build_or_load_contract (`contract_build`)
- Role: user
- Message text:
```text
You are given three inputs:

[SCHEMA_INFO]
{schema_info}

[FULL_HTML]
{full_html_for_llm}

[PDF_IMAGE]
(see attached image)

Goal:
From SCHEMA_INFO, FULL_HTML (entire page layout), and the PDF image, return everything needed to fill the batch details
(header + row template + per-batch totals). The layout may have one or more repeating regions (e.g., table rows, cards).

Return STRICT JSON ONLY with these keys:
{
  "mapping": { "<token>": "table.column" },
  "join": { "parent_table": "...", "parent_key": "...", "child_table": "...", "child_key": "..." },
  "date_columns": { "<table>": "<date_or_timestamp_col>" },
  "header_tokens": ["<token>"],
  "row_tokens": ["<token>"],
  "totals": { "<token>": "table.column" },
  "row_order": ["<primary_order_col>", "ROWID"],
  "literals": { "<token>": "<verbatim text from PDF if not DB-backed>" }
}

Rules (contract you must satisfy):
• Use ONLY tables/columns present in SCHEMA_INFO. Do NOT invent.
• Tokens must match EXACTLY as they appear in the HTML (without {{ }}).
• Scoping:
  - Every token in header_tokens must either map to join.parent_table via mapping or appear in literals.
  - Every token in row_tokens must map to join.child_table via mapping.
  - Every token in totals must map to a NUMERIC column of join.child_table (to be SUM(...) per batch).
• date_columns must include entries for every table referenced in mapping or totals, and MUST include both
  join.parent_table and join.child_table.  (If there is only one table, the same table appears in both.)
• row_order[0] must be a column from join.child_table (e.g. its date/time or sequence); keep "ROWID" last-resort fallback.
• mapping values must be simple "table.column" identifiers (no expressions).
• literals is ONLY for fixed header text visible in the PDF image that is NOT backed by the DB.

Do NOT include tokens that are not present in HTML. Avoid duplicates.

Output formatting requirements:
Output ONLY the JSON object, no prose, no markdown, no comments. Use valid JSON.
```
- Additional content:
  - Optional `IMAGE_CONTENTS` entries passed through when provided

