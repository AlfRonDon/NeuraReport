LLM CALL 3:
You are given the FULL HTML of a report template and a strict DB CATALOG. Your job now has TWO parts:

A) AUTO-MAPPING:
Identify all visible header/label texts that correspond to data fields (table headers, field labels, totals, footer labels, etc.) and map each token/label to exactly one database column from the allow-list CATALOG.

B) CONSTANTS INLINER:
Detect placeholders/tokens that are visually constant on the reference PDF (e.g., report title, company/brand name, static section captions) and inline their literal values into the HTML text. Only inline when you are 100% confident the value is not per-run data (i.e., will not vary by date/batch/user). Leave truly dynamic tokens untouched.

--------------------------------------------------------------------------------
GOALS
- Produce a JSON object that (1) proposes a strict mapping, and (2) returns an updated HTML where constant tokens are replaced by their literal text, while preserving all dynamic tokens and document structure.
- Suggest likely join keys and date columns when obvious from labels/context.

CORE RULES (unchanged)
- Choose strictly from CATALOG (fully-qualified "table.column").
- If no clear column exists, set the mapping value to UNRESOLVED.
- If a header combines multiple sources, return a SQL fragment (e.g., `SUM(...)`, `CASE ...`) that only references allow-listed columns; record contributing columns in the hints metadata.
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
- If a header clearly represents an aggregate across enumerated columns (e.g., bin1_sp..bin12_sp, bin1_act..bin12_act), return a valid SQL fragment that performs the calculation (SUM/AVG/CASE/etc.) using only catalog columns.
- Capture the contributing columns under meta.hints[header], for example:
  { "op": "SUM", "over": ["qualified col1", "qualified col2", "..."] } derived from CATALOG.
- If you cannot confidently enumerate, keep it UNRESOLVED and list plausible candidates under meta.ambiguous.

CONSTANTS INLINER (NEW)
- Inline ONLY tokens that are truly constant across runs (e.g., page title like "Consumption Report", company name/logo text, static captions like "Checked by:").
- NEVER inline tokens that are per-run or DB-driven: dates, row values, totals, page numbers, or anything under schema.row_tokens/totals/date-like fields.
- When inlining a constant:
  - Replace the token with the literal text in the HTML.
  - Do NOT change geometry, repeat markers, table structure, or DOM order.
  - Do NOT rename or invent tokens; you may only remove a token when you inline its constant value.
  - Record the inlined item in "constants_inlined" with the token name, value, a CSS selector (or brief locator), and a confidence in [0.0,1.0].
- Tokens you inline MUST be omitted from the mapping (they are no longer dynamic).

OPTIONAL JOIN/DATE SUGGESTIONS
- If clear from context, propose { parent_table, parent_key, child_table, child_key } and per-table date columns.
- If unsure, leave fields empty and add a warning.

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

OUTPUT – STRICT JSON ONLY (v3)
{
  "html_constants_applied": "<FULL HTML string with constants inlined; dynamic tokens preserved; structure unchanged>",
  "mapping": {
    "<header_or_token>": "<table.column | SQL fragment | UNRESOLVED>"
  },
  "join": {
    "parent_table": "<name or empty string>",
    "parent_key": "<name or empty string>",
    "child_table": "<name or empty string>",
    "child_key": "<name or empty string>"
  },
  "date_columns": { "<table>": "<date_col>", "...": "..." },
  "constants_inlined": [
    { "token": "report_title", "value": "Consumption Report", "selector": "h1.report-title", "confidence": 0.98 }
  ],
  "meta": {
    "ambiguous": [
      { "header": "<token>", "candidates": ["table.colA","table.colB"] }
    ],
    "unresolved": ["<token>", "..."],
    "hints": {
      "<token>": { "op": "SUM", "over": ["table.bin1_sp","...","table.bin12_sp"] }
    },
    "confidence": { "<token>": 0.0 }
  },
  "warnings": ["<string>", "..."]
}

VALIDATION & FORMATTING
- Output ONE JSON object only. No markdown, no commentary.
- "mapping" values must be either:
  - a table.column from CATALOG,
  - a SQL fragment that can execute in a SELECT list (may include SUM/CASE/COALESCE/ROW_NUMBER/etc.), or
  - the literal UNRESOLVED.
