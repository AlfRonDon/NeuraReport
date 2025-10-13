import os
import sys
import re
import json
import logging
import base64
import sqlite3
from pathlib import Path
from collections import defaultdict
from typing import Any, Dict, Optional

import asyncio

from ..utils import call_chat_completion, write_text_atomic, sanitize_html, load_prompt
from .css_merge import merge_css_into_html, replace_table_colgroup
from .layout_hints import get_layout_hints

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
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore

try:
    from playwright.async_api import async_playwright
except ImportError:  # pragma: no cover
    async_playwright = None  # type: ignore

PDF_PATH = Path(os.getenv("PDF_PATH", r"C:\Users\alfre\OneDrive\Desktop\CrystalReportViewer1 (6).pdf"))

OUT_DIR = Path.cwd() / "llm_pdf_mapping_outputs_v2"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL      = os.getenv("OPENAI_MODEL", "gpt-5") 
DPI        = int(os.getenv("PDF_DPI", "400"))
ITERATIONS = int(os.getenv("REFINE_ITERS", "1"))


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        logging.getLogger("neura.template_verify").warning(
            "invalid_env_float",
            extra={"event": "invalid_env_float", "name": name, "value": value},
        )
        return default


TARGET_SSIM = _env_float("PHOTOCOPY_TARGET_SSIM", 0.985)
FIX_ACCEPT_PATCH_ONLY = os.getenv("PHOTOCOPY_FIX_ACCEPT_PATCH_ONLY", "0") == "1"
OUT_PDF = OUT_DIR / "report_filled_new.pdf"


_client: Optional["OpenAI"] = None

logger = logging.getLogger("neura.template_verify")


def get_openai_client():
    """
    Return a cached OpenAI client configured from the OPENAI_API_KEY environment variable.
    """
    global _client
    if _client is not None:
        return _client
    if OpenAI is None:  # pragma: no cover
        raise RuntimeError("openai package is not available. Install openai>=1.0.0.")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set.")
    _client = OpenAI(api_key=api_key)
    return _client


def pdf_to_pngs(pdf_path: Path, out_dir: Path, dpi=400):
    """Return PNG path of only the first page of the PDF."""
    if fitz is None:
        raise RuntimeError("PyMuPDF (install via `pip install pymupdf`) is required for PDF rendering.")
    assert pdf_path.exists(), f"PDF not found: {pdf_path}"
    doc = fitz.open(pdf_path)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    page = doc[0]  # first page only
    pix = page.get_pixmap(matrix=mat, alpha=False)
    out_png = out_dir / "reference_p1.png"
    pix.save(out_png)
    doc.close()
    logger.info(
        "pdf_page_rendered",
        extra={
            "event": "pdf_page_rendered",
            "pdf_path": str(pdf_path),
            "png_path": str(out_png),
            "dpi": dpi,
        },
    )
    return [out_png]


def b64_image(path: Path):
    return base64.b64encode(path.read_bytes()).decode("utf-8")

def strip_code_fences(text: str) -> str:
    m = re.search(r"```(?:html|HTML)?\s*([\s\S]*?)```", text)
    return m.group(1).strip() if m else text.strip()

CSS_PATCH_RE = re.compile(r"<!--BEGIN_CSS_PATCH-->([\s\S]*?)<!--END_CSS_PATCH-->", re.I)
HTML_BLOCK_RE = re.compile(r"<!--BEGIN_HTML-->([\s\S]*?)<!--END_HTML-->", re.I)
STYLE_BLOCK_RE = re.compile(r"(?is)<style\b[^>]*>(.*?)</style>")
TABLE_COMMENT_RE = re.compile(
    r"<!--\s*TABLE:(?P<table>[\w\-\.:]+)\s*-->\s*(?P<colgroup><colgroup\b[^>]*>.*?</colgroup>)",
    re.I | re.S,
)
COLGROUP_SNIPPET_RE = re.compile(r"(<colgroup\b[^>]*>.*?</colgroup>)", re.I | re.S)
COLGROUP_ATTR_TARGET_RE = re.compile(
    r"(data-(?:target|table|table-id|for)|table-id|for)\s*=\s*['\"](?P<value>[^'\"]+)['\"]",
    re.I,
)


