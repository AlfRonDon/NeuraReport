import os
import sys
import re
import json
import math
from datetime import datetime
import base64
import sqlite3
from pathlib import Path
from collections import defaultdict

import asyncio

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore

try:
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None  # type: ignore

try:
    import fitz
except ImportError:  # pragma: no cover
    fitz = None  # type: ignore

try:
    from skimage.metrics import structural_similarity as ssim
except ImportError:  # pragma: no cover
    ssim = None  # type: ignore

try:
    from playwright.async_api import async_playwright
except ImportError:  # pragma: no cover
    async_playwright = None  # type: ignore


try:
    from ..templates.TemplateVerify import get_openai_client
except ImportError:  # pragma: no cover
    get_openai_client = None  # type: ignore


# ------------------------------
# Globals (paths / tunables)
# ------------------------------
OUT_DIR = Path.cwd() / "llm_pdf_mapping_outputs_v2"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Kept for compatibility; not used here for LLM anymore
MODEL      = os.getenv("OPENAI_MODEL", "gpt-5")
DPI        = int(os.getenv("PDF_DPI", "400"))
ITERATIONS = int(os.getenv("REFINE_ITERS", "1"))


def _init_openai_client():
    if "get_openai_client" not in globals() or get_openai_client is None:
        return None
    try:
        return get_openai_client()
    except Exception:
        return None


client = _init_openai_client()

OUT_PDF = OUT_DIR / "report_filled_new.pdf"


# ------------------------------------------------------------------
# Tolerant batch-block detection + stripping (explicit/implicit)
# ------------------------------------------------------------------
_BATCH_BLOCK_ANY_TAG = re.compile(
    r'(?is)'
    r'<(?P<tag>section|div|article|main|tbody|tr)\b'
    r'[^>]*\bclass\s*=\s*["\'][^"\']*\bbatch-block\b[^"\']*["\']'
    r'[^>]*>'
    r'(?P<inner>.*?)'
    r'</(?P=tag)>'
)

def _find_or_infer_batch_block(html_text: str) -> tuple[str, str, str]:
    """
    Return (full_match, tag_name, inner_html) of the repeating unit.
    Preference order:
      1) Any element with class="batch-block"
      2) First <tr> inside the first <tbody>
      3) First row-like <div> (class includes row|item|card)
      4) First large container (<section|main|div|article> under <body>)
    """
    m = _BATCH_BLOCK_ANY_TAG.search(html_text)
    if m:
        return m.group(0), m.group('tag').lower(), m.group('inner')

    m_tbody = re.search(r'(?is)<tbody\b[^>]*>(?P<body>.*?)</tbody>', html_text)
    if m_tbody:
        tbody = m_tbody.group('body')
        m_tr = re.search(r'(?is)<tr\b[^>]*>(?P<tr>.*?)</tr>', tbody)
        if m_tr:
            return m_tr.group(0), 'tr', m_tr.group('tr')

    m_div = re.search(r'(?is)<div\b[^>]*\b(row|item|card)\b[^>]*>(?P<inner>.*?)</div>', html_text)
    if m_div:
        return m_div.group(0), 'div', m_div.group('inner')

    m_body = re.search(r'(?is)<body\b[^>]*>(?P<body>.*?)</body>', html_text)
    if m_body:
        body = m_body.group('body')
        m_cont = re.search(r'(?is)<(section|main|div|article)\b[^>]*>(?P<inner>.*?)</\1>', body)
        if m_cont:
            return m_cont.group(0), m_cont.group(1).lower(), m_cont.group('inner')

    raise RuntimeError("No explicit batch-block and no suitable repeating unit could be inferred.")

def _strip_found_block(html_text: str, block_full: str, block_tag: str) -> str:
    """Remove the found/inferred block once (used to build shell)."""
    return html_text.replace(block_full, "", 1)

def html_without_batch_blocks(html_text: str) -> str:
    """Legacy stripper kept for compatibility."""
    pat = re.compile(r'(?is)\s*<section\s+class=["\']batch-block["\']\s*>.*?</section>\s*')
    return pat.sub("", html_text)

def _raise_no_block(html: str, cause: Exception | None = None) -> None:
    """Build a short <section ...> preview and raise ValueError from here."""
    sec_tags = re.findall(r'(?is)<section\b[^>]*>', html)
    preview_lines = []
    for i, t in enumerate(sec_tags[:12]):
        snip = t[:140].replace("\n", " ")
        preview_lines.append(f'{i+1:02d}: {snip}{" …" if len(t) > 140 else ""}')
    preview = "\n".join(preview_lines)
    msg = (
        "Could not find any <section class='batch-block'> blocks and no suitable fallback could be inferred.\n"
        "First few <section> tags present:\n" + preview
    )
    raise ValueError(msg) from cause


