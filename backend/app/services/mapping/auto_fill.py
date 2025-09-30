# auto_fill.py
from __future__ import annotations

import os, re, json, base64, time
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import HTTPException

# Reuse existing utilities
from ..templates.TemplateVerify import get_openai_client, pdf_to_pngs
from ..mapping.HeaderMapping import get_parent_child_info


# ───────────────────────────────────────────────────────────────────────────────
# Small HTML helpers
# ───────────────────────────────────────────────────────────────────────────────

def _find_or_infer_batch_block(html: str):
    """
    If you already have a real implementation elsewhere, import it and remove this fallback.
    This fallback just looks for <section class="batch-block">...</section>.
    """
    m = re.search(r'(?is)<section\s+class=["\']batch-block["\']\s*>(.*?)</section>', html)
    if not m:
        raise RuntimeError("No explicit batch-block found")
    return m.group(0), "section.batch-block", None


def _strip_found_block(html: str, block_full: str, block_tag: str) -> str:
    return html.replace(block_full, "")


def _html_without_batch_blocks(html: str) -> str:
    return re.sub(r'(?is)\s*<section\s+class=["\']batch-block["\']\s*>.*?</section>\s*', "", html)


def _sanitize_html_for_llm(html: str) -> str:
    """
    Keep structure but remove scripts/styles to reduce prompt bloat.
    You can make this smarter later (minify, strip comments, etc.).
    """
    # strip <script>...</script>
    html = re.sub(r"(?is)<script[^>]*>.*?</script>", "", html)
    # strip <style>...</style>
    html = re.sub(r"(?is)<style[^>]*>.*?</style>", "", html)
    # optional: collapse excessive whitespace
    html = re.sub(r"[ \t]+\n", "\n", html)
    return html


# ───────────────────────────────────────────────────────────────────────────────
# Shared image builder for STEP-1 only
# (This is the only place we render/attach the page-1 image. Contract step reuses it.)
# ───────────────────────────────────────────────────────────────────────────────

def _reference_image_contents_inline(tdir: Path) -> List[dict]:
    """
    Build Chat Completions 'image_url' parts using a data URL for first page.
    Valid content items: {'type': 'text'|'image_url'|...}
    """
    items: List[dict] = []
    pdf_path = tdir / "source.pdf"
    if not pdf_path.exists():
        return items

    ref_png = tdir / "reference_p1.png"
    if not ref_png.exists():
        # render first page if missing
        dpi = int(os.getenv("PDF_DPI", "400"))
        try:
            pdf_to_pngs(pdf_path, out_dir=tdir, dpi=dpi, first_n=1)
        except Exception:
            return items

    if ref_png.exists():
        b64 = base64.b64encode(ref_png.read_bytes()).decode("utf-8")
        data_url = f"data:image/png;base64,{b64}"
        items.append({
            "type": "image_url",
            "image_url": {"url": data_url}
        })
    return items


# ───────────────────────────────────────────────────────────────────────────────
# Mapping JSON loader
# ───────────────────────────────────────────────────────────────────────────────

def _load_mappings_json(tdir: Path) -> list[dict[str, Any]]:
    """
    Loads the approved mapping JSON saved by /templates/{template_id}/mapping/approve.
    Expected path: uploads/<tid>/mapping_pdf_labels.json
    Shape: [{ "header": str, "placeholder": "{token}"|"{{token}}", "mapping": "<table.col>"|"UNRESOLVED" }, ...]
    """
    path = tdir / "mapping_pdf_labels.json"
    if not path.exists():
        # It's valid to proceed without it, but Step-1 prompt relies on it. Raise to be explicit.
        raise HTTPException(status_code=404, detail="mapping_pdf_labels.json not found. Approve mapping first.")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError("mapping_pdf_labels.json must be a list")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid mapping_pdf_labels.json: {e}")


# ───────────────────────────────────────────────────────────────────────────────
# STEP-1 + STEP-2: Fill UNRESOLVED non-totals tokens from PDF, then apply mapping
# Returns final URLs AND the image_contents so it can be reused by contract builder.
# ───────────────────────────────────────────────────────────────────────────────