def normalize_schema_for_initial_html(schema_json: Dict[str, Any]) -> Dict[str, Any]:
    """Return a legacy-compatible schema shape for initial HTML prompts."""
    scalars: Dict[str, str] = {}
    raw_scalars = schema_json.get("scalars", {})
    if isinstance(raw_scalars, dict):
        for key, value in raw_scalars.items():
            token = key
            label: str
            if isinstance(value, dict):
                token = str(value.get("token") or token)
                label = str(value.get("label") or value.get("token") or token)
            elif isinstance(value, str):
                label = value
            else:
                label = str(value)
            scalars[token] = label
    elif isinstance(raw_scalars, list):
        for entry in raw_scalars:
            if isinstance(entry, str):
                scalars[entry] = entry
            elif isinstance(entry, dict):
                token = entry.get("token") or entry.get("name") or entry.get("id")
                if token:
                    scalars[str(token)] = str(entry.get("label") or token)

    blocks_raw = schema_json.get("blocks") or {}
    rows: list[str] = []
    headers: list[str] = []
    repeat_regions = None
    if isinstance(blocks_raw, dict):
        raw_rows = blocks_raw.get("rows")
        if isinstance(raw_rows, list):
            for entry in raw_rows:
                if isinstance(entry, str):
                    rows.append(entry)
                elif isinstance(entry, dict):
                    token = entry.get("token") or entry.get("name") or entry.get("id")
                    if token:
                        rows.append(str(token))
        raw_headers = blocks_raw.get("headers")
        if isinstance(raw_headers, list):
            headers = [str(item) for item in raw_headers]
        repeat_regions = blocks_raw.get("repeat_regions")

    normalized_blocks: Dict[str, Any] = {}
    if rows:
        normalized_blocks["rows"] = rows
    if headers:
        normalized_blocks["headers"] = headers
    if repeat_regions:
        normalized_blocks["repeat_regions"] = repeat_regions

    normalized: Dict[str, Any] = {
        "scalars": scalars,
        "blocks": normalized_blocks,
    }
    notes = schema_json.get("notes")
    if isinstance(notes, str) and notes:
        normalized["notes"] = notes

    page_tokens = schema_json.get("page_tokens_protect") or schema_json.get("pageTokensProtect")
    if isinstance(page_tokens, list) and page_tokens:
        normalized["page_tokens_protect"] = page_tokens

    return normalized


def _iter_colgroup_updates(patch_body: str):
    seen: set[tuple[str, str]] = set()
    for match in TABLE_COMMENT_RE.finditer(patch_body):
        table_id = match.group("table").strip()
        colgroup_html = match.group("colgroup").strip()
        key = (table_id, colgroup_html)
        if table_id and colgroup_html and key not in seen:
            seen.add(key)
            yield table_id, colgroup_html

    for match in COLGROUP_SNIPPET_RE.finditer(patch_body):
        snippet = match.group(1).strip()
        attr_match = COLGROUP_ATTR_TARGET_RE.search(snippet)
        if not attr_match:
            continue
        table_id = attr_match.group("value").strip()
        key = (table_id, snippet)
        if table_id and key not in seen:
            seen.add(key)
            yield table_id, snippet


def apply_fix_response(html_before: str, llm_output: str) -> str:
    """Merge LLM fix output into the existing HTML."""
    output = llm_output.strip()
    css_match = CSS_PATCH_RE.search(output)
    if css_match:
        patch_body = css_match.group(1).strip()
        style_match = STYLE_BLOCK_RE.search(patch_body)
        css_rules = style_match.group(1).strip() if style_match else patch_body
        merged = merge_css_into_html(html_before, css_rules)
        for table_id, colgroup_html in _iter_colgroup_updates(patch_body):
            merged = replace_table_colgroup(merged, table_id, colgroup_html)
        return merged

    html_match = HTML_BLOCK_RE.search(output)
    if html_match:
        return html_match.group(1).strip()

    return output

