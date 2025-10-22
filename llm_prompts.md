# Backend LLM Prompts

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