def run_after_approve(template_id: str, uploads_root: Path) -> Dict[str, object]:
    """
    Runs the 2-step LLM flow immediately after mapping approval:

      STEP-1: Using HTML scope + PDF image(s) + mapping_pdf_labels.json,
              returns {updated_html, resolved_from_pdf, left_untouched}
              where ONLY UNRESOLVED tokens (and non-totals small labels) are filled verbatim.
      STEP-2: Apply ONLY 'resolved_from_pdf' to the full HTML to produce report_final.html

    Also writes the same filled HTML to template_p1.html so early previews update.

    Returns:
      {
        final_html_path,
        final_html_url,        # /uploads/<tid>/report_final.html?ts=...
        template_html_url,     # /uploads/<tid>/template_p1.html?ts=...
        token_map_size,        # number of tokens actually filled
        image_contents         # <-- reuse this for contract building
      }
    """
    model = os.getenv("OPENAI_MODEL", "gpt-5")
    client = get_openai_client()  # expects OPENAI_API_KEY in env

    tdir = uploads_root / template_id
    if not tdir.exists():
        raise HTTPException(status_code=404, detail="template_id not found")

    # Choose base HTML: prefer template_p1.html else report_final.html
    template_path = tdir / "template_p1.html"
    if not template_path.exists():
        alt = tdir / "report_final.html"
        if alt.exists():
            template_path = alt
        else:
            raise HTTPException(status_code=404, detail="No template HTML found (report_final.html or template_p1.html)")

    out_html_final = tdir / "report_final.html"
    out_html_template = tdir / "template_p1.html"  # will be synced after fill

    full_html = template_path.read_text(encoding="utf-8")

    # Scope HTML (strip repeating batch-block if possible)
    try:
        block_full, block_tag, _ = _find_or_infer_batch_block(full_html)
        html_scope = _strip_found_block(full_html, block_full, block_tag)
    except Exception:
        try:
            html_scope = _html_without_batch_blocks(full_html)
        except NameError:
            html_scope = re.sub(
                r'(?is)\s*<section\s+class=["\']batch-block["\']\s*>.*?</section>\s*',
                "",
                full_html,
            )

    # PDF image content (first page) — this will be reused by contract builder
    image_contents = _reference_image_contents_inline(tdir)

    # Approved mappings JSON (drives which tokens are UNRESOLVED vs mapped)
    mappings_list = _load_mappings_json(tdir)
    mappings_json_text = json.dumps(mappings_list, ensure_ascii=False)

    # =========================
    # STEP 1 — LLM PLAN/FILL
    # =========================
    step1_system = "You extract values from a PDF to fill HTML tokens. Output STRICT JSON only."

    step1_user = (
        "You are given three inputs:\n\n"
        "[HTML_INPUT]\n" + html_scope + "\n\n"
        "[PDF_IMAGES]\n(attached if present; one or more page renders of the same document)\n\n"
        "[MAPPINGS_JSON]\n"
        "This JSON lists every header/placeholder discovered and whether it already maps to a DB column or is UNRESOLVED.\n"
        "The shape is:\n"
        "[\n"
        "  { \"header\": \"<human label as shown in template>\", \"placeholder\": \"{token}\" | \"{{token}}\", \"mapping\": \"<table.column>\" | \"UNRESOLVED\" },\n"
        "  ...\n"
        "]\n\n"
        "MAPPINGS_JSON:\n" + mappings_json_text + "\n\n"
        "Goal\n"
        "Produce an updated HTML where:\n"
        "1) Any placeholder that is already mapped in MAPPINGS_JSON (mapping != \"UNRESOLVED\") remains UNCHANGED.\n"
        "2) Any placeholder that belongs to the totals section, or whose name suggests totals, remains UNCHANGED.\n"
        "3) Every other placeholder that is UNRESOLVED should be replaced with the visible text copied VERBATIM from the PDF images (same case, punctuation, spacing).\n"
        "4) Besides placeholders, if there are obvious non-tabular labels/fields in the HTML that are still literal placeholders and the PDF clearly shows a single corresponding value, fill them with the exact VERBATIM text as well—unless they fall under #1 or #2.\n"
        "5) Do NOT modify data tables/grids (large repeating rows) in this step. Only operate on token-only text nodes or small inline spans/labels.\n\n"
        "Precise rules\n"
        "- “Token-only text node” means the node’s entire text is exactly one token of the form {name} or {{name}}.\n"
        "- Do not invent tokens, rename tokens, add new placeholders, or remove braces.\n"
        "- Do not change any placeholder that:\n"
        "  (a) appears in MAPPINGS_JSON with mapping != \"UNRESOLVED\", or\n"
        "  (b) is part of the totals section, or\n"
        "  (c) contains “total”, “subtotal”, “grand_total”, “tax”, “amount_due” (case-insensitive) in its name or header, or\n"
        "  (d) is visually under/near headings like “Total”, “Subtotal”, “Grand Total”, “Tax”, “GST/CGST/SGST/IGST”, “Amount Due”.\n"
        "- When copying text from the PDF images, match VERBATIM (same characters, spaces, punctuation).\n"
        "- If a UNRESOLVED placeholder cannot be confidently matched to a single visible text in the PDF, leave it as the original token (do not guess).\n"
        "- Do not reflow or restructure the HTML other than replacing the token text nodes with verbatim strings as instructed.\n\n"
        "Output format (STRICT JSON ONLY; no markdown, comments, or extra text)\n"
        "{\n"
        "  \"updated_html\": \"<the entire updated HTML document as a single string>\",\n"
        "  \"resolved_from_pdf\": {\n"
        "    \"{token_or_{{token}}}\": \"Exact text from PDF\",\n"
        "    ...\n"
        "  },\n"
        "  \"left_untouched\": {\n"
        "    \"mapped_in_json\": [\"{token}\", \"{{token}}\", ...],\n"
        "    \"totals_related\": [\"{token}\", \"{{token}}\", ...],\n"
        "    \"unmatched_still_placeholders\": [\"{token}\", \"{{token}}\", ...]\n"
        "  }\n"
        "}\n\n"
        "Notes\n"
        "- “resolved_from_pdf” must ONLY include tokens that were UNRESOLVED in MAPPINGS_JSON and you successfully filled from the PDF.\n"
        "- “left_untouched.mapped_in_json” must list every placeholder whose mapping != \"UNRESOLVED\" in MAPPINGS_JSON (these remain as tokens).\n"
        "- “left_untouched.totals_related” must list every placeholder you avoided because it is totals-related by the rules above.\n"
        "- “left_untouched.unmatched_still_placeholders” must list any remaining tokens you could not confidently resolve.\n"
    )

    plan_messages = [
        {"role": "system", "content": [{"type": "text", "text": step1_system}]},
        {"role": "user", "content": (image_contents if image_contents else []) + [{"type": "text", "text": step1_user}]},
    ]

    # openai>=1 style and fallback
    client_has_new = hasattr(client, "chat_completions")
    plan_resp = (
        client.chat_completions.create(model=model, messages=plan_messages)
        if client_has_new else
        client.chat.completions.create(model=model, messages=plan_messages)
    )

    raw = (plan_resp.choices[0].message.content or "").strip()
    # Strip ```json fences if present
    maybe_json = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", raw, flags=re.I | re.M).strip()

    # Expect object with updated_html/resolved_from_pdf/left_untouched
    try:
        token_obj = json.loads(maybe_json)
        if not isinstance(token_obj, dict):
            raise ValueError("Expected a JSON object.")
    except Exception:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            raise HTTPException(status_code=500, detail="Step-1 parse failed: LLM did not return JSON.")
        token_obj = json.loads(m.group(0))
        if not isinstance(token_obj, dict):
            raise HTTPException(status_code=500, detail="Step-1 parse failed: not a JSON object.")

    # Only apply what the model actually resolved-from-PDF (these should exclude totals and mapped)
    resolved_map = token_obj.get("resolved_from_pdf") or {}
    if not isinstance(resolved_map, dict):
        raise HTTPException(status_code=500, detail="Step-1 JSON missing 'resolved_from_pdf' object.")

    # ===========================
    # STEP 2 — APPLY THE MAPPING
    # ===========================
    step2_system = "You are a precise HTML editor. Apply the mapping. Return only final HTML between markers."
    step2_user = (
        "You are given:\n"
        "[MAPPING_JSON]\n" + json.dumps(resolved_map, ensure_ascii=False) + "\n\n"
        "[HTML_INPUT]\n" + full_html + "\n\n"
        "Apply these rules:\n"
        "- Replace ONLY token-only text nodes whose entire text is exactly one token of the form {name} or {{name}}, and ONLY if that token is a key in MAPPING_JSON.\n"
        "- Do NOT edit anything inside any <section class=\"batch-block\"> ... </section>.\n"
        "- Do NOT alter totals sections, even if a key appears there. A node is considered within a totals section if ANY of the following is true (case-insensitive):\n"
        "  • It is inside an element whose id/class contains: total, totals, subtotal, grand-total, grand_total, tax, gst, cgst, sgst, igst, amount-due, amount_due, balance-due, balance_due.\n"
        "  • It is visually under/near headings with text like: “Total”, “Subtotal”, “Grand Total”, “Tax”, “GST/CGST/SGST/IGST”, “Amount Due”, “Balance Due”.\n"
        "  • It is inside a <tfoot> region.\n"
        "- Do not replace tokens that are NOT present as keys in MAPPING_JSON.\n"
        "- Do not alter tags, attributes, CSS, JS, or whitespace outside the replaced token-only text nodes.\n\n"
        "Return ONLY the final HTML between:\n"
        "<!--BEGIN_HTML-->\n"
        "...final html...\n"
        "<!--END_HTML-->"
    )

    apply_messages = [
        {"role": "system", "content": [{"type": "text", "text": step2_system}]},
        {"role": "user", "content": [{"type": "text", "text": step2_user}]},
    ]

    apply_resp = (
        client.chat_completions.create(model=model, messages=apply_messages)
        if client_has_new else
        client.chat.completions.create(model=model, messages=apply_messages)
    )

    raw2 = (apply_resp.choices[0].message.content or "").strip()
    m2 = re.search(r"<!--BEGIN_HTML-->([\s\S]*?)<!--END_HTML-->", raw2)
    final_html = (m2.group(1).strip() if m2 else raw2)
    final_html = re.sub(r"^\s*```(?:html)?\s*|\s*```\s*$", "", final_html, flags=re.I | re.M)

    # --- Write outputs ---
    out_html_final.write_text(final_html, encoding="utf-8")

    # Sync early-preview file so UI sees the fresh HTML as well
    try:
        out_html_template.write_text(final_html, encoding="utf-8")
    except Exception:
        pass  # non-fatal

    ts = int(time.time())
    return {
        "final_html_path": str(out_html_final),
        "final_html_url": f"/uploads/{template_id}/{out_html_final.name}?ts={ts}",
        "template_html_url": f"/uploads/{template_id}/{out_html_template.name}?ts={ts}",
        "token_map_size": len(resolved_map),
        "image_contents": image_contents,  # <-- pass this directly to build_or_load_contract()
    }