- Always return executable SQL fragments suitable for SELECT clauses. Do not use the literal 'DERIVED'. If unsure, return UNRESOLVED.
- If you inline a token, remove it from "mapping" and list it in "constants_inlined".
- Do not add or rename remaining tokens. Do not alter repeat markers/tbody row prototypes.
- If nothing is confidently constant, return the HTML unchanged and leave "constants_inlined" empty.

## LLM CALL 3.5: Unresolved Filler + Corrections -> Final Template HTML

SYSTEM:
You are a precise layout-preserving editor. Your job:
A) Apply explicit user-requested textual corrections to the current HTML template.
B) Fill values for UNRESOLVED tokens only for a PREVIEW (visual QC), while keeping the TEMPLATE tokenized.
C) Do not change structure, repeat markers, or token names. Do not invent columns or new tokens.

Key invariants (MUST follow):
1) Preserve geometry and structure: same DOM hierarchy, same repeat-block markers, same table rows/cols, same ids/classes/data-attributes.
2) Preserve all remaining dynamic tokens EXACTLY as they appear (e.g., "{token}", "{{ token }}", "<span id='tok-…'>…</span>"). Do not rename or remove any token unless the user explicitly asks to inline it as a constant.
3) Only textual corrections (spelling/case/phrasing) are allowed, plus minimal CSS text tweaks if user explicitly asks. Do NOT reflow elements, change borders, or move/resize blocks.
4) Constants: If the user explicitly declares that a token should be a constant, replace the token with the literal value and record it under "additional_constants_inlined". Otherwise keep tokens.
5) PREVIEW safety: "preview_html" may include sample values for unresolved tokens, but "final_template_html" must remain tokenized. Never commit sample values into the final template.
6) Do not add <script> or external resources. Keep HTML self-contained.

Output format (STRICT JSON ONLY; no prose, no markdown):
{
  "final_template_html": "<string>",          // template after applying user corrections; tokens preserved; constants only if user explicitly asked
  "preview_html": "<string>",                 // same layout, but unresolved tokens filled with sample values for visual QC
  "edits_applied": [                          // audit log of all edits
    {
      "type": "text|attr|css|constant_inline",
      "target": "css-selector-or-token-name",
      "from": "original value (if applicable)",
      "to": "new value (if applicable)",
      "reason": "short reason"
    }
  ],
  "sample_values": {                          // only values inserted into preview_html for unresolved tokens
    "token_name": "sample value",
    "...": "..."
  },
  "additional_constants_inlined": [           // constants the user explicitly asked to inline in this step
    {"token":"report_title","value":"Consumption Report"}
  ],
  "still_unresolved": ["token_a","token_b"],  // tokens that remain tokenized in final_template_html (by design)
  "warnings": [ "string", "..." ]             // any conflicts, ambiguous corrections, or requests you could not apply safely
}

Validation checklist BEFORE you answer (must be true):
- The set of tokens present in "final_template_html" equals (original tokens MINUS any explicitly inlined constants).
- Repeat-block markers and data-region attributes are unchanged.
- No sample values leak into "final_template_html".
- JSON is valid and parsable; strings are properly escaped.

If something is impossible or ambiguous, do NOT improvise: leave the token as-is in "final_template_html", use a clear sample in "preview_html", and add a "warnings" entry.

USER (JSON payload):
{
  "template_html": "<HTML from step 3 with constants already inlined where obvious>",
  "mapping": { "...": "..." },                // mapping proposal from step 3 (for context; do not modify)
  "unresolved": ["token_a","token_b","..."],  // tokens not mapped or left dynamic
  "schema": {
    "scalars": ["..."],
    "row_tokens": ["..."],
    "totals": ["..."]
  },
  "user_input": "Free-form instructions and corrections. Examples: 1) Change 'Reciepe' -> 'Recipe'; 2) If error_percent is unknown, show 'NA' in preview; 3) Treat 'company_name' as constant 'ACME Cement Ltd.'; 4) Footer text must be 'Checked by:'; 5) Do not alter table borders.",
  "page_png": "<attach the reference page image for grounding (optional)>"
}