async def render_html_to_png(html_path: Path, out_png: Path):
    """Render HTML to PNG at A4 size (400 DPI)."""
    if async_playwright is None:
        raise RuntimeError("playwright is required for HTML rendering. Install with `pip install playwright` and run `playwright install chromium`.")
    html_abs = "file://" + str(html_path.resolve())
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(
            viewport={"width": 3308, "height": 4677}  # A4 @ 400 DPI
        )
        await page.goto(html_abs, wait_until="networkidle")
        await page.screenshot(path=str(out_png), full_page=True)
        await browser.close()
    logger.info(
        "html_rendered_to_png",
        extra={
            "event": "html_rendered_to_png",
            "html_path": str(html_path),
            "png_path": str(out_png),
        },
    )


def compare_images(ref_img_path: Path, test_img_path: Path, out_diff: Path):
    if None in (Image, np, cv2, ssim):
        raise RuntimeError("Image comparison requires Pillow, numpy, opencv-python, and scikit-image.")
    A = Image.open(ref_img_path).convert("RGB")
    B = Image.open(test_img_path).convert("RGB")
    # Resize both to the same target (e.g., width of reference)
    target = (A.width, A.height)
    B = B.resize(target)
    A_arr = np.array(A).astype("uint8")
    B_arr = np.array(B).astype("uint8")
    A_g = cv2.cvtColor(A_arr, cv2.COLOR_RGB2GRAY)
    B_g = cv2.cvtColor(B_arr, cv2.COLOR_RGB2GRAY)
    score, diff = ssim(A_g, B_g, full=True, data_range=255)
    heat = ((1 - diff) * 255).astype("uint8")
    heat_color = cv2.applyColorMap(heat, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(A_arr, 0.6, heat_color, 0.4, 0)
    cv2.imwrite(str(out_diff), cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
    return float(score)


def save_html(path: Path, html: str):
    write_text_atomic(path, sanitize_html(html), encoding="utf-8", step="template_verify_save")
    logger.info(
        "html_saved",
        extra={"event": "html_saved", "path": str(path)},
    )


# OpenAI client initialised lazily via get_openai_client()

def request_schema_for_page(page_png: Path, layout_hints: Optional[Dict[str, Any]] = None) -> dict:
    """Ask the LLM to emit a placeholder schema JSON for a single page. Return parsed dict."""
    prompt = load_prompt("template_schema_page")
    hints_json = json.dumps(layout_hints or {}, ensure_ascii=False, separators=(",", ":"))
    client = get_openai_client()
    resp = call_chat_completion(
        client,
        model=MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "text", "text": "HINTS_JSON:\n" + hints_json},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image(page_png)}"}},
            ]
        }],
        description="template_schema_page",
    )
    txt = resp.choices[0].message.content.strip()
    body = strip_code_fences(txt)
    try:
        return json.loads(body)
    except Exception:
        m = re.search(r"\{[\s\S]*\}", body)
        return json.loads(m.group(0)) if m else {"scalars": {}, "blocks": {}, "notes": "(parse_error)"}
def request_initial_html(page_png: Path, schema_json: dict, layout_hints: Optional[Dict[str, Any]] = None) -> str:
    """Ask the LLM to synthesize the first-pass HTML photocopy."""
    prompt = load_prompt("template_initial_html")
    hints_json = json.dumps(layout_hints or {}, ensure_ascii=False, separators=(",", ":"))
    schema_str = json.dumps(schema_json, ensure_ascii=False, separators=(",", ":"))
    legacy_schema = normalize_schema_for_initial_html(schema_json)
    legacy_str = json.dumps(legacy_schema, ensure_ascii=False, separators=(",", ":"))
    client = get_openai_client()
    resp = call_chat_completion(
        client,
        model=MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "text", "text": "SCHEMA:\n" + schema_str},
                {"type": "text", "text": "SCHEMA_LEGACY:\n" + legacy_str},
                {"type": "text", "text": "HINTS_JSON:\n" + hints_json},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image(page_png)}"}},
            ]
        }],
        description="template_initial_html",
    )
    html = strip_code_fences(resp.choices[0].message.content)
    return html