# ───────────────────────────────────────────────────────────────────────────────
# Contract builder (merged from discovery.py), now reusing the SAME image_contents
# ───────────────────────────────────────────────────────────────────────────────

def build_or_load_contract(
    *,
    uploads_root: Path,
    template_id: str,
    db_path: Path,
    openai_client=None,
    model: Optional[str] = None,
    image_contents: Optional[List[dict]] = None,   # <— reuse from run_after_approve()
) -> dict:
    """
    Loads /uploads/<tid>/contract.json if present; otherwise builds it by:
      - computing schema_info via get_parent_child_info(db_path)
      - reading FULL HTML from report_final.html (fallback template_p1.html)
      - sanitizing the HTML for LLM consumption
      - reusing the SAME PDF image contents created in STEP-1 (no new image function)
      - calling the LLM to produce a contract JSON
      - saving the resulting JSON to /uploads/<tid>/contract.json
    """
    tdir = uploads_root / template_id
    tdir.mkdir(parents=True, exist_ok=True)

    contract_path = tdir / "contract.json"
    if contract_path.exists():
        return json.loads(contract_path.read_text(encoding="utf-8"))

    # 1) schema_info from DB (supports single-table: child==parent)
    schema_info = get_parent_child_info(db_path)

    # 2) choose HTML to analyze (prefer final shell), then sanitize
    html_final = tdir / "report_final.html"
    html_tpl   = tdir / "template_p1.html"
    if html_final.exists():
        html_text = html_final.read_text(encoding="utf-8", errors="ignore")
    elif html_tpl.exists():
        html_text = html_tpl.read_text(encoding="utf-8", errors="ignore")
    else:
        raise FileNotFoundError("No template HTML found (report_final.html or template_p1.html).")

    full_html_for_llm = _sanitize_html_for_llm(html_text)

    # 3) reuse PDF page-1 image (same content list used in STEP-1)
    IMAGE_CONTENTS = image_contents or []

    # 4) LLM call for contract
    client = openai_client or get_openai_client()
    model = model or os.getenv("OPENAI_MODEL", "gpt-5")

    prompt = f"""
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
{{
  "mapping": {{ "<token>": "table.column" }},
  "join": {{ "parent_table": "...", "parent_key": "...", "child_table": "...", "child_key": "..." }},
  "date_columns": {{ "<table>": "<date_or_timestamp_col>" }},
  "header_tokens": ["<token>"],
  "row_tokens": ["<token>"],
  "totals": {{ "<token>": "table.column" }},
  "row_order": ["<primary_order_col>", "ROWID"],
  "literals": {{ "<token>": "<verbatim text from PDF if not DB-backed>" }}
}}

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
""".strip()

    messages = [{"role": "user", "content": [{"type": "text", "text": prompt}, *IMAGE_CONTENTS]}]

    # New vs legacy client shim
    has_new = hasattr(client, "chat_completions")
    resp = (
        client.chat_completions.create(model=model, messages=messages)
        if has_new else
        client.chat.completions.create(model=model, messages=messages)
    )
    raw = (resp.choices[0].message.content or "").strip()

    try:
        OBJ = json.loads(raw)
        if not isinstance(OBJ, dict):
            raise ValueError("contract not a JSON object")
    except Exception:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            raise RuntimeError("Could not parse contract JSON from model output.")
        OBJ = json.loads(m.group(0))
        if not isinstance(OBJ, dict):
            raise RuntimeError("Parsed contract is not a JSON object.")

    # persist for later /reports/run
    contract_path.write_text(json.dumps(OBJ, indent=2, ensure_ascii=False), encoding="utf-8")
    return OBJ