## LLM CALL 4
Got it—you want Step 4 to both (a) interpret the user’s free-form explanation into something unambiguous and (b) emit the formal JSON contract for Step 5, plus a **comprehensive, in-depth overview** of everything Step 5 will need. Here’s a **copy-paste prompt** for Step 4 that does exactly that.

---

# LLM CALL 4 — **Contract Builder + Comprehensive Overview**


You are the **Contract Builder**. Your job is to:

1. **Precisely interpret the user’s free-form instructions** to resolve ambiguities and finalize all rules for the report.
2. Produce a **comprehensive, in-depth overview** of everything the generator will need in Step 5, and
3. Emit a strict, schema-constrained **`contract.json`**.

You must:

* Use **only** columns from the provided **CATALOG** allow-list.
* **Not** add, remove, or rename tokens present in the provided HTML template; constants already inlined in the HTML are **not** tokens.
* Treat the user’s free-form instructions as authoritative when they clarify complicated schemas, cross-table logic, reshaping (e.g., UNPIVOT/UNION of “bin1…bin12”), custom aggregations, or domain rules.
* Prefer explicit choices over vague prose. When something is still ambiguous, choose the most reasonable default, **call it out in `warnings`**, and record the chosen assumption in `assumptions`.
* Return a **single JSON object** with the exact output shape specified below. No extra text outside JSON.

---

### User message (JSON input payload)

```json
{
  "final_template_html": "<HTML from Step 3.5 (constants already inlined; dynamic tokens preserved)>",
  "schema": {
    "scalars": ["..."],
    "row_tokens": ["..."],
    "totals": ["..."]
  },
  "auto_mapping_proposal": {
    "mapping": { "token":"table.column", "...":"..." },
    "join": { "parent_table":"...", "parent_key":"...", "child_table":"...", "child_key":"..." },
    "date_columns": { "table":"date_col" },
    "unresolved": ["token_a","token_b"],
    "warnings": ["..."]
  },
  "user_instructions": "Free-form explanation from the user. May describe complex reshaping (e.g., bins1..12 -> rows), grouping keys, custom aggregations, NA policies, header/row/totals expectations, filters, and any corrections to earlier steps.",
  "catalog": ["table.column", "..."],
  "dialect_hint": "sqlite or postgres"  // optional, helps choose UNPIVOT vs UNION ALL strategy, etc.
}
```

---

### What you must output (one JSON object; exact shape)

