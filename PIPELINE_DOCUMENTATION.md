# Pipeline Documentation

## LLM CALL 3 -- Auto-mapping + Constant Discovery (v4)

- **Prompt version**: `llm_call_3_v7` (see `backend/app/services/prompts/llm_prompts.py`).
- **JSON schema**: `backend/app/services/utils/json_schemas/mapping_inline_v4.schema.json`.

### Inputs
- Refined HTML from verify/fix (`template_p1.html`).
- Strict catalog of allow-listed columns (`table.column`).
- Optional schema token map (`scalars`, `row_tokens`, `totals`).
- Reference page PNG hint (`reference_p1.png`) to ground constant detection.

### Model Output
- `mapping`: header/token -> `table.column`, `params.param_name`, `UNRESOLVED`, or a SQL expression referencing only allow-listed columns (no `DERIVED` wrappers).
- `constant_replacements`: object mapping placeholder tokens to literal text confidently inferred from the sample PDF.
- `meta`: ambiguity, unresolved tokens, aggregate hints, per-token confidence.

### Invariants (validated post-call)
- Mapping values must be either `UNRESOLVED` or a SQL fragment whose column references come from the catalog allow-list (legacy wrappers such as `DERIVED:` / `TABLE_COLUMNS[...]` are rejected). Parameter passthroughs should use the `params.param_name` form.
- Mapping keys must match tokens present in the template (excluding those promoted to constants).
- `constant_replacements` keys must exist in the template, must not overlap schema dynamic tokens, and must not resemble date/time fields.
- Applying replacements must not introduce new tokens; removed tokens must exactly equal the `constant_replacements` keys.
- Retry once on validation failure (validator feedback appended to the prompt); otherwise respond with HTTP 422.

### Artifacts & Manifest
- Applies `constant_replacements` locally to produce `template_p1.html` with constants inlined (atomic write under template lock).
- Writes `mapping_step3.json` (sanitized summary + `prompt_meta` + `raw_payload` preserving the original LLM response) and `constant_replacements.json` (token->value map).
- Manifest entry (`step: mapping_inline_llm_call_3`) records:
  - Files: `template_p1.html`, `mapping_step3.json`, `constant_replacements.json`.
  - Inputs include `mapping_inline_pre_html_sha256`, `mapping_inline_post_html_sha256`, `llm_call_3_cache_key`, plus catalog/schema hashes.
- `state_store` artifacts enriched with `mapping_step3_url` and `constant_replacements_url`.

### Caching
- Cache key = `sha256(pdf_hash + db_signature + template_pre_sha + prompt_version + catalog_sha + schema_sha)`.
- Short-circuit when `mapping_step3.json` exists and `prompt_meta.post_html_sha256` matches the current `template_p1.html` hash; emit stage status `cached` and replay persisted metadata.

## LLM CALL 3.5 -- Corrections & Summary (v2)

- **Prompt version**: `v2` (`build_llm_call_3_5_prompt` in `backend/app/services/prompts/llm_prompts.py`).
- **JSON schema**: `backend/app/services/utils/json_schemas/llm_call_3_5.schema.json`.

### Inputs
- Post-mapping HTML (`template_p1.html`, already containing Step 3 constants).
- `mapping_step3.json` (provides the mapping map + unresolved tokens).
- Optional schema token map (`schema_ext.json`).
- User free-form instructions (`user_input`).
- Optional PNG hint (`reference_p{n}.png`) for the referenced page.

### Model Output
- `final_template_html`: template after applying user-directed edits and inlining tokens flagged as constants (for example `INPUT_SAMPLE` mappings).
- `page_summary`: thorough prose description of the referenced PDF page (layout, copy, tables, anomalies) used to inform downstream contract building.

### Invariants (validated post-call)
- Final token set must equal the original tokens minus those whose mappings were marked `INPUT_SAMPLE` (or otherwise flagged as constants). New tokens are rejected.
- No structural drift: repeat-block markers, `<tbody>` row prototypes, and `data-region` attributes remain unchanged unless the user explicitly requested the edit.
- Page summary must be non-empty prose; retry once on schema/invariant failure (feedback appended to prompt) before returning HTTP 422 / emitting an error.

### Artifacts & Manifest
- Overwrites `template_p1.html` with `final_template_html` under lock/atomic write.
- Writes `page_summary.txt` (verbatim summary) and `stage_3_5.json` (raw response + metadata).
- Manifest entry (`step: mapping_corrections_preview`) records the updated files plus `stage_3_5_cache_key`, `template_pre_sha256`, `template_post_sha256`, `mapping_sha256`, and `user_input_sha256`.
- `state_store` artifacts enriched with `page_summary_url`.

### Caching
- Cache key = `sha256(template_pre_sha + mapping_sha + user_input_sha + prompt_version + model_id)`.
- If `stage_3_5.json` exists with matching cache key and the current `template_p1.html` hash equals the recorded `final_template_sha256`, return cached results and emit stage events with `cache_hit=true`.

## Mapping Approval & Contract Build (Post 3.5)

- **Input expectations**: `template_p1.html` already reflects the final template from Call 3.5. `report_final.html` may exist from prior runs but is optional.
- **Approved mapping persistence**: `mapping_pdf_labels.json` is written as the canonical map (list of objects with `header`, `placeholder`, `mapping`). The manifest for the step records `mapping_pdf_labels.json`, `template_p1.html`, `report_final.html` (if present), the thumbnail, and any contract artifacts.
- **No extra LLM fills**: Step 1/Step 2 "auto-fill" calls have been removed. The approve flow no longer edits HTML; it simply validates/saves the mapping, keeps the existing template HTML, and locks the directory while downstream artifacts are refreshed.
- **Contract build (LLM Call 4)**: `build_or_load_contract_v2` runs immediately after mapping persistence (subject to the caller providing a database connection). The existing template HTML (prefer `report_final.html`, fallback to `template_p1.html`) is passed directly to the contract builder. Call 4 produces the contract blueprint in-memory/metadata, but the persisted `contract.json` is authored later by the generator step (LLM Call 5).
- **Page summary hand-off**: `page_summary.txt` (and the cached text in `stage_3_5.json`) is supplied to Call 4 so the contract builder can reason about layout details the HTML alone may not capture.
- **Outputs**: The streaming response still includes `final_html_url`, `template_html_url`, thumbnail URL (if rendering succeeds), and `contract_stage` metadata summarising Call 4. `token_map_size` now reports zero because no further token removal occurs during approval.
