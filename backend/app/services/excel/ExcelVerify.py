from __future__ import annotations

import html
import json
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

try:
    import openpyxl  # type: ignore
except ImportError:  # pragma: no cover
    openpyxl = None  # type: ignore

from ..utils.render import render_html_to_png

logger = logging.getLogger("neura.excel.verify")


@dataclass
class ExcelInitialResult:
    html_path: Path
    png_path: Optional[Path]


def _normalize_token(name: str) -> str:
    if name is None:
        return ""
    text = str(name).strip().lower()
    if not text:
        return ""
    text = re.sub(r"[^0-9a-z]+", "_", text)
    text = re.sub(r"_+", "_", text)
    return text.strip("_")


def _row_has_values(values) -> bool:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str):
            if value.strip():
                return True
            continue
        return True
    return False


def _build_placeholder_samples(tokens: list[str], data_row) -> dict[str, str]:
    samples: dict[str, str] = {}
    if not tokens:
        return samples
    for idx, token in enumerate(tokens):
        placeholder = f"row_{token}"
        value = ""
        if data_row is not None and idx < len(data_row):
            cell = data_row[idx]
            if cell is not None:
                value = str(cell).strip()
        samples[placeholder] = value or "NOT_VISIBLE"
    return samples


def _sheet_to_html(
    sheet,
    column_map: Optional[dict[str, tuple[str, str]]] = None,
) -> tuple[str, dict[str, str]]:
    """
    Convert an openpyxl worksheet to HTML with:
      - a thead row using <th data-label="token">Visible Header</th>
      - a tbody prototype row where each cell contains a token in the form {row_<token>}

    Returns HTML plus a dict of placeholder tokens mapped to sample values from the first data row.
    """

    def _ensure_label(value: object, idx: int) -> str:
        if value not in (None, ""):
            text = str(value).strip()
            if text:
                return text
        return f"Column {idx + 1}"

    def _token_for(label: str, idx: int) -> str:
        norm = _normalize_token(label)
        if not norm:
            norm = f"col_{idx + 1}"
        return norm

    rows = list(sheet.iter_rows(values_only=True))
    header_row = None
    header_index = -1
    for idx, row in enumerate(rows):
        if _row_has_values(row):
            header_row = row
            header_index = idx
            break

    placeholder_tokens: list[str] = []
    if header_row:
        header_labels = [_ensure_label(value, idx) for idx, value in enumerate(header_row)]
        th_cells: list[str] = []
        placeholder_cells: list[str] = []
        for idx, label in enumerate(header_labels):
            token = _token_for(label, idx)
            th_cells.append(f'<th data-label="{html.escape(token)}">{html.escape(label)}</th>')
            placeholder_cells.append("<td>{" + f"row_{token}" + "}</td>")
            placeholder_tokens.append(token)
        thead_html = f"<thead><tr>{''.join(th_cells)}</tr></thead>"
        tbody_html = f"<tbody><tr>{''.join(placeholder_cells)}</tr></tbody>"
    else:
        thead_html = "<thead><tr></tr></thead>"
        tbody_html = "<tbody><tr></tr></tbody>"

    data_row = None
    if header_index >= 0:
        for row in rows[header_index + 1 :]:
            if _row_has_values(row):
                data_row = row
                break

    styles = """
    <style>
      @page { size: A4; margin: 24mm; }
      body { font-family: Arial, sans-serif; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #999; padding: 6px 8px; vertical-align: top; }
    </style>
    """
    head = f"<head><meta charset='utf-8'>{styles}</head>"
    title = html.escape(str(sheet.title or "Sheet1"))
    caption = f"<caption style='caption-side:top;font-weight:700;text-align:left;margin:6px 0'>{title}</caption>"
    table = f'<table id="data-table">{caption}{thead_html}{tbody_html}</table>'
    sample_payload = _build_placeholder_samples(placeholder_tokens, data_row)
    return f"<html>{head}<body>{table}</body></html>", sample_payload