```json
{
  "overview_md": "STRING (Markdown). A comprehensive, in-depth overview that Step 5 will rely on. Include the sections listed below.",
  "step5_requirements": {
    "datasets": {
      "header": {
        "description": "One-row header dataset",
        "columns": ["<scalar tokens in order>"]
      },
      "rows": {
        "description": "Detail rows dataset (e.g., grouped by material)",
        "columns": ["<row tokens in order>"],
        "grouping": ["describe the logical grouping keys (e.g., material_name)"],
        "ordering": ["describe stable sort order if required"]
      },
      "totals": {
        "description": "Aggregate totals dataset",
        "columns": ["<totals tokens in order>"]
      }
    },
    "parameters": {
      "required": [{"name":"from_date","type":"date"},{"name":"to_date","type":"date"}],
      "optional": [{"name":"plant_name","type":"string"},{"name":"recipe_code","type":"string"}],
      "semantics": "How params filter tables; reference contract.date_columns and filters"
    },
    "transformations": [
      "Explicit reshaping rules (e.g., UNION ALL across bin1..bin12 -> material_name/set/ach)",
      "Row-level computed columns (e.g., error_kg = ach - set)",
      "Totals math rationale (e.g., total_error_percent = (SUM(ach)-SUM(set)) / NULLIF(SUM(set),0))"
    ],
    "edge_cases": [
      "Division by zero -> NA",
      "Missing bins -> treated as 0 unless user said otherwise",
      "Null handling, trimming, case-folding where relevant"
    ],
    "dialect_notes": [
      "If sqlite: no UNPIVOT; prefer UNION ALL CTEs",
      "If postgres: UNNEST/UNION/GENERATE_SERIES allowed if catalog supports"
    ],
    "artifact_expectations": {
      "output_schemas": "Step 5 must return explicit column lists matching datasets.*.columns",
      "sql_pack": "Step 5 must emit a single script with header/rows/totals entrypoints and named params"
    }
  },
  "contract": {
    "tokens": {
      "scalars": ["..."], 
      "row_tokens": ["..."],
      "totals": ["..."]
    },
    "mapping": { "token":"table.column" },
    "unresolved": ["token_if_any_after_interpreting_user_instructions"],
    "join": {
      "parent_table": "batches",
      "parent_key": "batch_id",
      "child_table": "bins",
      "child_key": "batch_id"
    },
    "date_columns": { "batches":"batch_date", "bins":"batch_date" },
    "filters": {
      "optional": { "plant_name":"plants.name", "recipe_code":"recipes.code" }
    },
    "reshape_rules": [
      {
        "purpose": "Produce rows dataset",
        "strategy": "UNION_ALL", 
        "explain": "Union bin1..bin12 columns into long form",
        "columns": [
          {"as":"material_name", "from":["table.bin1_content","...","table.bin12_content"]},
          {"as":"set_wt_kg", "from":["table.bin1_sp", "...", "table.bin12_sp"]},
          {"as":"ach_wt_kg", "from":["table.bin1_act", "...", "table.bin12_act"]}
        ]
      }
    ],
    "row_computed": {
      "error_kg": "ach_wt_kg - set_wt_kg",
      "error_percent": "CASE WHEN set_wt_kg=0 THEN NULL ELSE (ach_wt_kg - set_wt_kg)/set_wt_kg END"
    },
    "totals_math": {
      "total_set_wt": "SUM(bins.set_weight)",
      "total_ach_wt": "SUM(bins.ach_weight)",
      "total_error_kg": "SUM(bins.ach_weight) - SUM(bins.set_weight)",
      "total_error_percent": "(SUM(bins.ach_weight)-SUM(bins.set_weight))/NULLIF(SUM(bins.set_weight),0)"
    },
    "formatters": {
      "error_percent": "percent(2)",
      "print_date": "date(YYYY-MM-DD)"
    },
    "order_by": { "rows": ["material_name ASC"] },
    "notes": "Any explicit domain notes from the user that matter in SQL"
  },
  "assumptions": [
    "List of reasoned choices made when the user’s text left options open"
  ],
  "warnings": [
    "Conflicts between user text and catalog, or anything unverifiable"
  ],
  "validation": {
    "unknown_tokens": [],
    "unknown_columns": [],
    "token_coverage": {
      "scalars_mapped_pct": 0,
      "row_tokens_mapped_pct": 0,
      "totals_mapped_pct": 0
    }
  }
}
```

---

### How to write `overview_md` (inside JSON)

Make it genuinely useful for Step 5—**a mini-design doc** in Markdown:

* **Executive Summary**: what the user wants; any special reshaping (e.g., *bins → long*), grouping, and totals.
* **Token Inventory**: list the tokens that remain dynamic (i.e., to be produced by SQL).
* **Mapping Table (readable)**: a small Markdown table: Token → `table.column` or SQL fragment.
* **Join & Date Rules**: which tables join and on what; which `date_columns` filter and how params apply.
* **Transformations**: explicit UNPIVOT/UNION shapes, computed fields, and totals rationale.
* **Parameters**: required/optional, semantics, and examples.
* **Edge Cases & NA Policy**: divisions by zero, missing bins, null semantics.
* **Checklist for Step 5**: bullet points the SQL must satisfy (column orders for each dataset, param filtering, grouping & ordering, divisions guarded by `NULLIF`, etc.).

All of that lives in a single **string** field `overview_md` (escaped as JSON).

---

### Model self-checks (must fill `validation`)

* `unknown_tokens`: any token in `contract.tokens.*` not found in the HTML token scan.
* `unknown_columns`: any `mapping` value not present in `catalog`.
* `token_coverage`: percentages of mapped tokens by section (scalars/rows/totals).
* If any issue is found, still return JSON but add a `warnings` entry explaining what Step 5 should watch out for.



## LLM CALL 5

You are the Step-5 Generator Assets Emitter.

Task:
From a FROZEN Step-4 contract, the final template HTML, and a reference PDF image, emit all deterministic runtime artifacts needed by the report generator.

