# mypy: ignore-errors
import asyncio
import contextlib
import json
import os
import re
import sqlite3
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation
from itertools import product
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

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

from .contract_adapter import ContractAdapter, format_decimal_str
from .date_utils import get_col_type, mk_between_pred_for_date

# ------------------------------------------------------------------
# Tolerant batch-block detection + stripping (explicit/implicit)
# ------------------------------------------------------------------
_BATCH_BLOCK_ANY_TAG = re.compile(
    r"(?is)"
    r"<(?P<tag>section|div|article|main|tbody|tr)\b"
    r'[^>]*\bclass\s*=\s*["\'][^"\']*\bbatch-block\b[^"\']*["\']'
    r"[^>]*>"
    r"(?P<inner>.*?)"
    r"</(?P=tag)>"
)

_TOKEN_REGEX_CACHE: dict[str, re.Pattern] = {}
_TR_BLOCK_RE = re.compile(r"(?is)<tr\b[^>]*>.*?</tr>")


def _token_regex(token: str) -> re.Pattern:
    cleaned = (token or "").strip()
    if not cleaned:
        raise ValueError("Token must be a non-empty string")
    cached = _TOKEN_REGEX_CACHE.get(cleaned)
    if cached is None:
        cached = re.compile(rf"\{{\{{?\s*{re.escape(cleaned)}\s*\}}\}}?")
        _TOKEN_REGEX_CACHE[cleaned] = cached
    return cached


def _ensure_playwright_browsers_path() -> None:
    """
    Ensure packaged builds can reuse the system Playwright cache.
    """
    if os.environ.get("PLAYWRIGHT_BROWSERS_PATH"):
        return
    local_app = os.getenv("LOCALAPPDATA")
    if not local_app:
        return
    candidate = Path(local_app) / "ms-playwright"
    if candidate.exists():
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(candidate)


def _segment_has_any_token(segment: str, tokens: Iterable[str]) -> bool:
    for token in tokens:
        if not token:
            continue
        if _token_regex(token).search(segment):
            return True
    return False


def _find_rowish_block(html_text: str, row_tokens: Iterable[str]) -> tuple[str, int, int] | None:
    candidate_tokens = [tok for tok in row_tokens if isinstance(tok, str) and tok.strip()]
    if not candidate_tokens:
        return None

    matches = [m for m in _TR_BLOCK_RE.finditer(html_text) if _segment_has_any_token(m.group(0), candidate_tokens)]
    if not matches:
        return None

    prototype = matches[0].group(0).strip()
    start_index = matches[0].start()
    end_index = matches[-1].end()
    return prototype, start_index, end_index