def _sheet_to_reference_html(sheet, *, max_rows: int = 5) -> str:
    """
    Build a data-only HTML snapshot of the original Excel sheet (no placeholders),
    using the first non-empty row as header and up to `max_rows` subsequent data rows.
    This serves as the reference image for fidelity preview and LLM context.
    """
    rows = list(sheet.iter_rows(values_only=True))

    def _row_has_values(values) -> bool:
        for value in values:
            if value is None:
                continue
            if isinstance(value, str):
                if value.strip():
                    return True
                continue
            return True
        return False

    def _ensure_label(value: object, idx: int) -> str:
        if value not in (None, ""):
            text = str(value).strip()
            if text:
                return text
        return f"Column {idx + 1}"

    header_row = None
    header_index = -1
    for i, row in enumerate(rows):
        if _row_has_values(row):
            header_row = row
            header_index = i
            break
    if header_row is None:
        header_row = []
        header_index = -1

    header_labels = [_ensure_label(value, idx) for idx, value in enumerate(header_row)]

    styles = """
    <style>
      @page { size: A4; margin: 24mm; }
      body { font-family: Arial, sans-serif; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #999; padding: 6px 8px; vertical-align: top; }
    </style>
    """
    head = f"<head><meta charset='utf-8'>{styles}</head>"
    title = html.escape(str(sheet.title or "Sheet1"))
    caption = f"<caption style='caption-side:top;font-weight:700;text-align:left;margin:6px 0'>{title}</caption>"

    th_cells = "".join(f"<th>{html.escape(label)}</th>" for label in header_labels)
    thead_html = f"<thead><tr>{th_cells}</tr></thead>"

    # Collect up to max_rows data rows after header
    body_rows: list[str] = []
    if header_index >= 0:
        for row in rows[header_index + 1 : header_index + 1 + max_rows]:
            if not _row_has_values(row):
                continue
            tds = [html.escape("" if v is None else str(v)) for v in row]
            body_rows.append("<tr>" + "".join(f"<td>{v}</td>" for v in tds) + "</tr>")
    if not body_rows:
        body_rows.append("<tr></tr>")
    tbody_html = "<tbody>" + "".join(body_rows) + "</tbody>"

    table = f'<table id="data-table">{caption}{thead_html}{tbody_html}</table>'
    return f"<html>{head}<body>{table}</body></html>"


def xlsx_to_html_preview(
    excel_path: Path,
    out_dir: Path,
    *,
    page_size: str = "A4",
    dpi: int = 144,
    db_path: Path | None = None,
) -> ExcelInitialResult:
    """
    Load the first worksheet of an Excel file and produce:
      - template_p1.html: simple HTML rendering of the sheet
      - sample_rows.json: literal samples for each placeholder token
      - reference_p1.png: PNG preview rendered from the original Excel data
    """
    if openpyxl is None:  # pragma: no cover
        raise RuntimeError("openpyxl is required. Install with `pip install openpyxl`.")

    out_dir.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.load_workbook(filename=str(excel_path), data_only=True)
    sheet = wb.active
    # Enforce a simple safety/UX constraint for initial Excel uploads:
    # Limit the number of non-empty data rows to a maximum (default 5).
    # If exceeded, ask the user to delete extra rows and re-upload.
    try:
        max_rows_env = os.getenv("EXCEL_MAX_DATA_ROWS", "5").strip()
        MAX_DATA_ROWS = int(max_rows_env) if max_rows_env else 5
    except Exception:
        MAX_DATA_ROWS = 5

    rows = list(sheet.iter_rows(values_only=True))
    non_empty_rows = [r for r in rows if _row_has_values(r)]
    data_rows = max(0, len(non_empty_rows) - 1) if non_empty_rows else 0
    if data_rows > MAX_DATA_ROWS:
        raise RuntimeError(
            f"Excel verification failed: found {data_rows} data rows; maximum allowed is {MAX_DATA_ROWS}. Please delete extra rows and upload the file again."
        )
    html_text, sample_row_map = _sheet_to_html(sheet)
    html_path = out_dir / "template_p1.html"
    html_path.write_text(html_text, encoding="utf-8")

    sample_payload = {"sample_row": sample_row_map}
    sample_rows_path = out_dir / "sample_rows.json"
    sample_rows_path.write_text(json.dumps(sample_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # Build a data-only reference HTML to snapshot the original Excel content
    reference_html = _sheet_to_reference_html(sheet, max_rows=MAX_DATA_ROWS)
    reference_html_path = out_dir / "reference_p1.html"
    reference_html_path.write_text(reference_html, encoding="utf-8")

    png_path: Optional[Path] = None
    try:
        png_path = out_dir / "reference_p1.png"
        # Render the data-only reference HTML (not the template) for fidelity preview
        render_html_to_png(reference_html_path, png_path, page_size=page_size, dpi=dpi)
    except Exception:
        logger.warning(
            "excel_png_render_failed",
            extra={"event": "excel_png_render_failed", "html": str(html_path)},
            exc_info=True,
        )
        png_path = None

    return ExcelInitialResult(html_path=html_path, png_path=png_path)