def request_fix_html(schema_json: dict, ref_png: Path, render_png: Path, current_html: str, ssim_value: float) -> str:
    """Ask the LLM for CSS/HTML refinements and merge the response."""
    prompt = load_prompt(
        "template_fix_html",
        replacements={"{{ssim_value:.4f}}": f"{ssim_value:.4f}"},
    )
    schema_str = json.dumps(schema_json, ensure_ascii=False, separators=(",", ":"))
    client = get_openai_client()
    max_attempts = 2 if FIX_ACCEPT_PATCH_ONLY else 1
    last_output = ""
    for attempt in range(1, max_attempts + 1):
        resp = call_chat_completion(
            client,
            model=MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "text", "text": "SCHEMA:\n" + schema_str},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image(ref_png)}"}},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image(render_png)}"}},
                    {"type": "text", "text": "CURRENT_HTML:\n" + current_html},
                ]
            }],
            description="template_fix_html",
        )
        last_output = strip_code_fences(resp.choices[0].message.content or "")
        has_css_patch = bool(CSS_PATCH_RE.search(last_output))
        has_html_block = bool(HTML_BLOCK_RE.search(last_output))
        if FIX_ACCEPT_PATCH_ONLY and not has_css_patch and has_html_block and attempt < max_attempts:
            logger.warning(
                "template_fix_html_css_patch_required",
                extra={
                    "event": "template_fix_html_css_patch_required",
                    "attempt": attempt,
                },
            )
            continue
        merged = apply_fix_response(current_html, last_output)
        if FIX_ACCEPT_PATCH_ONLY and not has_css_patch and has_html_block:
            logger.warning(
                "template_fix_html_full_html_fallback",
                extra={
                    "event": "template_fix_html_full_html_fallback",
                    "attempt": attempt,
                },
            )
        return merged
    return apply_fix_response(current_html, last_output)
async def main():
    # 1) PDF â†’ PNGs
    ref_pngs = pdf_to_pngs(PDF_PATH, OUT_DIR, dpi=DPI)
    ref_pngs = ref_pngs[:1]
    print(f"Extracted {len(ref_pngs)} page image(s).")

    # 2) LLM schema + initial HTML + iterative refinements
    schemas = {}
    all_final_pages = []
    for page_idx, ref_png in enumerate(ref_pngs, start=1):
        page_hints = get_layout_hints(PDF_PATH, page_idx - 1)
        schema = request_schema_for_page(ref_png, layout_hints=page_hints)
        schemas[f"p{page_idx}"] = schema
        (OUT_DIR / f"schema_p{page_idx}.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")

        html_v1 = request_initial_html(ref_png, schema, layout_hints=page_hints)
        curr_html_path = OUT_DIR / f"template_p{page_idx}_v1.html"
        save_html(curr_html_path, html_v1)

        for i in range(1, ITERATIONS + 1):
            render_png = OUT_DIR / f"render_p{page_idx}_v{i}.png"
            diff_png   = OUT_DIR / f"diff_p{page_idx}_v{i}.png"
            await render_html_to_png(curr_html_path, render_png)

            score = compare_images(ref_png, render_png, diff_png)
            print(f"[page {page_idx} | v{i}] SSIM={score:.4f} -> {diff_png.name}")

            if score >= TARGET_SSIM:
                break

            curr_html = request_fix_html(schemas[f"p{page_idx}"], ref_png, render_png, curr_html_path.read_text(encoding="utf-8"), score)
            curr_html_path = OUT_DIR / f"template_p{page_idx}_v{i+1}.html"
            save_html(curr_html_path, curr_html)

        all_final_pages.append(curr_html_path.read_text(encoding="utf-8"))

    # 3) Compose pages correctly (only body content)
    def body_content(doc: str) -> str:
        m = re.search(r"(?is)<body\b[^>]*>(.*?)</body>", doc)
        return (m.group(1) if m else doc).strip()

    combined = ["<!doctype html><html><head><meta charset='utf-8'><title>All Pages</title></head><body>"]
    combined += [body_content(p) + "<div style='page-break-after: always;'></div>" for p in all_final_pages[:-1]]
    combined += [body_content(all_final_pages[-1])]
    combined.append("</body></html>")
    final_path = OUT_DIR / "template_all_pages_final.html"
    save_html(final_path, "\n".join(combined))
    print("Combined HTML:", final_path)


if __name__ == "__main__":
    asyncio.run(main())