def _select_prototype_block(html_text: str, row_tokens: Iterable[str]) -> tuple[str, int, int]:
    explicit_blocks = list(_BATCH_BLOCK_ANY_TAG.finditer(html_text))
    if explicit_blocks:
        chosen_match = explicit_blocks[0]
        if row_tokens:
            for match in explicit_blocks:
                if _segment_has_any_token(match.group(0), row_tokens):
                    chosen_match = match
                    break
        prototype = chosen_match.group(0).strip()
        start0 = explicit_blocks[0].start()
        end_last = explicit_blocks[-1].end()
        return prototype, start0, end_last

    rowish = _find_rowish_block(html_text, row_tokens)
    if rowish:
        return rowish

    block_full, _, _ = _find_or_infer_batch_block(html_text)
    start0 = html_text.find(block_full)
    if start0 < 0:
        raise RuntimeError("Inferred batch block could not be located in HTML via .find()")
    end_last = start0 + len(block_full)
    return block_full.strip(), start0, end_last


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
        return m.group(0), m.group("tag").lower(), m.group("inner")

    m_tbody = re.search(r"(?is)<tbody\b[^>]*>(?P<body>.*?)</tbody>", html_text)
    if m_tbody:
        tbody = m_tbody.group("body")
        m_tr = re.search(r"(?is)<tr\b[^>]*>(?P<tr>.*?)</tr>", tbody)
        if m_tr:
            return m_tr.group(0), "tr", m_tr.group("tr")

    m_div = re.search(r"(?is)<div\b[^>]*\b(row|item|card)\b[^>]*>(?P<inner>.*?)</div>", html_text)
    if m_div:
        return m_div.group(0), "div", m_div.group("inner")

    m_body = re.search(r"(?is)<body\b[^>]*>(?P<body>.*?)</body>", html_text)
    if m_body:
        body = m_body.group("body")
        m_cont = re.search(r"(?is)<(section|main|div|article)\b[^>]*>(?P<inner>.*?)</\1>", body)
        if m_cont:
            return m_cont.group(0), m_cont.group(1).lower(), m_cont.group("inner")

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
    sec_tags = re.findall(r"(?is)<section\b[^>]*>", html)
    preview_lines = []
    for i, t in enumerate(sec_tags[:12]):
        snip = t[:140].replace("\n", " ")
        preview_lines.append(f'{i+1:02d}: {snip}{" ..." if len(t) > 140 else ""}')
    preview = "\n".join(preview_lines)
    msg = (
        "Could not find any <section class='batch-block'> blocks and no suitable fallback could be inferred.\n"
        "First few <section> tags present:\n" + preview
    )
    raise ValueError(msg) from cause


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
    KEY_VALUES: dict | None = None,
    GENERATOR_BUNDLE: dict | None = None,
    __force_single: bool = False,
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
    for name in ("OBJ", "TEMPLATE_PATH", "DB_PATH", "START_DATE", "END_DATE"):
        if locals().get(name) is None:
            raise NameError(f"Missing required variable: `{name}`")

    # Ensure output dir exists
    OUT_DIR = OUT_HTML.parent
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    log_file_path = Path(__file__).with_name("fill_and_print.log")

    def _log_debug(*parts: object) -> None:
        message = " ".join(str(part) for part in parts)
        print(message)
        try:
            with log_file_path.open("a", encoding="utf-8") as fh:
                fh.write(f"[{datetime.now().isoformat()}] {message}\n")
        except Exception:
            pass

    _log_debug(
        "=== fill_and_print call ===",
        "force_single" if __force_single else "fanout_root",
        "KEY_VALUES raw=",
        KEY_VALUES or {},
    )

    # ---- Load the final shell HTML (created during Approve) ----
    html = TEMPLATE_PATH.read_text(encoding="utf-8")

    TOKEN_RE = re.compile(r"\{\{?\s*([A-Za-z0-9_\-\.]+)\s*\}\}?")
    TEMPLATE_TOKENS = {m.group(1) for m in TOKEN_RE.finditer(html)}

    # ---- Unpack contract ----
    OBJ = OBJ or {}
    contract_adapter = ContractAdapter(OBJ)

    PLACEHOLDER_TO_COL = contract_adapter.mapping

    join_raw = OBJ.get("join", {}) or {}
    JOIN = {
        "parent_table": contract_adapter.parent_table or join_raw.get("parent_table", ""),
        "child_table": contract_adapter.child_table or join_raw.get("child_table", ""),
        "parent_key": contract_adapter.parent_key or join_raw.get("parent_key", ""),
        "child_key": contract_adapter.child_key or join_raw.get("child_key", ""),
    }

    DATE_COLUMNS = contract_adapter.date_columns or (OBJ.get("date_columns", {}) or {})

    HEADER_TOKENS = contract_adapter.scalar_tokens or OBJ.get("header_tokens", [])
    ROW_TOKENS = contract_adapter.row_tokens or OBJ.get("row_tokens", [])
    TOTALS = contract_adapter.totals_mapping or OBJ.get("totals", {})
    ROW_ORDER = contract_adapter.row_order or OBJ.get("row_order", ["ROWID"])
    LITERALS = {
        str(token): "" if value is None else str(value) for token, value in (OBJ.get("literals", {}) or {}).items()
    }
    FORMATTERS = contract_adapter.formatters
    key_values_map: dict[str, list[str]] = {}
    if KEY_VALUES:
        for token, raw_value in KEY_VALUES.items():
            name = str(token or "").strip()
            if not name:
                continue
            values: list[str] = []
            if isinstance(raw_value, (list, tuple, set)):
                seen = set()
                for item in raw_value:
                    text = str(item or "").strip()
                    if text and text not in seen:
                        seen.add(text)
                        values.append(text)
            else:
                text = str(raw_value or "").strip()
                if text:
                    values = [text]
            if values:
                key_values_map[name] = values

    _DIRECT_COLUMN_RE = re.compile(r"^(?P<table>[A-Za-z_][\w]*)\.(?P<column>[A-Za-z_][\w]*)$")
    _SQL_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

    def _safe_ident(name: str) -> str:
        if _SQL_IDENT_RE.match(name):
            return name
        safe = str(name).replace('"', '""')
        return f'"{safe}"'

    def _resolve_token_column(token: str) -> tuple[str, str] | None:
        mapping_expr = PLACEHOLDER_TO_COL.get(token)
        if isinstance(mapping_expr, str):
            match = _DIRECT_COLUMN_RE.match(mapping_expr.strip())
            if match:
                return match.group("table"), match.group("column")
        required_filters = contract_adapter.required_filters
        optional_filters = contract_adapter.optional_filters
        filter_expr = (required_filters.get(token) or optional_filters.get(token) or "").strip()
        match = _DIRECT_COLUMN_RE.match(filter_expr)
        if match:
            return match.group("table"), match.group("column")
        return None

    def _canonicalize_case(table: str, column: str, raw_value: str) -> str:
        cache_key = (table.lower(), column.lower(), raw_value.lower())
        if cache_key in _canonicalize_cache:
            return _canonicalize_cache[cache_key]
        table_ident = _safe_ident(table)
        column_ident = _safe_ident(column)
        sql = f"SELECT {column_ident} FROM {table_ident} " f"WHERE {column_ident} = ? COLLATE NOCASE LIMIT 1"
        canonical = raw_value
        con = sqlite3.connect(str(DB_PATH))
        try:
            cur = con.cursor()
            row = cur.execute(sql, (raw_value,)).fetchone()
            if row and row[0] is not None:
                canonical = str(row[0])
        except sqlite3.Error:
            canonical = raw_value
        finally:
            con.close()
        _canonicalize_cache[cache_key] = canonical
        return canonical

    _canonicalize_cache: dict[tuple[str, str, str], str] = {}

    for token, values in list(key_values_map.items()):
        resolved = _resolve_token_column(token)
        if not resolved:
            continue
        table_name, column_name = resolved
        if not table_name or not column_name:
            continue
        updated_values: list[str] = []
        changed = False
        for value in values:
            if not isinstance(value, str) or not value.strip():
                updated_values.append(value)
                continue
            canon = _canonicalize_case(table_name, column_name, value.strip())
            if canon != value:
                changed = True
            updated_values.append(canon)
        if changed:
            key_values_map[token] = updated_values

    for token, values in key_values_map.items():
        LITERALS[token] = ", ".join(values)

    multi_key_selected = any(len(values) > 1 for values in key_values_map.values())

    _log_debug("Normalized key_values_map", key_values_map, "multi_key_selected", multi_key_selected)

    def _first_key_value(values: list[str]) -> str | None:
        for val in values:
            text = str(val or "").strip()
            if text:
                return text
        return None

    def _iter_key_combinations(values_map: dict[str, list[str]]) -> Iterable[dict[str, str]]:
        if not values_map:
            yield {}
            return
        tokens: list[str] = []
        value_lists: list[list[str]] = []
        for token, raw_values in values_map.items():
            unique: list[str] = []
            seen_local: set[str] = set()
            for val in raw_values:
                text = str(val or "").strip()
                if not text or text in seen_local:
                    continue
                seen_local.add(text)
                unique.append(text)
            if unique:
                tokens.append(token)
                value_lists.append(unique)
        if not tokens:
            yield {}
            return
        for combo in product(*value_lists):
            yield {token: value for token, value in zip(tokens, combo)}

    async def html_to_pdf_async(html_path: Path, pdf_path: Path, base_dir: Path):
        if async_playwright is None:
            print("Playwright not available; skipping PDF generation.")
            return

        _ensure_playwright_browsers_path()

        html_source = html_path.read_text(encoding="utf-8", errors="ignore")
        base_url = (base_dir or html_path.parent).as_uri()

        try:
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
        except Exception as exc:
            print(f"Playwright failed to render PDF ({exc}); skipping PDF generation.")
            return

    def _combine_html_documents(html_sections: list[str]) -> str:
        if not html_sections:
            return ""
        combined_body: list[str] = []
        doc_type = ""
        head_html = ""

        head_pattern = re.compile(r"(?is)<head\b[^>]*>(?P<head>.*)</head>")
        body_pattern = re.compile(r"(?is)<body\b[^>]*>(?P<body>.*)</body>")
        doctype_pattern = re.compile(r"(?is)^\s*<!DOCTYPE[^>]*>", re.MULTILINE)

        for idx, raw_html in enumerate(html_sections):
            text = raw_html or ""
            if idx == 0:
                doctype_match = doctype_pattern.search(text)
                if doctype_match:
                    doc_type = doctype_match.group(0).strip()
                    text = text[doctype_match.end() :]
                head_match = head_pattern.search(text)
                if head_match:
                    head_html = head_match.group(0).strip()
                body_match = body_pattern.search(text)
                if body_match:
                    section_body = body_match.group("body").strip()
                else:
                    section_body = text.strip()
                combined_body.append(f'<div class="nr-key-section" data-nr-section="1">\n{section_body}\n</div>')
            else:
                body_match = body_pattern.search(text)
                section = body_match.group("body").strip() if body_match else text.strip()
                combined_body.append(
                    f'<div class="nr-key-section" data-nr-section="{idx + 1}" style="page-break-before: always;">\n{section}\n</div>'
                )

        doc_lines = []
        if doc_type:
            doc_lines.append(doc_type)
        doc_lines.append("<html>")
        if head_html:
            doc_lines.append(head_html)
        doc_lines.append("<body>")
        doc_lines.append("\n\n".join(combined_body))
        doc_lines.append("</body>")
        doc_lines.append("</html>")
        return "\n".join(doc_lines)

    def _value_has_content(value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, (int, float, Decimal)):
            return value != 0
        text = str(value).strip()
        if not text:
            return False
        try:
            num = Decimal(text)
        except Exception:
            return True
        else:
            return num != 0

    def _row_has_significant_data(row: Mapping[str, Any], columns: list[str]) -> bool:
        return _row_has_any_data(row, (), columns)

    def _token_values_have_data(row: Mapping[str, Any], tokens: list[str]) -> bool:
        return _row_has_any_data(row, tokens, ())

    def _row_has_any_data(row: Mapping[str, Any], tokens: Sequence[str], columns: Sequence[str]) -> bool:
        for token in tokens:
            if not token:
                continue
            if _value_has_content(_value_for_token(row, token)):
                return True
        for col in columns:
            if not col:
                continue
            if _value_has_content(row.get(col)):
                return True
        return False

    def _is_serial_label(name: str | None) -> bool:
        if not name:
            return False
        lower = str(name).lower()
        return any(keyword in lower for keyword in ("row", "serial", "sl"))

    def _reindex_serial_fields(rows: list[dict], tokens: Sequence[str], columns: Sequence[str]) -> None:
        serial_tokens = [tok for tok in tokens if _is_serial_label(tok)]
        serial_columns = [col for col in columns if _is_serial_label(col)]
        if not serial_tokens and not serial_columns:
            return
        for idx, row in enumerate(rows, start=1):
            for tok in serial_tokens:
                row[tok] = idx
            for col in serial_columns:
                row[col] = idx

    def _value_for_token(row: Mapping[str, Any], token: str) -> Any:
        if not token:
            return None
        if token in row:
            return row[token]
        normalized = str(token).lower()
        for key in row.keys():
            if isinstance(key, str) and key.lower() == normalized:
                return row[key]
        mapped = PLACEHOLDER_TO_COL.get(token)
        if mapped:
            col = _extract_col_name(mapped)
            if col:
                if col in row:
                    return row[col]
                for key in row.keys():
                    if isinstance(key, str) and key.lower() == col.lower():
                        return row[key]
        return None

    def _prune_placeholder_rows(rows: Sequence[Mapping[str, Any]], tokens: Sequence[str]) -> list[dict[str, Any]]:
        material_tokens = [tok for tok in tokens if tok and "material" in tok.lower()]
        pruned: list[dict[str, Any]] = []
        for row in rows:
            keep = True
            for tok in material_tokens:
                if not _value_has_content(_value_for_token(row, tok)):
                    keep = False
                    break
            if keep:
                pruned.append(dict(row))
        return pruned if pruned else [dict(row) for row in rows]

    def _filter_rows_for_render(
        rows: Sequence[Mapping[str, Any]],
        row_tokens_template: Sequence[str],
        row_columns: Sequence[str],
        *,
        treat_all_as_data: bool,
    ) -> list[dict[str, Any]]:
        if not rows:
            return []

        if treat_all_as_data:
            prepared = [dict(row) for row in rows]
        else:
            significant_tokens = [
                tok
                for tok in row_tokens_template
                if tok and not any(keyword in tok.lower() for keyword in ("row", "serial", "sl"))
            ]
            significant_columns = [
                col
                for col in row_columns
                if col and not any(keyword in col.lower() for keyword in ("row", "serial", "sl"))
            ]
            prepared: list[dict[str, Any]] = []
            for row in rows:
                if significant_tokens or significant_columns:
                    if not _row_has_any_data(row, significant_tokens, significant_columns):
                        continue
                prepared.append(dict(row))

        if prepared:
            _reindex_serial_fields(prepared, row_tokens_template, row_columns)
        return prepared

    if multi_key_selected and not __force_single:
        html_sections: list[str] = []
        tmp_outputs: list[tuple[Path, Path]] = []
        try:
            for idx, combo in enumerate(_iter_key_combinations(key_values_map), start=1):
                selection: dict[str, str] = {token: value for token, value in combo.items()}
                _log_debug("Fanout iteration", idx, "selection", selection)
                tmp_html = OUT_HTML.with_name(f"{OUT_HTML.stem}__key{idx}.html")
                tmp_pdf = OUT_PDF.with_name(f"{OUT_PDF.stem}__key{idx}.pdf")
                result = fill_and_print(
                    OBJ=OBJ,
                    TEMPLATE_PATH=TEMPLATE_PATH,
                    DB_PATH=DB_PATH,
                    OUT_HTML=tmp_html,
                    OUT_PDF=tmp_pdf,
                    START_DATE=START_DATE,
                    END_DATE=END_DATE,
                    batch_ids=None,
                    IMAGE_CONTENTS=IMAGE_CONTENTS,
                    KEY_VALUES=selection or None,
                    GENERATOR_BUNDLE=GENERATOR_BUNDLE,
                    __force_single=True,
                )
                html_sections.append(Path(result["html_path"]).read_text(encoding="utf-8", errors="ignore"))
                tmp_outputs.append((Path(result["html_path"]), Path(result["pdf_path"])))

            if not html_sections:
                return {"html_path": str(OUT_HTML), "pdf_path": str(OUT_PDF), "rows_rendered": False}

            combined_html = _combine_html_documents(html_sections)
            OUT_HTML.write_text(combined_html, encoding="utf-8")
            asyncio.run(html_to_pdf_async(OUT_HTML, OUT_PDF, TEMPLATE_PATH.parent))
            return {"html_path": str(OUT_HTML), "pdf_path": str(OUT_PDF), "rows_rendered": True}
        finally:
            for tmp_html_path, tmp_pdf_path in tmp_outputs:
                for path_sel in (tmp_html_path, tmp_pdf_path):
                    with contextlib.suppress(FileNotFoundError):
                        path_sel.unlink()

    def _get_literal_raw(token: str) -> str:
        if token not in LITERALS:
            return ""
        raw = LITERALS[token]
        return "" if raw is None else str(raw)

    def _literal_has_content(token: str) -> bool:
        return bool(_get_literal_raw(token).strip())

    def _first_nonempty_literal(tokens: Iterable[str]) -> tuple[str | None, str | None]:
        for tok in tokens:
            raw = _get_literal_raw(tok)
            if raw.strip():
                return tok, raw
        return None, None

    def _record_special_value(target: dict[str, str], token: str, value: str) -> None:
        existing_raw = _get_literal_raw(token)
        if existing_raw.strip():
            target[token] = existing_raw
        else:
            target[token] = value
            if token in LITERALS:
                LITERALS[token] = value

    def _filter_tokens_without_literal(tokens: set[str]) -> set[str]:
        return {tok for tok in tokens if not _literal_has_content(tok)}

    BEGIN_TAG = "<!-- BEGIN:BATCH (auto) -->"
    END_TAG = "<!-- END:BATCH (auto) -->"
    try:
        prototype_block, start0, end_last = _select_prototype_block(html, ROW_TOKENS)
    except Exception as exc:
        _raise_no_block(html, exc)
    shell_prefix = html[:start0] + BEGIN_TAG
    shell_suffix = END_TAG + html[end_last:]

    parent_table = JOIN.get("parent_table", "")
    parent_key = JOIN.get("parent_key", "")
    child_table = JOIN.get("child_table", "")
    child_key = JOIN.get("child_key", "")
    parent_date = DATE_COLUMNS.get(parent_table, "")
    child_date = DATE_COLUMNS.get(child_table, "")
    order_col = ROW_ORDER[0] if ROW_ORDER else "ROWID"

    def _normalize_token_name(name: str) -> str:
        return re.sub(r"[^a-z0-9]", "", name.lower())

    token_index: dict[str, set[str]] = defaultdict(set)
    all_candidate_tokens = (
        set(TEMPLATE_TOKENS) | set(HEADER_TOKENS) | set(ROW_TOKENS) | set(TOTALS.keys()) | set(LITERALS.keys())
    )

    def _token_synonym_keys(norm: str) -> set[str]:
        """
        Generate lightweight normalization aliases so that abbreviated tokens like
        `pg_total` or `page_num` still map onto the same lookup keys as their
        longer forms without needing every variant enumerated manually.
        """
        if not norm:
            return set()
        aliases = {norm}
        replacements: tuple[tuple[str, str], ...] = (
            ("pg", "page"),
            ("num", "number"),
            ("no", "number"),
            ("cnt", "count"),
            ("ttl", "total"),
        )
        for src, dest in replacements:
            if src in norm and dest not in norm:
                aliases.add(norm.replace(src, dest))
        # Avoid generating implausible short aliases (e.g., converting a lone "no"
        # in tokens unrelated to pagination), but include a fallback where a token
        # is exactly "pg" so that later lookups on "page" resolve.
        if norm == "pg":
            aliases.add("page")
        return {alias for alias in aliases if alias}

    for tok in all_candidate_tokens:
        norm = _normalize_token_name(tok)
        for key in _token_synonym_keys(norm):
            token_index[key].add(tok)

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

        iso_try = val.replace("Z", "+00:00")
        if " " in iso_try and "T" not in iso_try:
            iso_try = iso_try.replace(" ", "T", 1)
        try:
            return datetime.fromisoformat(iso_try)
        except ValueError:
            pass

        if re.fullmatch(r"\d{10,}", val):
            try:
                seconds = int(val)
                if len(val) > 10:
                    scale = 10 ** (len(val) - 10)
                    return datetime.fromtimestamp(seconds / scale)
                return datetime.fromtimestamp(seconds)
            except ValueError:
                pass

        try:
            from email.utils import parsedate_to_datetime
        except ImportError:  # pragma: no cover
            parsedate_to_datetime = None  # type: ignore

        if parsedate_to_datetime is not None:
            try:
                dt = parsedate_to_datetime(val)
                if dt:
                    return dt if dt.tzinfo is None else dt.astimezone()
            except (TypeError, ValueError):
                pass

        candidates = [
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%d-%m-%Y",
            "%m-%d-%Y",
            "%d.%m.%Y",
            "%d %b %Y",
            "%d %B %Y",
            "%b %d %Y",
            "%B %d %Y",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
            "%Y/%m/%d %H:%M:%S",
            "%d/%m/%Y %H:%M",
            "%d/%m/%Y %H:%M:%S",
            "%m/%d/%Y %H:%M",
            "%m/%d/%Y %H:%M:%S",
            "%d-%m-%Y %H:%M",
            "%d-%m-%Y %H:%M:%S",
            "%d.%m.%Y %H:%M",
            "%d.%m.%Y %H:%M:%S",
            "%d %b %Y %H:%M",
            "%d %b %Y %H:%M:%S",
            "%d %B %Y %H:%M",
            "%d %B %Y %H:%M:%S",
            "%b %d %Y %H:%M",
            "%b %d %Y %H:%M:%S",
        ]
        for fmt in candidates:
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue
        return None

    def _has_time_component(raw_value, dt_obj: datetime | None) -> bool:
        if dt_obj and (dt_obj.hour or dt_obj.minute or dt_obj.second or dt_obj.microsecond):
            return True
        if raw_value is None:
            return False
        text = str(raw_value)
        if re.search(r"\d{1,2}:\d{2}", text):
            return True
        if re.search(r"\b(am|pm)\b", text, flags=re.IGNORECASE):
            return True
        if "T" in text or "t" in text:
            return True
        return False

    def _format_for_token(token: str, dt_obj: datetime | None, include_time_default: bool = False) -> str:
        if not dt_obj:
            return ""

        token_lower = token.lower()
        token_clean = re.sub(r"[^a-z0-9]", "", token_lower)

        def _has(*needles: str) -> bool:
            return any(needle in token_clean for needle in needles)

        include_time = include_time_default or _has("time", "clock", "datetime", "timestamp")
        include_seconds = _has("second", "seconds", "sec", "timestamp", "precise", "fulltime")
        use_ampm = _has("ampm", "12h", "twelvehour")
        if include_seconds and not include_time:
            include_time = True
        if use_ampm and not include_time:
            include_time = True

        include_timezone = _has("timezone", "tz", "utc", "offset", "gmtoffset", "withtz", "withzone", "zulu")
        iso_like = _has("iso", "iso8601", "ymd", "rfc3339")
        rfc822_like = _has("rfc2822", "rfc822")
        http_like = _has("httpdate", "rfc7231")
        compact_like = _has("compact", "slug", "filename", "filestamp", "yyyymmdd", "numeric", "digits")
        us_like = _has("us", "usa", "mdy", "mmdd")
        dashed_like = _has("dash", "hyphen")
        long_like = _has("long", "verbose", "friendly", "pretty", "human")
        short_like = _has("short", "abbr", "mini", "brief")
        month_long_like = _has("monthname", "monthlong")
        month_short_like = _has("monthabbr", "monthshort")
        weekday_like = _has("weekday", "dayname")
        weekday_short = _has("weekdayshort", "weekdayabbr", "daynameshort")
        epoch_ms_like = _has("epochms", "millis", "milliseconds", "unixms")
        epoch_like = _has("epoch", "unixtime", "unix")

        dt_for_format = dt_obj
        if include_timezone and dt_for_format.tzinfo is None:
            try:
                dt_for_format = dt_for_format.astimezone()
            except ValueError:
                pass

        if epoch_ms_like:
            try:
                return str(int(dt_for_format.timestamp() * 1000))
            except (OSError, OverflowError, ValueError):
                pass
        if epoch_like:
            try:
                return str(int(dt_for_format.timestamp()))
            except (OSError, OverflowError, ValueError):
                pass

        if rfc822_like or http_like:
            try:
                from email.utils import format_datetime as _email_format_datetime

                base_dt = dt_for_format
                if base_dt.tzinfo is None:
                    base_dt = base_dt.astimezone()
                return _email_format_datetime(base_dt)
            except Exception:
                pass

        if iso_like:
            dt_use = dt_for_format
            if include_time:
                timespec = "seconds" if include_seconds else "minutes"
                try:
                    return dt_use.isoformat(timespec=timespec)
                except TypeError:
                    return dt_use.isoformat()
            return dt_use.date().isoformat()

        if compact_like:
            date_part = dt_for_format.strftime("%Y%m%d")
            if include_time:
                if use_ampm:
                    time_fmt = "%I%M%S%p" if include_seconds else "%I%M%p"
                else:
                    time_fmt = "%H%M%S" if include_seconds else "%H%M"
                date_part = f"{date_part}_{dt_for_format.strftime(time_fmt)}"
            if include_timezone:
                tz = dt_for_format.strftime("%z")
                if tz:
                    date_part = f"{date_part}{tz}"
            return date_part

        date_part = "%d/%m/%Y"
        if us_like:
            date_part = "%m/%d/%Y"
        elif dashed_like:
            date_part = "%d-%m-%Y"
        elif long_like:
            date_part = "%B %d, %Y"
        elif short_like or month_short_like:
            date_part = "%d %b %Y"
        elif month_long_like:
            date_part = "%d %B %Y"

        if weekday_like:
            prefix = "%a, " if weekday_short else "%A, "
            date_part = prefix + date_part

        fmt = date_part
        if include_time:
            if use_ampm:
                time_fmt = "%I:%M:%S %p" if include_seconds else "%I:%M %p"
            else:
                time_fmt = "%H:%M:%S" if include_seconds else "%H:%M"
            fmt = f"{fmt} {time_fmt}"
        if include_timezone:
            fmt = f"{fmt} %Z".strip()

        try:
            rendered = dt_for_format.strftime(fmt).strip()
            if not rendered and "%Z" in fmt:
                rendered = dt_for_format.strftime(fmt.replace("%Z", "%z")).strip()
            return rendered
        except Exception:
            if include_time:
                try:
                    return dt_for_format.isoformat(timespec="seconds")
                except TypeError:
                    return dt_for_format.isoformat()
            return dt_for_format.date().isoformat()

    def _format_for_db(dt_obj: datetime | None, raw_value, include_time_default: bool) -> str:
        """
        Normalize input dates for SQLite bindings:
          - prefer ISO 8601 date or datetime strings
          - fall back to trimmed raw strings when parsing fails
        """
        if dt_obj:
            include_time = include_time_default or bool(
                dt_obj.hour or dt_obj.minute or dt_obj.second or dt_obj.microsecond
            )
            if include_time:
                return dt_obj.strftime("%Y-%m-%d %H:%M:%S")
            return dt_obj.strftime("%Y-%m-%d")
        return "" if raw_value is None else str(raw_value).strip()

    def _run_generator_entrypoints(
        entrypoints: dict, sql_params: dict[str, object]
    ) -> dict[str, list[dict[str, object]]]:
        if not entrypoints:
            return {}
        con = sqlite3.connect(str(DB_PATH))
        con.row_factory = sqlite3.Row
        alias_fix_patterns = [
            re.compile(r"\brows\.", re.IGNORECASE),
            re.compile(r"\brows_agg\.", re.IGNORECASE),
        ]

        def _wrap_date_param(sql_text: str, param: str) -> str:
            pattern = re.compile(rf":{param}\b")

            def _replace(match: re.Match[str]) -> str:
                start = match.start()
                prefix = sql_text[:start].rstrip()
                prefix_lower = prefix.lower()
                if prefix_lower.endswith("date(") or prefix_lower.endswith("datetime("):
                    return match.group(0)
                return f"DATE({match.group(0)})"

            return pattern.sub(_replace, sql_text)

        def _prepare_sql(sql_text: str) -> str:
            updated = re.sub(r"PARAM:([A-Za-z0-9_]+)", r":\1", sql_text)
            if "DATE(" not in updated.upper():
                return updated
            for param in ("from_date", "to_date"):
                updated = _wrap_date_param(updated, param)
            return updated

        def _attempt_sql_fix(sql_text: str, exc: Exception | None) -> str | None:
            if exc is None:
                return None
            message = str(exc).lower()
            if "no such column" not in message:
                return None
            fixed_sql = sql_text
            for pattern in alias_fix_patterns:
                fixed_sql = pattern.sub("", fixed_sql)
            return fixed_sql if fixed_sql != sql_text else None

        try:
            results: dict[str, list[dict[str, object]]] = {}
            for name in ("header", "rows", "totals"):
                sql = entrypoints.get(name)
                if not sql:
                    results[name] = []
                    continue
                current_sql = _prepare_sql(sql)
                last_error: Exception | None = None
                for attempt in range(2):
                    try:
                        cur = con.execute(current_sql, sql_params)
                    except sqlite3.OperationalError as exc:
                        last_error = exc
                        fixed_sql = _attempt_sql_fix(current_sql, exc)
                        if fixed_sql is not None and fixed_sql != current_sql:
                            current_sql = fixed_sql
                            continue
                        raise
                    else:
                        last_error = None
                        rows = [dict(row) for row in cur.fetchall()]
                        results[name] = rows
                        break
                else:
                    assert last_error is not None
                    raise last_error
            return results
        finally:
            con.close()

    start_dt = _parse_date_like(START_DATE)
    end_dt = _parse_date_like(END_DATE)
    print_dt = datetime.now()

    start_has_time = _has_time_component(START_DATE, start_dt)
    end_has_time = _has_time_component(END_DATE, end_dt)

    START_DATE_KEYS = {"fromdate", "datefrom", "startdate", "periodstart", "rangefrom", "fromdt", "startdt"}
    END_DATE_KEYS = {"todate", "dateto", "enddate", "periodend", "rangeto", "todt", "enddt"}
    PRINT_DATE_KEYS = {
        "printdate",
        "printedon",
        "printeddate",
        "generatedon",
        "generateddate",
        "rundate",
        "runon",
        "generatedat",
    }
    PAGE_NO_KEYS = {
        "page",
        "pageno",
        "pagenum",
        "pagenumber",
        "pageindex",
        "pageidx",
        "pagecurrent",
        "currentpage",
        "currpage",
        "pgno",
        "pgnum",
        "pgnumber",
        "pgindex",
        "pgcurrent",
    }
    PAGE_COUNT_KEYS = {
        "pagecount",
        "pagecounts",
        "totalpages",
        "pagestotal",
        "pages",
        "pagetotal",
        "totalpage",
        "pagecounttotal",
        "totalpagecount",
        "pagescount",
        "countpages",
        "lastpage",
        "finalpage",
        "maxpage",
        "pgtotal",
        "totalpg",
        "pgcount",
        "countpg",
        "pgs",
        "pgscount",
        "pgstotal",
        "totalpgs",
    }
    PAGE_LABEL_KEYS = {
        "pagelabel",
        "pageinfo",
        "pagesummary",
        "pagefooter",
        "pagefootertext",
        "pageindicator",
        "pagecaption",
        "pagefooterlabel",
        "pagetext",
        "pagefooterinfo",
        "pagehint",
    }

    special_values: dict[str, str] = {}

    start_tokens = _tokens_for_keys(START_DATE_KEYS)
    end_tokens = _tokens_for_keys(END_DATE_KEYS)
    print_tokens = _tokens_for_keys(PRINT_DATE_KEYS)
    page_number_tokens = _tokens_for_keys(PAGE_NO_KEYS)
    page_count_tokens = _tokens_for_keys(PAGE_COUNT_KEYS)
    page_label_tokens = _tokens_for_keys(PAGE_LABEL_KEYS)

    for tok in start_tokens:
        _record_special_value(
            special_values,
            tok,
            _format_for_token(tok, start_dt, include_time_default=start_has_time),
        )
    for tok in end_tokens:
        _record_special_value(
            special_values,
            tok,
            _format_for_token(tok, end_dt, include_time_default=end_has_time),
        )

    _, print_literal_value = _first_nonempty_literal(print_tokens)
    parsed_print_dt = _parse_date_like(print_literal_value) if print_literal_value else None
    print_dt_source = parsed_print_dt or print_dt
    print_has_time = _has_time_component(print_literal_value, parsed_print_dt)

    for tok in print_tokens:
        if print_literal_value and not parsed_print_dt:
            value = print_literal_value
        else:
            value = _format_for_token(tok, print_dt_source, include_time_default=print_has_time)
        _record_special_value(special_values, tok, value)

    page_number_tokens = _filter_tokens_without_literal(page_number_tokens)
    page_count_tokens = _filter_tokens_without_literal(page_count_tokens)
    page_label_tokens = _filter_tokens_without_literal(page_label_tokens)

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

    has_child = bool(child_table and ccols)
    parent_table_lc = parent_table.lower()
    child_table_lc = child_table.lower()
    parent_filter_map: dict[str, list[str]] = {}
    child_filter_map: dict[str, list[str]] = {}
    if key_values_map:
        for token, values in key_values_map.items():
            mapping_value = PLACEHOLDER_TO_COL.get(token)
            if not isinstance(mapping_value, str):
                continue
            target = mapping_value.strip()
            if not target or target.upper().startswith("PARAM:") or "." not in target:
                continue
            table_name, column_name = target.split(".", 1)
            table_name = table_name.strip(' "`[]')
            column_name = column_name.strip(' "`[]')
            if not column_name:
                continue
            table_key = table_name.lower()
            if table_key in (parent_table_lc, "header"):
                bucket = list(parent_filter_map.get(column_name, []))
                for val in values:
                    if val not in bucket:
                        bucket.append(val)
                if bucket:
                    parent_filter_map[column_name] = bucket
            if has_child and table_key in (child_table_lc, "rows"):
                bucket = list(child_filter_map.get(column_name, []))
                for val in values:
                    if val not in bucket:
                        bucket.append(val)
                if bucket:
                    child_filter_map[column_name] = bucket
    parent_filter_items = list(parent_filter_map.items())
    child_filter_items = list(child_filter_map.items())
    parent_filter_sqls: list[str] = []
    parent_filter_values: list[str] = []
    for col, values in parent_filter_items:
        normalized: list[str] = []
        for val in values:
            if not isinstance(val, str):
                continue
            text = val.strip()
            if text and text not in normalized:
                normalized.append(text)
        if not normalized:
            continue
        if len(normalized) == 1:
            parent_filter_sqls.append(f"{qident(col)} = ?")
        else:
            placeholders = ", ".join("?" for _ in normalized)
            parent_filter_sqls.append(f"{qident(col)} IN ({placeholders})")
        parent_filter_values.extend(normalized)
    parent_filter_values_tuple = tuple(parent_filter_values)

    child_filter_sqls: list[str] = []
    child_filter_values: list[str] = []
    for col, values in child_filter_items:
        normalized: list[str] = []
        for val in values:
            if not isinstance(val, str):
                continue
            text = val.strip()
            if text and text not in normalized:
                normalized.append(text)
        if not normalized:
            continue
        if len(normalized) == 1:
            child_filter_sqls.append(f"{qident(col)} = ?")
        else:
            placeholders = ", ".join("?" for _ in normalized)
            child_filter_sqls.append(f"{qident(col)} IN ({placeholders})")
        child_filter_values.extend(normalized)
    child_filter_values_tuple = tuple(child_filter_values)

    def _merge_predicate(base_sql: str, extras: list[str]) -> str:
        if not extras:
            return base_sql
        extras_joined = " AND ".join(extras)
        base_sql = (base_sql or "1=1").strip()
        return f"({base_sql}) AND {extras_joined}"

    # --- Date predicates and adapters (handle missing/invalid date columns)
    parent_type = get_col_type(DB_PATH, parent_table, parent_date)
    child_type = get_col_type(DB_PATH, child_table, child_date)
    parent_pred, adapt_parent = mk_between_pred_for_date(parent_date, parent_type)
    child_pred, adapt_child = mk_between_pred_for_date(child_date, child_type)
    parent_where_clause = _merge_predicate(parent_pred, parent_filter_sqls)
    child_where_clause = _merge_predicate(child_pred, child_filter_sqls) if has_child else child_pred
    db_start = _format_for_db(start_dt, START_DATE, start_has_time)
    db_end = _format_for_db(end_dt, END_DATE, end_has_time)
    PDATE = tuple(adapt_parent(db_start, db_end))  # () if 1=1
    CDATE = tuple(adapt_child(db_start, db_end)) if has_child else tuple()  # () if 1=1
    parent_params_all = tuple(PDATE) + parent_filter_values_tuple
    child_params_all = tuple(CDATE) + child_filter_values_tuple if has_child else tuple()

    sql_params: dict[str, object] = {
        "from_date": db_start,
        "to_date": db_end,
    }

    for token in contract_adapter.param_tokens:
        if token in ("from_date", "to_date"):
            continue
        if token in key_values_map:
            first_value = _first_key_value(key_values_map[token])
            if first_value is not None:
                sql_params[token] = first_value
        elif token in LITERALS:
            sql_params[token] = LITERALS[token]
        elif token in special_values:
            sql_params[token] = special_values[token]
        else:
            sql_params.setdefault(token, "")

    if "recipe_code" in sql_params:
        _log_debug(
            "[multi-debug] generator param binding",
            "force_single" if __force_single else "fanout_root",
            "key_values=",
            key_values_map,
            "recipe_code=",
            sql_params.get("recipe_code"),
        )

    if GENERATOR_BUNDLE is None:
        generator_dir = TEMPLATE_PATH.parent / "generator"
        meta_path = generator_dir / "generator_assets.json"
        if meta_path.exists():
            try:
                meta_payload = json.loads(meta_path.read_text(encoding="utf-8"))
            except Exception:
                meta_payload = None
            else:
                bundle: dict[str, object] = {"meta": meta_payload}
                output_schemas_path = generator_dir / "output_schemas.json"
                if output_schemas_path.exists():
                    try:
                        bundle["output_schemas"] = json.loads(output_schemas_path.read_text(encoding="utf-8"))
                    except Exception:
                        pass
                GENERATOR_BUNDLE = bundle

    generator_results: dict[str, list[dict[str, object]]] | None = None
    if GENERATOR_BUNDLE and not multi_key_selected:
        meta_payload = GENERATOR_BUNDLE.get("meta") or {}
        entrypoints = meta_payload.get("entrypoints")
        if not isinstance(entrypoints, dict):
            entrypoints = {}

        if any(entrypoints.values()):
            params_spec = meta_payload.get("params") or {}
            required_params = list(params_spec.get("required") or [])
            optional_params = list(params_spec.get("optional") or [])
            for name in required_params + optional_params:
                sql_params.setdefault(name, None)

            if "plant_name" in sql_params:
                sql_params["plant_name"] = LITERALS.get("plant_name") or special_values.get("plant_name", "")
            if "location" in sql_params:
                sql_params["location"] = LITERALS.get("location") or special_values.get("location", "")
            if "recipe_code" in sql_params:
                if "recipe_code" in key_values_map:
                    sql_params["recipe_code"] = _first_key_value(key_values_map["recipe_code"])
                else:
                    fallback_val = LITERALS.get("recipe_code")
                    sql_params["recipe_code"] = fallback_val if fallback_val not in (None, "", []) else None
            if "page_info" in sql_params:
                sql_params["page_info"] = LITERALS.get("page_info") or ""
            if key_values_map:
                for name, values in key_values_map.items():
                    sql_params[name] = _first_key_value(values)

            try:
                generator_results = _run_generator_entrypoints(entrypoints, sql_params)
            except Exception as exc:  # pragma: no cover - defensive logging
                print(f"Generator SQL execution failed; falling back to contract mapping: {exc}")
                generator_results = None

    if generator_results is None and not multi_key_selected:
        try:
            default_sql_pack = contract_adapter.build_default_sql_pack()
        except Exception as exc:  # pragma: no cover - defensive logging
            print(f"Contract-derived SQL synthesis failed: {exc}")
        else:
            default_params = default_sql_pack.get("params") or {}
            required_default = list(default_params.get("required") or [])
            optional_default = list(default_params.get("optional") or [])
            for name in required_default + optional_default:
                sql_params.setdefault(name, None)
            try:
                fallback_results = _run_generator_entrypoints(default_sql_pack["entrypoints"], sql_params)
            except Exception as exc:  # pragma: no cover - defensive logging
                print(f"Contract SQL execution failed; continuing with discovery fallback: {exc}")
            else:
                if any(fallback_results.get(section) for section in ("rows", "header", "totals")):
                    generator_results = fallback_results

    # ---- Normalize / auto-discover BATCH_IDS ----
    if generator_results is None:
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
                        print("Provided BATCH_IDS do not match composite key format; falling back to auto-discovery.")
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
                        WHERE {parent_where_clause}
                    """
                    parent_ids = [r["bid"] for r in cur.execute(parent_sql, parent_params_all)]
                else:
                    parent_sql = f"""
                        SELECT DISTINCT {_key_expr(pcols)} AS bid
                        FROM {qident(parent_table)}
                        WHERE {parent_where_clause}
                    """
                    parent_ids = [r["bid"] for r in cur.execute(parent_sql, parent_params_all)]

                # Child discovery
                if len(ccols) == 1:
                    child_sql = f"""
                        SELECT DISTINCT {qident(ccols[0])} AS bid
                        FROM {qident(child_table)}
                        WHERE {child_where_clause}
                    """
                    child_ids = [r["bid"] for r in cur.execute(child_sql, child_params_all)]
                else:
                    child_sql = f"""
                        SELECT DISTINCT {_key_expr(ccols)} AS bid
                        FROM {qident(child_table)}
                        WHERE {child_where_clause}
                    """
                    child_ids = [r["bid"] for r in cur.execute(child_sql, child_params_all)]

                all_ids = sorted({str(x) for x in (parent_ids + child_ids)})

                if len(all_ids) <= 1:
                    # Relax discovery if filtered too tightly by date (retain key filters)
                    if len(pcols) == 1:
                        p_all = f"SELECT DISTINCT {qident(pcols[0])} AS bid FROM {qident(parent_table)}"
                    else:
                        p_all = f"SELECT DISTINCT {_key_expr(pcols)} AS bid FROM {qident(parent_table)}"
                    if parent_filter_sqls:
                        p_all = f"{p_all} WHERE " + " AND ".join(parent_filter_sqls)
                        parent_ids = [r["bid"] for r in cur.execute(p_all, parent_filter_values_tuple)]
                    else:
                        parent_ids = [r["bid"] for r in cur.execute(p_all)]

                    if len(ccols) == 1:
                        c_all = f"SELECT DISTINCT {qident(ccols[0])} AS bid FROM {qident(child_table)}"
                    else:
                        c_all = f"SELECT DISTINCT {_key_expr(ccols)} AS bid FROM {qident(child_table)}"
                    if has_child and child_filter_sqls:
                        c_all = f"{c_all} WHERE " + " AND ".join(child_filter_sqls)
                        child_ids = [r["bid"] for r in cur.execute(c_all, child_filter_values_tuple)]
                    else:
                        child_ids = [r["bid"] for r in cur.execute(c_all)]
                    all_ids = sorted({str(x) for x in (parent_ids + child_ids)})

                BATCH_IDS = all_ids
        else:
            BATCH_IDS = existing
    else:
        BATCH_IDS = ["__GENERATOR_SINGLE__"]

    print("BATCH_IDS:", len(BATCH_IDS or []), (BATCH_IDS or [])[:20] if BATCH_IDS else [])
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

    def format_token_value(token: str, raw_value: Any) -> str:
        return contract_adapter.format_value(token, raw_value)

    FOOTER_NUMBER_SPAN_RE = re.compile(
        r'(<span\b[^>]*class=["\'][^"\']*nr-page-number[^"\']*["\'][^>]*>)(.*?)(</span>)',
        re.IGNORECASE | re.DOTALL,
    )
    FOOTER_COUNT_SPAN_RE = re.compile(
        r'(<span\b[^>]*class=["\'][^"\']*nr-page-count[^"\']*["\'][^>]*>)(.*?)(</span>)',
        re.IGNORECASE | re.DOTALL,
    )

    def _set_static_footer_numbers(html_in: str) -> str:
        number_matches = list(FOOTER_NUMBER_SPAN_RE.finditer(html_in))
        total = len(number_matches)
        if not total:
            return html_in

        def _set_attr(tag: str, attr: str, value: str) -> str:
            pattern = re.compile(rf'({attr}\s*=\s*")[^"]*(")', re.IGNORECASE)
            if pattern.search(tag):
                return pattern.sub(lambda m: f"{m.group(1)}{value}{m.group(2)}", tag)
            insert_at = tag.rfind(">")
            if insert_at == -1:
                return tag + f' {attr}="{value}"'
            return f'{tag[:insert_at]} {attr}="{value}"{tag[insert_at:]}'

        page_index = {"value": 0}

        def replace_number(match: re.Match[str]) -> str:
            page_index["value"] += 1
            value = str(page_index["value"])
            open_tag, _, close_tag = match.groups()
            open_tag = _set_attr(open_tag, "data-nr-screen", value)
            open_tag = _set_attr(open_tag, "data-nr-page-estimate", value)
            return f"{open_tag}{value}{close_tag}"

        html_out = FOOTER_NUMBER_SPAN_RE.sub(replace_number, html_in)
        total_str = str(total)

        def replace_count(match: re.Match[str]) -> str:
            open_tag, _, close_tag = match.groups()
            open_tag = _set_attr(open_tag, "data-nr-total-pages", total_str)
            open_tag = _set_attr(open_tag, "data-nr-screen", total_str)
            return f"{open_tag}{total_str}{close_tag}"

        html_out = FOOTER_COUNT_SPAN_RE.sub(replace_count, html_out)
        return html_out

    FOOTER_FIXED_PATTERNS: tuple[tuple[re.Pattern, str], ...] = (
        (
            re.compile(r"(?<![\w.-])footer\b[^{}]*\{[^{}]*position\s*:\s*fixed", re.IGNORECASE | re.DOTALL),
            "footer",
        ),
        (
            re.compile(r"#page-footer\b[^{}]*\{[^{}]*position\s*:\s*fixed", re.IGNORECASE | re.DOTALL),
            "#page-footer",
        ),
    )

    def _ensure_footer_static_preview(html_in: str) -> str:
        if "data-nr-footer-fix" in html_in:
            return html_in

        selectors: list[str] = []
        for pattern, selector in FOOTER_FIXED_PATTERNS:
            if pattern.search(html_in):
                selectors.append(selector)

        if not selectors:
            return html_in

        unique_selectors = list(dict.fromkeys(selectors))
        selectors_str = ", ".join(unique_selectors)
        style_block = (
            "\n<style data-nr-footer-fix>\n"
            f"  {selectors_str} {{\n"
            "    position: static !important;\n"
            "    margin-top: 4mm;\n"
            "  }\n"
            "</style>\n"
        )

        if "</head>" in html_in:
            return html_in.replace("</head>", style_block + "</head>", 1)
        if "<body" in html_in:
            return html_in.replace("<body", style_block + "<body", 1)
        return style_block + html_in

    def _blank_known_tokens_text(text: str, tokens) -> str:
        for t in tokens:
            text = re.sub(r"\{\{\s*" + re.escape(t) + r"\s*\}\}", "", text)
            text = re.sub(r"\{\s*" + re.escape(t) + r"\s*\}", "", text)
        return text

    def blank_known_tokens(html_in: str, tokens) -> str:
        return _apply_outside_styles_scripts(html_in, lambda txt: _blank_known_tokens_text(txt, tokens))

    # ---- Helpers to find tbody / row template (improved) ----
    def best_rows_tbody(inner_html: str, allowed_tokens: set):
        tbodys = list(re.finditer(r"(?is)<tbody\b[^>]*>(.*?)</tbody>", inner_html))
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
                if a:
                    flat.append(a.strip())
                if b:
                    flat.append(b.strip())
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
    def _extract_col_name(mapping_value: str | None) -> str | None:
        if not isinstance(mapping_value, str):
            return None
        target = mapping_value.strip()
        if "." not in target:
            return None
        return target.split(".", 1)[1].strip() or None

    header_cols = sorted({col for t in HEADER_TOKENS for col in [_extract_col_name(PLACEHOLDER_TO_COL.get(t))] if col})
    row_cols = sorted({col for t in ROW_TOKENS for col in [_extract_col_name(PLACEHOLDER_TO_COL.get(t))] if col})

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
        if raw is None:
            return None, "0"
        try:
            decimal_value = Decimal(str(raw).strip())
        except (InvalidOperation, ValueError, TypeError, AttributeError):
            return None, "0"
        if not decimal_value.is_finite():
            return None, "0"
        formatted = format_decimal_str(decimal_value, max_decimals=3) or "0"
        return float(decimal_value), formatted

    totals_accum = defaultdict(float)
    last_totals_per_token = {token: "0" for token in TOTALS}

    child_totals_cols = {col: list(tokens) for col, tokens in totals_by_table.get(child_table, {}).items()}
    # ---- Render all batches ----
    rendered_blocks = []
    if generator_results is not None:
        block_html = prototype_block

        header_rows = generator_results.get("header") or []
        header_row = header_rows[0] if header_rows else {}
        for t in HEADER_TOKENS:
            if t in header_row:
                value = header_row[t]
                block_html = sub_token(block_html, t, format_token_value(t, value))

        allowed_row_tokens = {t for t in PLACEHOLDER_TO_COL.keys() if t not in TOTALS} - set(HEADER_TOKENS)
        rows_data = generator_results.get("rows") or []
        filtered_rows: list[dict[str, Any]] = []
        row_tokens_in_template: list[str] = []

        if rows_data:
            tbody_m, tbody_inner = best_rows_tbody(block_html, allowed_row_tokens)
            if tbody_m and tbody_inner:
                row_template, row_span, row_tokens_in_template = find_row_template(tbody_inner, allowed_row_tokens)
                if row_template and row_tokens_in_template:
                    row_columns_template = [
                        _extract_col_name(PLACEHOLDER_TO_COL.get(tok)) or "" for tok in row_tokens_in_template
                    ]
                    filtered_rows = _filter_rows_for_render(
                        rows_data,
                        row_tokens_in_template,
                        row_columns_template,
                        treat_all_as_data=bool(__force_single),
                    )
                    filtered_rows = _prune_placeholder_rows(filtered_rows, row_tokens_in_template)
                    _reindex_serial_fields(filtered_rows, row_tokens_in_template, row_columns_template)
                    if filtered_rows:
                        _log_debug(
                            "[multi-debug] reindexed rows (tbody)",
                            {"first_sl": filtered_rows[0].get("sl_no"), "count": len(filtered_rows)},
                        )
                    if __force_single:
                        _log_debug(
                            f"[multi-debug] generator rows: total={len(rows_data)}, filtered={len(filtered_rows)}, key_values={KEY_VALUES}"
                        )
                    if filtered_rows:
                        serial_token_set = {tok for tok in row_tokens_in_template if _is_serial_label(tok)}
                        parts: list[str] = []
                        for idx, row in enumerate(filtered_rows, start=1):
                            tr = row_template
                            for tok in row_tokens_in_template:
                                if tok in serial_token_set:
                                    val = idx
                                else:
                                    val = _value_for_token(row, tok)
                                tr = sub_token(tr, tok, format_token_value(tok, val))
                            parts.append(tr)
                        new_tbody_inner = tbody_inner[: row_span[0]] + "\n".join(parts) + tbody_inner[row_span[1] :]
                        block_html = block_html[: tbody_m.start(1)] + new_tbody_inner + block_html[tbody_m.end(1) :]
            else:
                tr_tokens = [
                    m.group(1) or m.group(2)
                    for m in re.finditer(r"\{\{\s*([^}\n]+?)\s*\}\}|\{\s*([^}\n]+?)\s*\}", block_html)
                ]
                row_tokens_in_template = [t.strip() for t in tr_tokens if t and t.strip() in allowed_row_tokens]
                if row_tokens_in_template:
                    row_columns_template = [
                        _extract_col_name(PLACEHOLDER_TO_COL.get(tok)) or "" for tok in row_tokens_in_template
                    ]
                    filtered_rows = _filter_rows_for_render(
                        rows_data,
                        row_tokens_in_template,
                        row_columns_template,
                        treat_all_as_data=bool(__force_single),
                    )
                    filtered_rows = _prune_placeholder_rows(filtered_rows, row_tokens_in_template)
                    _reindex_serial_fields(filtered_rows, row_tokens_in_template, row_columns_template)
                    if filtered_rows:
                        _log_debug(
                            "[multi-debug] reindexed rows (no tbody)",
                            {"first_sl": filtered_rows[0].get("sl_no"), "count": len(filtered_rows)},
                        )
                    if __force_single:
                        _log_debug(
                            f"[multi-debug] generator rows (no tbody): total={len(rows_data)}, filtered={len(filtered_rows)}, key_values={KEY_VALUES}"
                        )
                    if filtered_rows:
                        serial_token_set = {tok for tok in row_tokens_in_template if _is_serial_label(tok)}
                        parts = []
                        for idx, row in enumerate(filtered_rows, start=1):
                            tr = prototype_block
                            for tok in row_tokens_in_template:
                                if tok in serial_token_set:
                                    val = idx
                                else:
                                    val = _value_for_token(row, tok)
                                tr = sub_token(tr, tok, format_token_value(tok, val))
                            parts.append(tr)
                        block_html = "\n".join(parts)

        if filtered_rows:
            totals_row = (generator_results.get("totals") or [{}])[0]
            for token in TOTALS:
                value = totals_row.get(token)
                formatted = format_token_value(token, value)
                block_html = sub_token(block_html, token, formatted)
                last_totals_per_token[token] = formatted
                target = total_token_to_target.get(token)
                if target:
                    fv, _formatted = _coerce_total_value(value)
                    if fv is not None:
                        totals_accum[target] = totals_accum.get(target, 0.0) + fv

            rendered_blocks.append(block_html)
        else:
            print("Generator SQL produced no usable row data after filtering; skipping block.")
    else:
        for batch_id in BATCH_IDS or []:
            block_html = prototype_block

            # (a) Header fill (parent row)
            if header_cols:
                if len(pcols) == 1:
                    sql = (
                        f"SELECT {', '.join(qident(c) for c in header_cols)} "
                        f"FROM {qident(parent_table)} "
                        f"WHERE {qident(pcols[0])} = ? AND {parent_where_clause} "
                        f"LIMIT 1"
                    )
                    hdr_params = (batch_id,) + tuple(PDATE) + parent_filter_values_tuple
                else:
                    where = " AND ".join([f"{qident(c)} = ?" for c in pcols])
                    sql = (
                        f"SELECT {', '.join(qident(c) for c in header_cols)} "
                        f"FROM {qident(parent_table)} "
                        f"WHERE {where} AND {parent_where_clause} "
                        f"LIMIT 1"
                    )
                    hdr_parts = _split_bid(batch_id, len(pcols))
                    hdr_params = tuple(hdr_parts) + tuple(PDATE) + parent_filter_values_tuple

                con = sqlite3.connect(str(DB_PATH))
                con.row_factory = sqlite3.Row
                cur = con.cursor()
                cur.execute(sql, hdr_params)
                row = cur.fetchone()
                con.close()
                if row:
                    r = dict(row)
                    for t in HEADER_TOKENS:
                        if t in PLACEHOLDER_TO_COL:
                            col = _extract_col_name(PLACEHOLDER_TO_COL.get(t))
                            if not col:
                                continue
                            val = r.get(col, "")
                            block_html = sub_token(block_html, t, format_token_value(t, val))

            # (b) Row repeater (child rows)
            allowed_row_tokens = {t for t in PLACEHOLDER_TO_COL.keys() if t not in TOTALS} - set(HEADER_TOKENS)

            # Try standard tbody-based path first
            tbody_m, tbody_inner = best_rows_tbody(block_html, allowed_row_tokens)
            if tbody_m and tbody_inner:
                row_template, row_span, row_tokens_in_template = find_row_template(tbody_inner, allowed_row_tokens)
                if row_template and row_tokens_in_template:
                    row_cols_needed = sorted(
                        {
                            col
                            for t in row_tokens_in_template
                            for col in [_extract_col_name(PLACEHOLDER_TO_COL.get(t))]
                            if col
                        }
                    )

                    if order_col.upper() != "ROWID" and order_col not in row_cols_needed:
                        row_cols_needed.append(order_col)

                    order_clause = (
                        "ORDER BY ROWID" if order_col.upper() == "ROWID" else f"ORDER BY {qident(order_col)}, ROWID"
                    )

                    if len(ccols) == 1:
                        sql = (
                            f"SELECT {', '.join(qident(c) for c in row_cols_needed)} "
                            f"FROM {qident(child_table)} "
                            f"WHERE {qident(ccols[0])} = ? AND {child_where_clause} "
                            f"{order_clause}"
                        )
                        row_params = (batch_id,) + tuple(CDATE) + child_filter_values_tuple
                    else:
                        where = " AND ".join([f"{qident(c)} = ?" for c in ccols])
                        sql = (
                            f"SELECT {', '.join(qident(c) for c in row_cols_needed)} "
                            f"FROM {qident(child_table)} "
                            f"WHERE {where} AND {child_where_clause} "
                            f"{order_clause}"
                        )
                        row_parts = _split_bid(batch_id, len(ccols))
                        row_params = tuple(row_parts) + tuple(CDATE) + child_filter_values_tuple

                    con = sqlite3.connect(str(DB_PATH))
                    con.row_factory = sqlite3.Row
                    cur = con.cursor()
                    cur.execute(sql, row_params)
                    rows = [dict(r) for r in cur.fetchall()]
                    con.close()

                    # Fallback: date-only by majority table if needed
                    if not rows:
                        maj_table = majority_table_for_tokens(row_tokens_in_template, PLACEHOLDER_TO_COL)
                        if maj_table:
                            date_col = DATE_COLUMNS.get(maj_table, "")
                            if date_col:
                                cols_needed = sorted(
                                    {
                                        col
                                        for t in row_tokens_in_template
                                        for col in [_extract_col_name(PLACEHOLDER_TO_COL.get(t))]
                                        if col
                                    }
                                )
                                if date_col not in cols_needed:
                                    cols_needed.append(date_col)
                                sql_fb = (
                                    f"SELECT {', '.join(qident(c) for c in cols_needed)} "
                                    f"FROM {qident(maj_table)} "
                                    f"WHERE datetime({qident(date_col)}) BETWEEN datetime(?) AND datetime(?) "
                                    f"ORDER BY {qident(date_col)} ASC, ROWID ASC"
                                )
                                con = sqlite3.connect(str(DB_PATH))
                                con.row_factory = sqlite3.Row
                                cur = con.cursor()
                                cur.execute(sql_fb, (START_DATE, END_DATE))
                                rows = [dict(r) for r in cur.fetchall()]
                                con.close()
                                print(f"Row fallback used: table={maj_table}, rows={len(rows)}")

                    if not rows:
                        print(f"No child rows found for batch {batch_id}; skipping block.")
                        continue

                    significant_cols = [
                        col
                        for col in row_cols_needed
                        if col and not any(keyword in col.lower() for keyword in ("row", "serial", "sl"))
                    ]
                    filtered_rows = []
                    for r in rows:
                        if significant_cols and not _row_has_significant_data(r, significant_cols):
                            continue
                        filtered_rows.append(dict(r))

                    if not filtered_rows and rows:
                        filtered_rows = [dict(r) for r in rows]
                    filtered_rows = _prune_placeholder_rows(filtered_rows, row_tokens_in_template)
                    if __force_single:
                        _log_debug(
                            f"[multi-debug] sql rows: total={len(rows)}, filtered={len(filtered_rows)}, key_values={KEY_VALUES}"
                        )
                    if not filtered_rows:
                        print(f"No significant child rows for batch {batch_id}; skipping block.")
                        continue

                    _reindex_serial_fields(filtered_rows, row_tokens_in_template, row_cols_needed)
                    if filtered_rows:
                        _log_debug(
                            "[multi-debug] reindexed rows sql (tbody)",
                            {"first_sl": filtered_rows[0].get("sl_no"), "count": len(filtered_rows)},
                        )

                    serial_token_set = {t for t in row_tokens_in_template if _is_serial_label(t)}
                    serial_column_set = {c for c in row_cols_needed if _is_serial_label(c)}
                    parts: list[str] = []
                    for idx, r in enumerate(filtered_rows, start=1):
                        tr = row_template
                        for t in row_tokens_in_template:
                            col = _extract_col_name(PLACEHOLDER_TO_COL.get(t))
                            if not col:
                                continue
                            if t in serial_token_set or col in serial_column_set:
                                value = idx
                            else:
                                value = r.get(col)
                            tr = sub_token(tr, t, format_token_value(t, value))
                        parts.append(tr)

                    new_tbody_inner = tbody_inner[: row_span[0]] + "\n".join(parts) + tbody_inner[row_span[1] :]
                    block_html = block_html[: tbody_m.start(1)] + new_tbody_inner + block_html[tbody_m.end(1) :]

            else:
                # Inferred single-<tr> block (no <tbody> path) ΓÇö duplicate the <tr> itself
                tr_tokens = [
                    m.group(1) or m.group(2)
                    for m in re.finditer(r"\{\{\s*([^}\n]+?)\s*\}\}|\{\s*([^}\n]+?)\s*\}", block_html)
                ]
                tr_tokens = sorted({t.strip() for t in tr_tokens if t}, key=len, reverse=True)

                row_tokens_in_template = [t for t in tr_tokens if t in allowed_row_tokens]
                if row_tokens_in_template:
                    row_cols_needed = sorted(
                        {
                            col
                            for t in row_tokens_in_template
                            for col in [_extract_col_name(PLACEHOLDER_TO_COL.get(t))]
                            if col
                        }
                    )
                    if order_col.upper() != "ROWID" and order_col not in row_cols_needed:
                        row_cols_needed.append(order_col)
                    order_clause = (
                        "ORDER BY ROWID" if order_col.upper() == "ROWID" else f"ORDER BY {qident(order_col)}, ROWID"
                    )

                    if len(ccols) == 1:
                        sql = (
                            f"SELECT {', '.join(qident(c) for c in row_cols_needed)} "
                            f"FROM {qident(child_table)} "
                            f"WHERE {qident(ccols[0])} = ? AND {child_where_clause} "
                            f"{order_clause}"
                        )
                        row_params = (batch_id,) + tuple(CDATE) + child_filter_values_tuple
                    else:
                        where = " AND ".join([f"{qident(c)} = ?" for c in ccols])
                        sql = (
                            f"SELECT {', '.join(qident(c) for c in row_cols_needed)} "
                            f"FROM {qident(child_table)} "
                            f"WHERE {where} AND {child_where_clause} "
                            f"{order_clause}"
                        )
                        row_parts = _split_bid(batch_id, len(ccols))
                        row_params = tuple(row_parts) + tuple(CDATE) + child_filter_values_tuple

                    con = sqlite3.connect(str(DB_PATH))
                    con.row_factory = sqlite3.Row
                    cur = con.cursor()
                    cur.execute(sql, row_params)
                    rows = [dict(r) for r in cur.fetchall()]
                    con.close()

                    significant_cols = [
                        col
                        for col in row_cols_needed
                        if col and not any(keyword in col.lower() for keyword in ("row", "serial", "sl"))
                    ]
                    filtered_rows = []
                    for r in rows:
                        if significant_cols and not _row_has_significant_data(r, significant_cols):
                            continue
                        filtered_rows.append(dict(r))

                    if not filtered_rows and rows:
                        filtered_rows = [dict(r) for r in rows]
                    filtered_rows = _prune_placeholder_rows(filtered_rows, row_tokens_in_template)
                    if __force_single:
                        _log_debug(
                            f"[multi-debug] sql rows (no tbody): total={len(rows)}, filtered={len(filtered_rows)}, key_values={KEY_VALUES}"
                        )
                    if not filtered_rows:
                        print(f"No significant child rows (no tbody path) for batch {batch_id}; skipping block.")
                        continue

                    _reindex_serial_fields(filtered_rows, row_tokens_in_template, row_cols_needed)
                    if filtered_rows:
                        _log_debug(
                            "[multi-debug] reindexed rows sql (no tbody)",
                            {"first_sl": filtered_rows[0].get("sl_no"), "count": len(filtered_rows)},
                        )

                    serial_token_set = {t for t in row_tokens_in_template if _is_serial_label(t)}
                    serial_column_set = {c for c in row_cols_needed if _is_serial_label(c)}
                    parts = []
                    for idx, r in enumerate(filtered_rows, start=1):
                        tr = prototype_block  # the <tr> itself
                        for t in row_tokens_in_template:
                            col = _extract_col_name(PLACEHOLDER_TO_COL.get(t))
                            if not col:
                                continue
                            if t in serial_token_set or col in serial_column_set:
                                value = idx
                            else:
                                value = r.get(col)
                            tr = sub_token(tr, t, format_token_value(t, value))
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
                            f"WHERE {qident(ccols[0])} = ? AND {child_where_clause}"
                        )
                        tot_params = (batch_id,) + tuple(CDATE) + child_filter_values_tuple
                    else:
                        where = " AND ".join([f"{qident(c)} = ?" for c in ccols])
                        sql = (
                            f"SELECT {exprs} " f"FROM {qident(child_table)} " f"WHERE {where} AND {child_where_clause}"
                        )
                        tot_parts = _split_bid(batch_id, len(ccols))
                        tot_params = tuple(tot_parts) + tuple(CDATE) + child_filter_values_tuple

                    con = sqlite3.connect(str(DB_PATH))
                    con.row_factory = sqlite3.Row
                    cur = con.cursor()
                    cur.execute(sql, tot_params)
                    sums = dict(cur.fetchone() or {})
                    con.close()

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
    rows_rendered = bool(rendered_blocks)
    if not rows_rendered:
        print("No rendered blocks generated for this selection.")

    html_multi = shell_prefix + "\n".join(rendered_blocks) + shell_suffix

    for tok, val in post_literal_specials.items():
        html_multi = sub_token(html_multi, tok, val if val is not None else "")

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

    html_multi = _set_static_footer_numbers(html_multi)

    html_multi = _ensure_footer_static_preview(html_multi)

    # write to the path requested by the API
    OUT_HTML.write_text(html_multi, encoding="utf-8")
    print("Wrote HTML:", OUT_HTML)

    print("BATCH_IDS:", len(BATCH_IDS or []), (BATCH_IDS or [])[:20] if BATCH_IDS else [])

    asyncio.run(html_to_pdf_async(OUT_HTML, OUT_PDF, TEMPLATE_PATH.parent))
    print("Wrote PDF via Playwright:", OUT_PDF)

    return {"html_path": str(OUT_HTML), "pdf_path": str(OUT_PDF), "rows_rendered": rows_rendered}


# keep CLI usage (unchanged)
if __name__ == "__main__":
    print("Module ready for API integration. Call fill_and_print(...) from your FastAPI endpoint.")