# ------------------------------------------------------
# Date helpers (same behavior as discovery.py patches)
# ------------------------------------------------------
def _get_col_type(db_path: Path, table: str, col: str) -> str:
    if not col:
        return ""
    try:
        with sqlite3.connect(str(db_path)) as con:
            cur = con.cursor()
            cur.execute(f"PRAGMA table_info('{table}')")
            for _, name, ctype, *_ in cur.fetchall():
                if str(name).lower() == str(col).lower():
                    return (ctype or "").upper()
    except Exception:
        return ""
    return ""

def _mk_between_pred_for_date(col: str, col_type: str) -> tuple[str, callable]:
    """
    Returns (predicate_sql, adapter) where adapter(start,end) -> params tuple.
    If no usable date column, returns "1=1" and adapter that yields ().
    """
    if not col or not col_type:
        return "1=1", (lambda s, e: tuple())

    t = col_type.upper()
    if "INT" in t:
        pred = (
            f"(CASE WHEN ABS({col}) > 32503680000 THEN {col}/1000 ELSE {col} END) "
            f"BETWEEN strftime('%s', ?) AND strftime('%s', ?)"
        )
        return pred, (lambda s, e: (s, e))

    pred = f"datetime({col}) BETWEEN datetime(?) AND datetime(?)"
    return pred, (lambda s, e: (s, e))


