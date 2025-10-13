# auto_fill.py
from __future__ import annotations

import os, re, json, base64, time, logging, uuid, sqlite3, hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import HTTPException

# Reuse existing utilities
from ..templates.TemplateVerify import get_openai_client, pdf_to_pngs
from ..mapping.HeaderMapping import (
    get_parent_child_info,
    UNRESOLVED,
    INPUT_SAMPLE,
    UNRESOLVED_CHOICES,
)
from ..utils import (
    call_chat_completion,
    load_prompt,
    write_text_atomic,
    write_json_atomic,
    sanitize_html,
    write_artifact_manifest,
    validate_contract_schema,
    validate_mapping_schema,
    get_correlation_id,
)

logger = logging.getLogger("neura.auto_fill")
UNRESOLVED_VALUES = {str(tok) for tok in UNRESOLVED_CHOICES}
UNRESOLVED_VALUES_ORDERED = [UNRESOLVED, INPUT_SAMPLE]
UNRESOLVED_VALUES_TEXT = " or ".join(f'"{tok}"' for tok in UNRESOLVED_VALUES_ORDERED)


def _resolve_template_dir(uploads_root: Path, template_id: str, *, must_exist: bool = True) -> Path:
    """
    Resolve and validate the uploads directory for a given template_id.
    Prevents path traversal by requiring a UUID template_id and ensuring the
    resolved path stays under uploads_root.
    """
    try:
        tid = uuid.UUID(str(template_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid template_id format")

    base = uploads_root.resolve()
    tdir = (base / str(tid)).resolve()
    if base not in tdir.parents:
        raise HTTPException(status_code=400, detail="Invalid template path")
    if must_exist and not tdir.exists():
        raise HTTPException(status_code=404, detail="template_id not found")
    return tdir


def _normalize_choice(value: Optional[str]) -> str:
    return str(value or "").strip()


def _is_unresolved_choice(value: Optional[str]) -> bool:
    return _normalize_choice(value) in UNRESOLVED_VALUES


def _is_sample_choice(value: Optional[str]) -> bool:
    return _normalize_choice(value) == INPUT_SAMPLE


# ---------------------------------------------------------------------------
# Small HTML helpers
# ---------------------------------------------------------------------------

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


_TOKEN_PATTERN = re.compile(r"\{\{[^{}]+\}\}|\{[^{}]+\}")
_TOKEN_SUFFIX_ALLOWLIST = {"date", "no", "num", "number", "count", "value", "code"}


def _strip_braces_token(token: str) -> str:
    token = token.strip()
    if token.startswith("{{") and token.endswith("}}"):
        return token[2:-2].strip()
    if token.startswith("{") and token.endswith("}"):
        return token[1:-1].strip()
    return token


def _normalize_token_key(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def _build_token_lookup(html: str) -> tuple[set[str], dict[str, set[str]]]:
    """
    Extract all brace-delimited placeholders present in HTML and build a lookup
    keyed by a normalized form (lowercase alphanumerics only).
    """
    tokens = set(_TOKEN_PATTERN.findall(html))
    lookup: dict[str, set[str]] = {}
    for tok in tokens:
        key = _normalize_token_key(_strip_braces_token(tok))
        if not key:
            continue
        lookup.setdefault(key, set()).add(tok)
    return tokens, lookup


def _resolve_tokens_from_raw(
    raw: Optional[str],
    html_tokens: set[str],
    lookup: dict[str, set[str]],
) -> set[str]:
    """
    Given a raw placeholder/header string, return the actual brace tokens that
    appear in the HTML. Falls back to the raw string if nothing matches so older
    templates keep existing behavior.
    """
    resolved: set[str] = set()
    if raw is None:
        return resolved
    raw_str = str(raw).strip()
    if not raw_str:
        return resolved

    if raw_str in html_tokens:
        resolved.add(raw_str)

    inner = _strip_braces_token(raw_str)
    key = _normalize_token_key(inner)
    if key and key in lookup:
        resolved.update(lookup[key])

    if not resolved and key:
        for candidate_key, candidate_tokens in lookup.items():
            if candidate_key.startswith(key) and candidate_key != key:
                suffix = candidate_key[len(key):]
                if suffix in _TOKEN_SUFFIX_ALLOWLIST:
                    resolved.update(candidate_tokens)

    if not resolved and raw_str.startswith("{") and raw_str.endswith("}"):
        resolved.add(raw_str)
    return resolved


def _tokens_for_mapping_entry(
    entry: dict[str, Any],
    html_tokens: set[str],
    lookup: dict[str, set[str]],
) -> set[str]:
    tokens = set()
    tokens.update(_resolve_tokens_from_raw(entry.get("placeholder"), html_tokens, lookup))
    tokens.update(_resolve_tokens_from_raw(entry.get("header"), html_tokens, lookup))
    if not tokens:
        placeholder = entry.get("placeholder")
        if placeholder:
            placeholder_str = str(placeholder).strip()
            if placeholder_str:
                if placeholder_str.startswith("{") and placeholder_str.endswith("}"):
                    tokens.add(placeholder_str)
                else:
                    tokens.add(f"{{{placeholder_str}}}")
        else:
            header = entry.get("header")
            if header:
                header_str = str(header).strip()
                if header_str:
                    tokens.add(f"{{{header_str}}}")
    return tokens


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
            pdf_to_pngs(pdf_path, out_dir=tdir, dpi=dpi)
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


def _compute_db_signature(db_path: Path) -> Optional[str]:
    """
    Build a stable fingerprint of the SQLite schema (user tables only).
    Captures table columns and foreign keys to detect schema drift.
    """
    schema: dict[str, dict[str, list[dict[str, object]]]] = {}
    con: Optional[sqlite3.Connection] = None
    try:
        con = sqlite3.connect(str(db_path))
    except Exception as exc:
        logger.warning(
            "db_signature_connect_failed",
            extra={
                "event": "db_signature_connect_failed",
                "db_path": str(db_path),
            },
            exc_info=exc,
        )
        return None

    try:
        cur = con.cursor()
        cur.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name NOT LIKE 'sqlite_%' "
            "ORDER BY name;"
        )
        tables = [row[0] for row in cur.fetchall()]

        for table in tables:
            table_entry: dict[str, list[dict[str, object]]] = {"columns": [], "foreign_keys": []}

            try:
                cur.execute(f"PRAGMA table_info('{table}')")
                columns = [
                    {
                        "name": str(col[1]),
                        "type": str(col[2] or ""),
                        "notnull": int(col[3] or 0),
                        "pk": int(col[5] or 0),
                    }
                    for col in cur.fetchall()
                ]
                table_entry["columns"] = columns
            except Exception:
                table_entry["columns"] = []

            try:
                cur.execute(f"PRAGMA foreign_key_list('{table}')")
                fks = [
                    {
                        "id": int(fk[0]),
                        "seq": int(fk[1]),
                        "table": str(fk[2] or ""),
                        "from": str(fk[3] or ""),
                        "to": str(fk[4] or ""),
                    }
                    for fk in cur.fetchall()
                ]
                table_entry["foreign_keys"] = fks
            except Exception:
                table_entry["foreign_keys"] = []

            schema[table] = table_entry
    except Exception as exc:
        logger.warning(
            "db_signature_pragmas_failed",
            extra={
                "event": "db_signature_pragmas_failed",
                "db_path": str(db_path),
            },
            exc_info=exc,
        )
        return None
    finally:
        if con is not None:
            try:
                con.close()
            except Exception:
                pass

    payload = json.dumps(schema, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


# ───────────────────────────────────────────────────────────────────────────────
# Mapping JSON loader
# ───────────────────────────────────────────────────────────────────────────────

def _load_mappings_json(tdir: Path) -> list[dict[str, Any]]:
    """
    Loads the approved mapping JSON saved by /templates/{template_id}/mapping/approve.
    Expected path: uploads/<tid>/mapping_pdf_labels.json
    Shape: [{ "header": str, "placeholder": "{token}"|"{{token}}", "mapping": "<table.col>"|"UNRESOLVED"|"INPUT_SAMPLE" }, ...]
    """
    path = tdir / "mapping_pdf_labels.json"
    if not path.exists():
        # It's valid to proceed without it, but Step-1 prompt relies on it. Raise to be explicit.
        raise HTTPException(status_code=404, detail="mapping_pdf_labels.json not found. Approve mapping first.")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        validate_mapping_schema(data)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid mapping_pdf_labels.json: {e}")


# ---------------------------------------------------------------------------
# STEP-1 + STEP-2: Fill unresolved non-totals tokens from PDF, then apply mapping
# Returns final URLs AND the image_contents so it can be reused by contract builder.
# ---------------------------------------------------------------------------

def run_after_approve(template_id: str, uploads_root: Path, user_values_text: str = "") -> Dict[str, object]:
    """
    New 2-step LLM flow where BOTH steps output HTML.

      STEP-1 (Sample-pick fill):
        Inputs: [HTML_INPUT], [PDF_IMAGES], [MAPPINGS_JSON]
        - Fill ONLY placeholders whose mapping == "pick from input sample".
        - Also fill obvious non-JSON blanks in the HTML (e.g., '____', '--', '<< >>', 'XXXX') from the PDF image(s).
        - Leave ALL other placeholders untouched.
        - Leave page-number placeholders untouched.
        Output: Modified HTML (html_step1).

      STEP-2 (UNRESOLVED fill from user):
        Inputs: [USER_INPUT], [HTML from STEP-1], [PDF_IMAGES], [MAPPINGS_JSON]
        - Fill ONLY placeholders marked UNRESOLVED in mappings JSON using the user's free-form values.
        - Use the PDF only to match/normalize formatting or to fill an UNRESOLVED value that is clearly visible.
        - Leave everything else alone, including page-number placeholders.
        Output: Final HTML (html_final).

    Writes:
      - template_p1.html  ← after Step-1
      - report_final.html ← after Step-2
      - template_p1.html  ← synced to final again

    Returns:
      {
        final_html_path,
        final_html_url,        # /uploads/<tid>/report_final.html?ts=...
        template_html_url,     # /uploads/<tid>/template_p1.html?ts=...
        token_map_size,        # rough count of placeholders no longer present
        image_contents         # passthrough for downstream usage
      }
    """
    import os, re, json, time
    from fastapi import HTTPException

    model = os.getenv("OPENAI_MODEL", "gpt-5")
    client = get_openai_client()  # expects OPENAI_API_KEY in env

    tdir = _resolve_template_dir(uploads_root, template_id, must_exist=True)

    # Choose base HTML: prefer template_p1.html else report_final.html
    template_path = tdir / "template_p1.html"
    if not template_path.exists():
        alt = tdir / "report_final.html"
        if alt.exists():
            template_path = alt
        else:
            raise HTTPException(status_code=404, detail="No template HTML found (report_final.html or template_p1.html)")

    out_html_final = tdir / "report_final.html"
    out_html_template = tdir / "template_p1.html"

    full_html = template_path.read_text(encoding="utf-8")
    html_tokens_present, html_token_lookup = _build_token_lookup(full_html)

    # PDF image content (first page(s)) - reused elsewhere
    image_contents = _reference_image_contents_inline(tdir)

    # Approved mappings JSON (drives which tokens get filled in each step)
    mapping_path = tdir / "mapping_pdf_labels.json"
    mappings_list = _load_mappings_json(tdir)
    mappings_json_text = json.dumps(mappings_list, ensure_ascii=False)

    # ---- classify tokens from mappings ----
    def _norm(s: str) -> str:
        return (s or "").strip().lower()

    def _is_pick_from_input_sample(val: str) -> bool:
        if _is_sample_choice(val):
            return True
        s = _norm(val)
        return s in {
            "pick from input sample",
            "pick_from_input_sample",
            "sample",
            "from_sample",
            "input_sample",
        }

    def _is_unresolved(val: str) -> bool:
        if _is_unresolved_choice(val):
            return True
        s = _norm(val)
        # Accept common variants for backward compatibility
        return "unresolved" in s or s in {"__unresolved__", "pending_user_input", "needs_input"}

    pick_sample_tokens_set: set[str] = set()
    unresolved_tokens_set: set[str] = set()
    for entry in mappings_list:
        if _is_pick_from_input_sample(entry.get("mapping")):
            pick_sample_tokens_set.update(_tokens_for_mapping_entry(entry, html_tokens_present, html_token_lookup))
        if _is_unresolved(entry.get("mapping")):
            unresolved_tokens_set.update(_tokens_for_mapping_entry(entry, html_tokens_present, html_token_lookup))

    pick_sample_tokens = sorted(tok for tok in pick_sample_tokens_set if tok)
    unresolved_tokens = sorted(tok for tok in unresolved_tokens_set if tok)

    # Page-number placeholders to protect
    page_token_hints = {
        "{page}", "{{page}}", "{page_no}", "{{page_no}}", "{page_number}", "{{page_number}}",
        "{page_count}", "{{page_count}}", "{total_pages}", "{{total_pages}}"
    }
    page_like_tokens_set: set[str] = set()
    for entry in mappings_list:
        if "page" in _norm(entry.get("placeholder")) or "page" in _norm(entry.get("header")):
            page_like_tokens_set.update(_tokens_for_mapping_entry(entry, html_tokens_present, html_token_lookup))
    page_like_tokens = {tok for tok in page_like_tokens_set if tok}
    page_tokens_protect = sorted(page_token_hints.union(page_like_tokens))
    pick_sample_tokens_json = json.dumps(pick_sample_tokens, ensure_ascii=False)
    page_tokens_json = json.dumps(page_tokens_protect, ensure_ascii=False)
    unresolved_tokens_json = json.dumps(unresolved_tokens, ensure_ascii=False)

    # =========================
    # STEP 1 - SAMPLE-PICK FILL (returns HTML)
    # =========================
    step1_system = load_prompt("step1_system")
    step1_user = load_prompt(
        "step1_user",
        replacements={
            "{full_html}": full_html,
            "{mappings_json_text}": mappings_json_text,
            "{json.dumps(pick_sample_tokens, ensure_ascii=False)}": pick_sample_tokens_json,
            "{json.dumps(page_tokens_protect, ensure_ascii=False)}": page_tokens_json,
        },
    )

    plan_messages = [
        {"role": "system", "content": [{"type": "text", "text": step1_system}]},
        {"role": "user", "content": (image_contents if image_contents else []) + [{"type": "text", "text": step1_user}]},
    ]

    step1_resp = call_chat_completion(
        client,
        model=model,
        messages=plan_messages,
        description="auto_fill_step1",
    )

    raw1 = (step1_resp.choices[0].message.content or "").strip()
    m1 = re.search(r"<!--BEGIN_HTML-->([\s\S]*?)<!--END_HTML-->", raw1)
    html_step1 = (m1.group(1).strip() if m1 else raw1)
    html_step1 = re.sub(r"^\s*```(?:html)?\s*|\s*```\s*$", "", html_step1, flags=re.I | re.M)
    html_step1 = sanitize_html(html_step1)

    # Write preview after Step-1 so UI can show it even if Step-2 fails
    write_text_atomic(out_html_template, html_step1, encoding="utf-8", step="auto_fill_step1")
    logger.info(
        "auto_fill_step1_written",
        extra={
            "event": "auto_fill_step1_written",
            "template_id": template_id,
            "path": str(out_html_template),
        },
    )

    # =========================
    # STEP 2 - UNRESOLVED FILL (returns HTML)
    # =========================
    step2_system = load_prompt("step2_system")
    user_values_clean = (user_values_text or "").strip()
    step2_user = load_prompt(
        "step2_user",
        replacements={
            "{(user_values_text or '').strip()}": user_values_clean,
            "{html_step1}": html_step1,
            "{mappings_json_text}": mappings_json_text,
            "{json.dumps(unresolved_tokens, ensure_ascii=False)}": unresolved_tokens_json,
            "{json.dumps(page_tokens_protect, ensure_ascii=False)}": page_tokens_json,
        },
    )

    apply_messages = [
        {"role": "system", "content": [{"type": "text", "text": step2_system}]},
        {"role": "user", "content": (image_contents if image_contents else []) + [{"type": "text", "text": step2_user}]},
    ]

    step2_resp = call_chat_completion(
        client,
        model=model,
        messages=apply_messages,
        description="auto_fill_step2",
    )

    raw2 = (step2_resp.choices[0].message.content or "").strip()
    m2 = re.search(r"<!--BEGIN_HTML-->([\s\S]*?)<!--END_HTML-->", raw2)
    html_final = (m2.group(1).strip() if m2 else raw2)
    html_final = re.sub(r"^\s*```(?:html)?\s*|\s*```\s*$", "", html_final, flags=re.I | re.M)
    html_final = sanitize_html(html_final)

    # --- Write outputs ---
    write_text_atomic(out_html_final, html_final, encoding="utf-8", step="auto_fill_step2")
    logger.info(
        "auto_fill_final_written",
        extra={
            "event": "auto_fill_final_written",
            "template_id": template_id,
            "path": str(out_html_final),
        },
    )

    # Sync preview to final as well
    try:
        write_text_atomic(out_html_template, html_final, encoding="utf-8", step="auto_fill_sync")
    except Exception:
        logger.warning(
            "auto_fill_template_sync_failed",
            extra={
                "event": "auto_fill_template_sync_failed",
                "template_id": template_id,
                "path": str(out_html_template),
            },
        )

    # Rough replacement count: how many unique tracked tokens disappeared between input and final
    tracked_tokens = set(pick_sample_tokens) | set(unresolved_tokens)

    def _count_disappeared(before: str, after: str, tokens: set[str]) -> int:
        return sum(1 for t in tokens if (t in before) and (t not in after))

    token_map_size = _count_disappeared(full_html, html_final, tracked_tokens)

    manifest_files = {
        "report_final.html": out_html_final,
        "template_p1.html": out_html_template,
        "mapping_pdf_labels.json": mapping_path,
    }
    write_artifact_manifest(
        tdir,
        step="run_after_approve",
        files=manifest_files,
        inputs=[str(mapping_path)],
        correlation_id=get_correlation_id(),
    )

    ts = int(time.time())
    return {
        "final_html_path": str(out_html_final),
        "final_html_url": f"/uploads/{template_id}/{out_html_final.name}?ts={ts}",
        "template_html_url": f"/uploads/{template_id}/{out_html_template.name}?ts={ts}",
        "token_map_size": token_map_size,
        "image_contents": image_contents,
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
    image_contents: Optional[List[dict]] = None,   # <- reuse from run_after_approve()
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
    tdir = _resolve_template_dir(uploads_root, template_id, must_exist=False)
    tdir.mkdir(parents=True, exist_ok=True)

    contract_path = tdir / "contract.json"
    db_signature = _compute_db_signature(db_path)
    cached_contract: Optional[dict] = None
    if contract_path.exists():
        try:
            cached_contract = json.loads(contract_path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.warning(
                "contract_cache_load_failed",
                extra={
                    "event": "contract_cache_load_failed",
                    "template_id": template_id,
                    "path": str(contract_path),
                },
                exc_info=exc,
            )
            cached_contract = None

    if cached_contract is not None:
        cached_meta = cached_contract.get("meta") if isinstance(cached_contract, dict) else None
        cached_signature = None
        if isinstance(cached_meta, dict):
            cached_signature = cached_meta.get("db_signature")

        if db_signature is None or cached_signature == db_signature:
            logger.info(
                "contract_loaded_cache",
                extra={
                    "event": "contract_loaded_cache",
                    "template_id": template_id,
                    "path": str(contract_path),
                    "signature": cached_signature,
                },
            )
            return cached_contract

        logger.info(
            "contract_signature_mismatch",
            extra={
                "event": "contract_signature_mismatch",
                "template_id": template_id,
                "cached_signature": cached_signature,
                "current_signature": db_signature,
            },
        )

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

    prompt = load_prompt(
        "contract_build",
        replacements={
            "{schema_info}": str(schema_info),
            "{full_html_for_llm}": full_html_for_llm,
        },
    )

    messages = [{"role": "user", "content": [{"type": "text", "text": prompt}, *IMAGE_CONTENTS]}]

    resp = call_chat_completion(
        client,
        model=model,
        messages=messages,
        description="contract_build",
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

    validate_contract_schema(OBJ)

    if db_signature:
        meta = dict(OBJ.get("meta") or {})
        meta["db_signature"] = db_signature
        meta.setdefault("generated_at", int(time.time()))
        OBJ["meta"] = meta

    # persist for later /reports/run
    write_json_atomic(contract_path, OBJ, indent=2, ensure_ascii=False, step="contract_write")
    logger.info(
        "contract_saved",
        extra={
            "event": "contract_saved",
            "template_id": template_id,
            "path": str(contract_path),
        },
    )
    write_artifact_manifest(
        tdir,
        step="contract_build",
        files={
            "contract.json": contract_path,
            "report_final.html": tdir / "report_final.html",
            "template_p1.html": tdir / "template_p1.html",
        },
        inputs=[str(tdir / "report_final.html"), str(db_path)],
        correlation_id=get_correlation_id(),
    )
    return OBJ