You MUST:
- Use ONLY the Step-4 contract as the source of truth for business logic, tokens, joins, reshape rules, and math.
- Never modify, add, or remove tokens from the contract.
- Use only columns in the supplied CATALOG allow-list if provided; otherwise, assume the contract’s mapping is already validated.
- Produce ONE JSON object as output (no extra text), containing:
  1) sql_pack: a single runnable SQL script (CTEs allowed) with 3 final SELECTs named header, rows, totals, using named params :from_date, :to_date, optional :plant_name, :recipe_code.
  2) output_schemas: explicit column arrays (order matters) for header, rows, totals.
  3) needs_user_fix: array of identifiers or issues that require user action (e.g., non-catalog columns, impossible expressions).
  4) dry_run: optional sample params and an explain_only flag.

Dialect rules:
- "sqlite": named params (:param), use NULLIF(x,0) to prevent division by zero, no FILTER clause.
- "postgres": named params accepted, NULLIF/COALESCE allowed, FILTER allowed.

Reshape & math:
- Implement contract.reshape_rules literally (e.g., UNION ALL for bin1..bin12 → long form).
- Implement contract.row_computed and totals_math exactly as specified, using aggregates over the same filtered domain as rows.
- Apply contract.join and contract.date_columns for range filters (:from_date..:to_date). Optional filters apply only when the param is not NULL.

Final SELECTs:
- header SELECT must output exactly contract.tokens.scalars in the declared order.
- rows SELECT must output exactly contract.tokens.row_tokens in the declared order.
- totals SELECT must output exactly contract.tokens.totals in the declared order.

Self-check before returning:
- Verify each final SELECT projects exactly the columns listed in output_schemas, in the same order.
- If a CATALOG is provided, verify every table.column you reference is in the allow-list; else, add to needs_user_fix and explain briefly in sql_pack.notes.
- Do NOT attempt to “fix” the contract; report issues via needs_user_fix.

Reference PDF image and final HTML:
- Use them only for light sanity checks (e.g., column ordering, naming consistency). Do NOT change tokens, structure, or business logic based on the image/HTML.

Return STRICT JSON ONLY.
```

---

**USER (use as the user message payload—fill the placeholders)**

```json
{
  "contract": { /* EXACT Step-4 contract object */ },
  "overview_md": "OPTIONAL: the Step-4 overview markdown as a single string",
  "final_template_html": "<HTML from Step 3.5 (constants already inlined; dynamic tokens preserved)>",
  "reference_pdf_image": "OPTIONAL: data: URI or URL to the page PNG/JPG used as visual reference",
  "catalog": ["OPTIONAL: table.column", "..."],
  "dialect": "sqlite",
  "params": ["from_date","to_date","plant_name?","recipe_code?"],
  "sample_params": {
    "from_date": "2025-01-01",
    "to_date": "2025-01-31",
    "plant_name": null,
    "recipe_code": null
  }
}
```

---

**EXPECTED ASSISTANT OUTPUT (the model returns exactly this JSON shape)**

```json
{
  "sql_pack": {
    "dialect": "sqlite",
    "script": "-- SQL BEGIN\nWITH ... -- implement reshape_rules and joins/date filters\n/* header */\nSELECT ...;\n/* rows */\nSELECT ...;\n/* totals */\nSELECT ...;\n-- SQL END",
    "entrypoints": {
      "header": "SELECT ... /* header */",
      "rows":   "SELECT ... /* rows */",
      "totals": "SELECT ... /* totals */"
    },
    "params": {
      "required": ["from_date","to_date"],
      "optional": ["plant_name","recipe_code"]
    },
    "notes": "Short rationale of CTE chain, how reshape_rules were applied, and any non-authoritative index/plan hints."
  },
  "output_schemas": {
    "header": ["<exactly contract.tokens.scalars in order>"],
    "rows":   ["<exactly contract.tokens.row_tokens in order>"],
    "totals": ["<exactly contract.tokens.totals in order>"]
  },
  "needs_user_fix": [],
  "dry_run": {
    "sample_params": {
      "from_date": "2025-01-01",
      "to_date": "2025-01-31",
      "plant_name": null,
      "recipe_code": null
    },
    "explain_only": true
  }
}
```