# ======================================================
# ENTRYPOINT: DB-driven fill + PDF (no LLM here anymore)
# ======================================================
def fill_and_print(
    OBJ: dict,
    TEMPLATE_PATH: Path,
    DB_PATH: Path,
    OUT_HTML: Path,
    OUT_PDF: Path,
    START_DATE: str,
    END_DATE: str,
    batch_ids: list[str] | None = None,
    IMAGE_CONTENTS: list[dict] | None = None,  # kept for signature compat; unused
):
    """
    DB-driven renderer:
      - Assumes TEMPLATE_PATH is already the *final shell* produced at Approve (auto_fill.py)
        containing a single prototype batch block.
      - Renders header tokens (parent row per batch), row repeater (child rows), totals, literals.
      - Writes OUT_HTML and prints OUT_PDF via Playwright.

    API contract preserved (same signature).
    """

    # ---- Guard required inputs ----
    for _name in ["OBJ", "TEMPLATE_PATH", "DB_PATH", "OUT_DIR", "START_DATE", "END_DATE"]:
        globals()[_name] = locals().get(_name) if _name in locals() else globals().get(_name)

    for _name in ["OBJ", "TEMPLATE_PATH", "DB_PATH", "START_DATE", "END_DATE"]:
        if locals().get(_name) is None:
            raise NameError(f"Missing required variable: `{_name}`")

    # Ensure output dir exists
    OUT_DIR = OUT_HTML.parent
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # ---- Load the final shell HTML (created during Approve) ----
    html = TEMPLATE_PATH.read_text(encoding="utf-8")

    TOKEN_RE = re.compile(r"\{\{?\s*([A-Za-z0-9_\-\.]+)\s*\}\}?")
    TEMPLATE_TOKENS = {m.group(1) for m in TOKEN_RE.finditer(html)}

    # ---- Find ONE prototype repeating block ----
    explicit_blocks = list(_BATCH_BLOCK_ANY_TAG.finditer(html))
    if explicit_blocks:
        prototype_block = explicit_blocks[0].group(0).strip()
        start0 = explicit_blocks[0].start()
        end_last = explicit_blocks[-1].end()
    else:
        try:
            block_full, block_tag, _ = _find_or_infer_batch_block(html)
        except Exception as e:
            _raise_no_block(html, e)
        prototype_block = block_full.strip()
        start0 = html.find(block_full)
        if start0 < 0:
            _raise_no_block(html, RuntimeError("Inferred block could not be located in HTML via .find()"))
        end_last = start0 + len(block_full)

    shell_prefix = html[:start0]
    shell_suffix = html[end_last:]

    BEGIN_TAG = "<!-- BEGIN:BATCH (auto) -->"
    END_TAG   = "<!-- END:BATCH (auto) -->"
    shell_prefix += BEGIN_TAG
    shell_suffix = END_TAG + shell_suffix

    # ---- Unpack contract ----
    OBJ = OBJ or {}
    PLACEHOLDER_TO_COL = OBJ.get("mapping", {})
    JOIN               = OBJ.get("join", {})
    DATE_COLUMNS       = OBJ.get("date_columns", {})
    HEADER_TOKENS      = OBJ.get("header_tokens", [])
    ROW_TOKENS         = OBJ.get("row_tokens", [])
    TOTALS             = OBJ.get("totals", {})
    ROW_ORDER          = OBJ.get("row_order", ["ROWID"])
    LITERALS           = dict(OBJ.get("literals", {}))

    parent_table = JOIN.get("parent_table", "")
    parent_key   = JOIN.get("parent_key", "")
    child_table  = JOIN.get("child_table", "")
    child_key    = JOIN.get("child_key", "")
    parent_date  = DATE_COLUMNS.get(parent_table, "")
    child_date   = DATE_COLUMNS.get(child_table, "")
    order_col    = ROW_ORDER[0] if ROW_ORDER else "ROWID"

    def _normalize_token_name(name: str) -> str:
        return re.sub(r'[^a-z0-9]', '', name.lower())

    token_index: dict[str, set[str]] = defaultdict(set)
    all_candidate_tokens = set(TEMPLATE_TOKENS) | set(HEADER_TOKENS) | set(ROW_TOKENS) | set(TOTALS.keys()) | set(LITERALS.keys())
    for tok in all_candidate_tokens:
        norm = _normalize_token_name(tok)
        if norm:
            token_index[norm].add(tok)

    def _tokens_for_keys(keys: set[str]) -> set[str]:
        found: set[str] = set()
        for key in keys:
            found.update(token_index.get(key, set()))
        return found

    def _parse_date_like(value) -> datetime | None:
        if value is None:
            return None
        val = str(value).strip()
        if not val:
            return None
        iso_try = val.replace('Z', '+00:00')
        if ' ' in iso_try and 'T' not in iso_try:
            iso_try = iso_try.replace(' ', 'T', 1)
        try:
            return datetime.fromisoformat(iso_try)
        except ValueError:
            pass
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue
        return None

    def _has_time_component(raw_value, dt_obj: datetime | None) -> bool:
        if dt_obj and (dt_obj.hour or dt_obj.minute or dt_obj.second):
            return True
        if not raw_value:
            return False
        return bool(re.search(r'[ T]\d{2}:\d{2}', str(raw_value)))

    def _format_for_token(token: str, dt_obj: datetime | None, include_time_default: bool = False) -> str:
        if not dt_obj:
            return ""
        include_time = include_time_default or ('time' in token.lower())
        return dt_obj.strftime("%d/%m/%Y %H:%M") if include_time else dt_obj.strftime("%d/%m/%Y")

    start_dt = _parse_date_like(START_DATE)
    end_dt = _parse_date_like(END_DATE)
    print_dt = datetime.now()

    start_has_time = _has_time_component(START_DATE, start_dt)
    end_has_time = _has_time_component(END_DATE, end_dt)

    START_DATE_KEYS = {"fromdate", "datefrom", "startdate", "periodstart", "rangefrom", "fromdt", "startdt"}
    END_DATE_KEYS   = {"todate", "dateto", "enddate", "periodend", "rangeto", "todt", "enddt"}
    PRINT_DATE_KEYS = {"printdate", "printedon", "printeddate", "generatedon", "generateddate", "rundate", "runon", "generatedat"}
    PAGE_NO_KEYS    = {"pageno", "pagenumber", "pageindex", "pagecurrent"}
    PAGE_COUNT_KEYS = {"pagecount", "totalpages", "pagestotal", "pages"}

    special_values: dict[str, str] = {}

    for tok in _tokens_for_keys(START_DATE_KEYS):
        special_values[tok] = _format_for_token(tok, start_dt, include_time_default=start_has_time)
    for tok in _tokens_for_keys(END_DATE_KEYS):
        special_values[tok] = _format_for_token(tok, end_dt, include_time_default=end_has_time)
    for tok in _tokens_for_keys(PRINT_DATE_KEYS):
        special_values[tok] = _format_for_token(tok, print_dt, include_time_default=False)

    page_number_tokens = _tokens_for_keys(PAGE_NO_KEYS)
    page_count_tokens = _tokens_for_keys(PAGE_COUNT_KEYS)

    for tok, val in list(special_values.items()):
        if tok in LITERALS:
            LITERALS[tok] = val

    post_literal_specials = {tok: val for tok, val in special_values.items() if tok not in LITERALS}

    _ident_re = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
    def qident(name: str) -> str:
        if _ident_re.match(name):
            return name
        safe = name.replace('"', '""')
        return f'"{safe}"'

    # ---- Composite-key helpers ----
    def _parse_key_cols(key_spec: str) -> list[str]:
        return [c.strip() for c in str(key_spec).split(",") if c and c.strip()]

    def _key_expr(cols: list[str]) -> str:
        parts = [f"COALESCE(CAST({qident(c)} AS TEXT),'')" for c in cols]
        if not parts:
            return "''"
        expr = parts[0]
        for p in parts[1:]:
            expr = f"{expr} || '|' || {p}"
        return expr

    def _split_bid(bid: str, n: int) -> list[str]:
        parts = str(bid).split("|")
        if len(parts) != n:
            raise ValueError(f"Composite key mismatch: expected {n} parts, got {len(parts)} in {bid!r}")
        return parts

    def _looks_like_composite_id(x: str, n: int) -> bool:
        return isinstance(x, str) and x.count("|") == (n - 1)

    pcols = _parse_key_cols(parent_key)
    ccols = _parse_key_cols(child_key)

    # --- Date predicates and adapters (handle missing/invalid date columns)
    parent_type = _get_col_type(DB_PATH, parent_table, parent_date)
    child_type  = _get_col_type(DB_PATH, child_table,  child_date)
    parent_pred, adapt_parent = _mk_between_pred_for_date(parent_date, parent_type)
    child_pred,  adapt_child  = _mk_between_pred_for_date(child_date,  child_type)
    PDATE = adapt_parent(START_DATE, END_DATE)  # () if 1=1
    CDATE = adapt_child(START_DATE, END_DATE)   # () if 1=1

    # ---- Normalize / auto-discover BATCH_IDS ----
    need_discover = False
    existing = batch_ids

    if isinstance(existing, str):
        existing = [existing]

    if not existing:
        need_discover = True
    else:
        if not isinstance(existing, (list, tuple)):
            need_discover = True
        else:
            existing = list(existing)
            if len(pcols) > 1:
                if any(not _looks_like_composite_id(i, len(pcols)) for i in existing):
                    print("ℹ️ Provided BATCH_IDS do not match composite key format; falling back to auto-discovery.")
                    need_discover = True

    if need_discover:
        with sqlite3.connect(str(DB_PATH)) as con:
            con.row_factory = sqlite3.Row
            cur = con.cursor()

            # Parent discovery
            if len(pcols) == 1:
                parent_sql = f"""
                    SELECT DISTINCT {qident(pcols[0])} AS bid
                    FROM {qident(parent_table)}
                    WHERE {parent_pred}
                """
                parent_ids = [r["bid"] for r in cur.execute(parent_sql, PDATE)]
            else:
                parent_sql = f"""
                    SELECT DISTINCT {_key_expr(pcols)} AS bid
                    FROM {qident(parent_table)}
                    WHERE {parent_pred}
                """
                parent_ids = [r["bid"] for r in cur.execute(parent_sql, PDATE)]

            # Child discovery
            if len(ccols) == 1:
                child_sql = f"""
                    SELECT DISTINCT {qident(ccols[0])} AS bid
                    FROM {qident(child_table)}
                    WHERE {child_pred}
                """
                child_ids = [r["bid"] for r in cur.execute(child_sql, CDATE)]
            else:
                child_sql = f"""
                    SELECT DISTINCT {_key_expr(ccols)} AS bid
                    FROM {qident(child_table)}
                    WHERE {child_pred}
                """
                child_ids = [r["bid"] for r in cur.execute(child_sql, CDATE)]

            all_ids = sorted({str(x) for x in (parent_ids + child_ids)})

            if len(all_ids) <= 1:
                # Relax discovery if filtered too tightly by date
                if len(pcols) == 1:
                    p_all = f"SELECT DISTINCT {qident(pcols[0])} AS bid FROM {qident(parent_table)}"
                else:
                    p_all = f"SELECT DISTINCT {_key_expr(pcols)} AS bid FROM {qident(parent_table)}"
                if len(ccols) == 1:
                    c_all = f"SELECT DISTINCT {qident(ccols[0])} AS bid FROM {qident(child_table)}"
                else:
                    c_all = f"SELECT DISTINCT {_key_expr(ccols)} AS bid FROM {qident(child_table)}"
                parent_ids = [r["bid"] for r in cur.execute(p_all)]
                child_ids  = [r["bid"] for r in cur.execute(c_all)]
                all_ids = sorted({str(x) for x in (parent_ids + child_ids)})

            BATCH_IDS = all_ids
    else:
        BATCH_IDS = existing

    print("🔎 BATCH_IDS:", len(BATCH_IDS or []), (BATCH_IDS or [])[:20] if BATCH_IDS else [])

    # ---- Only touch tokens outside <style>/<script> ----
    STYLE_OR_SCRIPT_RE = re.compile(r"(?is)(<style\b[^>]*>.*?</style>|<script\b[^>]*>.*?</script>)")

    def _apply_outside_styles_scripts(html_in: str, transform_fn):
        parts = STYLE_OR_SCRIPT_RE.split(html_in)
        for i in range(len(parts)):
            if i % 2 == 0:
                parts[i] = transform_fn(parts[i])
        return "".join(parts)

    def _sub_token_text(text: str, token: str, val: str) -> str:
        pat = re.compile(r"(\{\{\s*" + re.escape(token) + r"\s*\}\}|\{\s*" + re.escape(token) + r"\s*\})")
        return pat.sub(val, text)

    def sub_token(html_in: str, token: str, val: str) -> str:
        return _apply_outside_styles_scripts(html_in, lambda txt: _sub_token_text(txt, token, val))

    def _inject_page_counter_spans(html_in: str, page_tokens: set[str], count_tokens: set[str]) -> str:
        updated = html_in
        for tok in page_tokens:
            updated = sub_token(updated, tok, '<span class="nr-page-number"></span>')
        for tok in count_tokens:
            updated = sub_token(updated, tok, '<span class="nr-page-count"></span>')

        if (page_tokens or count_tokens) and 'nr-page-counter-style' not in updated:
            style_block = """
<style id="nr-page-counter-style">
  .nr-page-number::after { content: counter(page); }
  .nr-page-count::after { content: counter(pages); }
  .nr-page-number, .nr-page-count { white-space: nowrap; }
</style>
"""
            if '</head>' in updated:
                updated = updated.replace('</head>', style_block + '</head>', 1)
            else:
                updated = style_block + updated
        return updated

    def _blank_known_tokens_text(text: str, tokens) -> str:
        for t in tokens:
            text = re.sub(r"\{\{\s*" + re.escape(t) + r"\s*\}\}", "", text)
            text = re.sub(r"\{\s*" + re.escape(t) + r"\s*\}", "", text)
        return text

    def blank_known_tokens(html_in: str, tokens) -> str:
        return _apply_outside_styles_scripts(html_in, lambda txt: _blank_known_tokens_text(txt, tokens))

    # ---- Helpers to find tbody / row template (improved) ----
    def best_rows_tbody(inner_html: str, allowed_tokens: set):
        tbodys = list(re.finditer(r'(?is)<tbody\b[^>]*>(.*?)</tbody>', inner_html))
        best = (None, None, -1)  # (match, inner, hits)
        for m in tbodys:
            tin = m.group(1)
            hits = 0
            for trm in re.finditer(r"(?is)<tr\b[^>]*>.*?</tr>", tin):
                tr_html = trm.group(0)
                toks = re.findall(r"\{\{\s*([^}\n]+?)\s*\}\}|\{\s*([^}\n]+?)\s*\}", tr_html)
                flat = [a.strip() if a else b.strip() for (a, b) in toks]
                hits += sum(1 for t in flat if t in allowed_tokens)
            if hits > best[2]:
                best = (m, tin, hits)
        if best[0] is not None:
            return best[0], best[1]
        return (tbodys[0], tbodys[0].group(1)) if tbodys else (None, None)

    def find_row_template(tbody_inner: str, allowed_tokens: set):
        for m in re.finditer(r"(?is)<tr\b[^>]*>.*?</tr>", tbody_inner):
            tr_html = m.group(0)
            toks = re.findall(r"\{\{\s*([^}\n]+?)\s*\}\}|\{\s*([^}\n]+?)\s*\}", tr_html)
            flat = []
            for a, b in toks:
                if a: flat.append(a.strip())
                if b: flat.append(b.strip())
            flat = [t for t in flat if t in allowed_tokens]
            if flat:
                return tr_html, (m.start(0), m.end(0)), sorted(set(flat), key=len, reverse=True)
        return None, None, []

    def majority_table_for_tokens(tokens, mapping):
        from collections import Counter
        tbls = []
        for t in tokens:
            tc = mapping.get(t, "")
            if "." in tc:
                tbls.append(tc.split(".", 1)[0])
        return Counter(tbls).most_common(1)[0][0] if tbls else None

    # ---- Pre-compute minimal column sets ----
    header_cols = sorted({ PLACEHOLDER_TO_COL[t].split(".", 1)[1] for t in HEADER_TOKENS if t in PLACEHOLDER_TO_COL })
    row_cols    = sorted({ PLACEHOLDER_TO_COL[t].split(".", 1)[1] for t in ROW_TOKENS    if t in PLACEHOLDER_TO_COL })

    totals_by_table = defaultdict(lambda: defaultdict(list))
    total_token_to_target = {}

    for token, raw_target in TOTALS.items():
        target = (raw_target or PLACEHOLDER_TO_COL.get(token, "")).strip()
        if not target or "." not in target:
            continue
        table_name, col_name = [part.strip() for part in target.split(".", 1)]
        if not table_name or not col_name:
            continue
        totals_by_table[table_name][col_name].append(token)
        total_token_to_target[token] = (table_name, col_name)

    def _coerce_total_value(raw):
        try:
            fv = float(raw)
            if not math.isfinite(fv):
                raise ValueError
        except Exception:
            return None, "0"
        return fv, str(int(fv)) if fv.is_integer() else str(fv)

    totals_accum = defaultdict(float)
    last_totals_per_token = {token: "0" for token in TOTALS}

    child_totals_cols = {col: list(tokens) for col, tokens in totals_by_table.get(child_table, {}).items()}
    # ---- Render all batches ----
    rendered_blocks = []
    for batch_id in (BATCH_IDS or []):
        block_html = prototype_block

        # (a) Header fill (parent row)
        if header_cols:
            if len(pcols) == 1:
                sql = (
                    f"SELECT {', '.join(qident(c) for c in header_cols)} "
                    f"FROM {qident(parent_table)} "
                    f"WHERE {qident(pcols[0])} = ? AND {parent_pred} "
                    f"LIMIT 1"
                )
                hdr_params = (batch_id,) + tuple(PDATE)
            else:
                where = " AND ".join([f"{qident(c)} = ?" for c in pcols])
                sql = (
                    f"SELECT {', '.join(qident(c) for c in header_cols)} "
                    f"FROM {qident(parent_table)} "
                    f"WHERE {where} AND {parent_pred} "
                    f"LIMIT 1"
                )
                hdr_parts = _split_bid(batch_id, len(pcols))
                hdr_params = tuple(hdr_parts) + tuple(PDATE)

            con = sqlite3.connect(str(DB_PATH)); con.row_factory = sqlite3.Row
            cur = con.cursor(); cur.execute(sql, hdr_params)
            row = cur.fetchone(); con.close()
            if row:
                r = dict(row)
                for t in HEADER_TOKENS:
                    if t in PLACEHOLDER_TO_COL:
                        col = PLACEHOLDER_TO_COL[t].split(".", 1)[1]
                        val = r.get(col, "")
                        block_html = sub_token(block_html, t, "" if val is None else str(val))

        # (b) Row repeater (child rows)
        allowed_row_tokens = {t for t in PLACEHOLDER_TO_COL.keys() if t not in TOTALS} - set(HEADER_TOKENS)

        # Try standard tbody-based path first
        tbody_m, tbody_inner = best_rows_tbody(block_html, allowed_row_tokens)
        if tbody_m and tbody_inner:
            row_template, row_span, row_tokens_in_template = find_row_template(tbody_inner, allowed_row_tokens)
            if row_template and row_tokens_in_template:
                row_cols_needed = sorted({ PLACEHOLDER_TO_COL[t].split(".", 1)[1] for t in row_tokens_in_template })

                if order_col.upper() != "ROWID" and order_col not in row_cols_needed:
                    row_cols_needed.append(order_col)

                order_clause = f"ORDER BY ROWID" if order_col.upper() == "ROWID" else f"ORDER BY {qident(order_col)}, ROWID"

                if len(ccols) == 1:
                    sql = (
                        f"SELECT {', '.join(qident(c) for c in row_cols_needed)} "
                        f"FROM {qident(child_table)} "
                        f"WHERE {qident(ccols[0])} = ? AND {child_pred} "
                        f"{order_clause}"
                    )
                    row_params = (batch_id,) + tuple(CDATE)
                else:
                    where = " AND ".join([f"{qident(c)} = ?" for c in ccols])
                    sql = (
                        f"SELECT {', '.join(qident(c) for c in row_cols_needed)} "
                        f"FROM {qident(child_table)} "
                        f"WHERE {where} AND {child_pred} "
                        f"{order_clause}"
                    )
                    row_parts = _split_bid(batch_id, len(ccols))
                    row_params = tuple(row_parts) + tuple(CDATE)

                con = sqlite3.connect(str(DB_PATH)); con.row_factory = sqlite3.Row
                cur = con.cursor(); cur.execute(sql, row_params)
                rows = [dict(r) for r in cur.fetchall()]
                con.close()

                # Fallback: date-only by majority table if needed
                if not rows:
                    maj_table = majority_table_for_tokens(row_tokens_in_template, PLACEHOLDER_TO_COL)
                    if maj_table:
                        date_col = DATE_COLUMNS.get(maj_table, "")
                        if date_col:
                            cols_needed = sorted({ PLACEHOLDER_TO_COL[t].split(".",1)[1] for t in row_tokens_in_template })
                            if date_col not in cols_needed:
                                cols_needed.append(date_col)
                            sql_fb = (
                                f"SELECT {', '.join(qident(c) for c in cols_needed)} "
                                f"FROM {qident(maj_table)} "
                                f"WHERE datetime({qident(date_col)}) BETWEEN datetime(?) AND datetime(?) "
                                f"ORDER BY {qident(date_col)} ASC, ROWID ASC"
                            )
                            con = sqlite3.connect(str(DB_PATH)); con.row_factory = sqlite3.Row
                            cur = con.cursor(); cur.execute(sql_fb, (START_DATE, END_DATE))
                            rows = [dict(r) for r in cur.fetchall()]
                            con.close()
                            print(f"ℹ️ Row fallback used: table={maj_table}, rows={len(rows)}")

                parts = []
                for r in rows:
                    tr = row_template
                    for t in row_tokens_in_template:
                        col = PLACEHOLDER_TO_COL[t].split(".", 1)[1]
                        tr = sub_token(tr, t, "" if r.get(col) is None else str(r.get(col)))
                    parts.append(tr)

                new_tbody_inner = tbody_inner[:row_span[0]] + "\n".join(parts) + tbody_inner[row_span[1]:]
                block_html = block_html[:tbody_m.start(1)] + new_tbody_inner + block_html[tbody_m.end(1):]

        else:
            # Inferred single-<tr> block (no <tbody> path) — duplicate the <tr> itself
            tr_tokens = [m.group(1) or m.group(2)
                         for m in re.finditer(r"\{\{\s*([^}\n]+?)\s*\}\}|\{\s*([^}\n]+?)\s*\}", block_html)]
            tr_tokens = sorted({t.strip() for t in tr_tokens if t}, key=len, reverse=True)

            row_tokens_in_template = [t for t in tr_tokens if t in allowed_row_tokens]
            if row_tokens_in_template:
                row_cols_needed = sorted({ PLACEHOLDER_TO_COL[t].split(".", 1)[1] for t in row_tokens_in_template })
                if order_col.upper() != "ROWID" and order_col not in row_cols_needed:
                    row_cols_needed.append(order_col)
                order_clause = f"ORDER BY ROWID" if order_col.upper() == "ROWID" else f"ORDER BY {qident(order_col)}, ROWID"

                if len(ccols) == 1:
                    sql = (
                        f"SELECT {', '.join(qident(c) for c in row_cols_needed)} "
                        f"FROM {qident(child_table)} "
                        f"WHERE {qident(ccols[0])} = ? AND {child_pred} "
                        f"{order_clause}"
                    )
                    row_params = (batch_id,) + tuple(CDATE)
                else:
                    where = " AND ".join([f"{qident(c)} = ?" for c in ccols])
                    sql = (
                        f"SELECT {', '.join(qident(c) for c in row_cols_needed)} "
                        f"FROM {qident(child_table)} "
                        f"WHERE {where} AND {child_pred} "
                        f"{order_clause}"
                    )
                    row_parts = _split_bid(batch_id, len(ccols))
                    row_params = tuple(row_parts) + tuple(CDATE)

                con = sqlite3.connect(str(DB_PATH)); con.row_factory = sqlite3.Row
                cur = con.cursor(); cur.execute(sql, row_params)
                rows = [dict(r) for r in cur.fetchall()]
                con.close()

                parts = []
                for r in rows:
                    tr = prototype_block  # the <tr> itself
                    for t in row_tokens_in_template:
                        col = PLACEHOLDER_TO_COL[t].split(".", 1)[1]
                        tr = sub_token(tr, t, "" if r.get(col) is None else str(r.get(col)))
                    parts.append(tr)

                block_html = "\n".join(parts)

        # (c) Per-batch totals
        batch_total_values = {token: "0" for token in TOTALS}

        if child_totals_cols:
            child_cols = sorted(child_totals_cols.keys())
            if child_cols:
                exprs = ", ".join([f"COALESCE(SUM({qident(c)}),0) AS {qident(c)}" for c in child_cols])

                if len(ccols) == 1:
                    sql = (
                        f"SELECT {exprs} "
                        f"FROM {qident(child_table)} "
                        f"WHERE {qident(ccols[0])} = ? AND {child_pred}"
                    )
                    tot_params = (batch_id,) + tuple(CDATE)
                else:
                    where = " AND ".join([f"{qident(c)} = ?" for c in ccols])
                    sql = (
                        f"SELECT {exprs} "
                        f"FROM {qident(child_table)} "
                        f"WHERE {where} AND {child_pred}"
                    )
                    tot_parts = _split_bid(batch_id, len(ccols))
                    tot_params = tuple(tot_parts) + tuple(CDATE)

                con = sqlite3.connect(str(DB_PATH)); con.row_factory = sqlite3.Row
                cur = con.cursor(); cur.execute(sql, tot_params)
                sums = dict(cur.fetchone() or {}); con.close()

                for col in child_cols:
                    raw_val = sums.get(col, 0)
                    fv, formatted = _coerce_total_value(raw_val)
                    if fv is not None:
                        key = (child_table, col)
                        totals_accum[key] = totals_accum.get(key, 0.0) + fv
                    for token in child_totals_cols[col]:
                        batch_total_values[token] = formatted

        for token, value in batch_total_values.items():
            block_html = sub_token(block_html, token, value)
            last_totals_per_token[token] = value

        rendered_blocks.append(block_html)


    # ---- Assemble full document ----
    html_multi = shell_prefix + "\n".join(rendered_blocks) + shell_suffix

    for tok, val in post_literal_specials.items():
        html_multi = sub_token(html_multi, tok, val if val is not None else '')

    if page_number_tokens or page_count_tokens:
        html_multi = _inject_page_counter_spans(html_multi, page_number_tokens, page_count_tokens)

    if total_token_to_target:
        overall_formatted = {}
        for (table_name, col_name), total in totals_accum.items():
            _, formatted = _coerce_total_value(total)
            overall_formatted[(table_name, col_name)] = formatted

        for token, target in total_token_to_target.items():
            table_name, col_name = target
            value = overall_formatted.get((table_name, col_name), last_totals_per_token.get(token, "0"))
            html_multi = sub_token(html_multi, token, value)

    # Apply literals globally
    for t, s in LITERALS.items():
        html_multi = sub_token(html_multi, t, s)

    # Blank any remaining known tokens
    ALL_KNOWN_TOKENS = set(HEADER_TOKENS) | set(ROW_TOKENS) | set(TOTALS.keys()) | set(LITERALS.keys())
    html_multi = blank_known_tokens(html_multi, ALL_KNOWN_TOKENS)

    # write to the path requested by the API
    OUT_HTML.write_text(html_multi, encoding="utf-8")
    print("✅ Wrote HTML:", OUT_HTML)

    print("🔎 BATCH_IDS:", len(BATCH_IDS or []), (BATCH_IDS or [])[:20] if BATCH_IDS else [])

    async def html_to_pdf_async(html_path: Path, pdf_path: Path, base_dir: Path):
        if async_playwright is None:
            print("⚠️ Playwright not available; skipping PDF generation.")
            return

        html_source = html_path.read_text(encoding="utf-8", errors="ignore")
        base_url = (base_dir or html_path.parent).as_uri()

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            context = None
            try:
                context = await browser.new_context(base_url=base_url)
                page = await context.new_page()
                await page.set_content(html_source, wait_until="networkidle")
                await page.emulate_media(media="print")
                await page.pdf(
                    path=str(pdf_path),
                    format="A4",
                    print_background=True,
                    margin={"top": "10mm", "right": "10mm", "bottom": "10mm", "left": "10mm"},
                    prefer_css_page_size=True,
                )
            finally:
                if context is not None:
                    await context.close()
                await browser.close()

    asyncio.run(html_to_pdf_async(OUT_HTML, OUT_PDF, TEMPLATE_PATH.parent))
    print("✅ Wrote PDF via Playwright:", OUT_PDF)

    return {"html_path": str(OUT_HTML), "pdf_path": str(OUT_PDF)}


# keep CLI usage (unchanged)
if __name__ == "__main__":
    print("Module ready for API integration. Call fill_and_print(...) from your FastAPI endpoint.")
