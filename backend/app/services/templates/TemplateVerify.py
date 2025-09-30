import os
import sys
import re
import json
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

OUT_PDF = OUT_DIR / "report_filled_new.pdf"


_client = None


def get_openai_client():

    api_key = "key"
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
    return [out_png]


def b64_image(path: Path):
    return base64.b64encode(path.read_bytes()).decode("utf-8")

def strip_code_fences(text: str) -> str:
    m = re.search(r"```(?:html|HTML)?\s*([\s\S]*?)```", text)
    return m.group(1).strip() if m else text.strip()

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
    path.write_text(html, encoding="utf-8")


# OpenAI client initialised lazily via get_openai_client()

def request_schema_for_page(page_png: Path) -> dict:
    """Ask GPTâ€‘5 to emit a placeholder schema JSON for a single page. Return parsed dict."""
    prompt = (
        "Infer a placeholder schema for this PDF page. Identify dynamic fields and repeating blocks. "
        "Return ONLY compact JSON with keys: "
        "{ 'scalars': { ... }, 'blocks': { 'rows': ['sl','name','set','ach','err','errp'] }, 'notes': '...' }. "
        "Do not generate HTML in this step."
    )
    client = get_openai_client()
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image(page_png)}"}},
            ]
        }]
    )
    txt = resp.choices[0].message.content.strip()
    body = strip_code_fences(txt)
    try:
        return json.loads(body)
    except Exception:
        m = re.search(r"\{[\s\S]*\}", body)
        return json.loads(m.group(0)) if m else {"scalars":{}, "blocks":{}, "notes":"(parse_error)"}

def request_initial_html(page_png: Path, schema_json: dict) -> str:

    prompt = (
    "Produce a COMPLETE, self-contained HTML document (<!DOCTYPE html> â€¦) with inline <style>. "
    "It must visually photocopy the given PDF page image as closely as possible. "
    "Mirror fonts, spacing, borders, alignment, and table layouts. "
    "Tables must use border-collapse, 1px borders, and table-layout: fixed for neat alignment.\n\n"

    "SCHEMA USAGE\n"
    "- Use ONLY placeholders from the provided SCHEMA exactly as written (same braces, same names). "
    "- If a value is not in SCHEMA, render it as literal text. "
    "- If a token exists in SCHEMA but not on this page, omit it.\n\n"

    "REPEATABLE BLOCK (edge case)\n"
    "- If the page clearly contains repeating sections (visually identical blocks stacked vertically), "
    "output ONE prototype of that block wrapped exactly as:\n"
    "<!-- BEGIN:BLOCK_REPEAT batches -->\n"
    "<section class='batch-block'>â€¦</section>\n"
    "<!-- END:BLOCK_REPEAT -->\n"
    "- Place header/footer OUTSIDE these markers. "
    "- Do NOT clone or duplicate multiple blocks.\n\n"

    "ROW PROTOTYPES\n"
    "- For tables with repeating rows, output headers plus a single <tbody><tr>â€¦</tr></tbody> row prototype. "
    "- Keep any final summary/total row if it exists.\n\n"

    "STRUCTURE & CSS\n"
    "- Support flowing content with unlimited repeats: "
    ".batch-block { break-inside: avoid; page-break-inside: avoid; margin: 6mm 0; } "
    "- Avoid fixed heights or absolute positioning (except optional fixed header/footer if persistent across pages). "
    " Do not put contents in tables if they are not present in the original PDF "
    "- Preserve clean typography and mirrors the page ; numbers right-aligned where appropriate.\n\n"
    "- Reproduce what is visibleâ€”draw ONLY the rules/lines that exist in the image. "
    "Default to no borders and transparent backgrounds; add borders per edge only where a line is visible. "
    "No shaded headers, zebra-stripes, or gray fills unless clearly present. "
    "Use table markup for ONLY for true grids and structured data (never div-based). Use borderless tables or simple divs for key/value areas. "
     "Avoid unnecessary nested tables or enclosing frames.\n"
    "- Flow is printable: @page A4 with sensible margins; avoid fixed heights and absolute positioning; "


    "OUTPUT RULES\n"
    "- No lorem ipsum or sample values. "
    "- No external resources. "
    "- No comments except the repeat markers if applicable. "
    "- Return RAW HTML only (no markdown fences, no explanations).\n"
)



    schema_str = json.dumps(schema_json, ensure_ascii=False, separators=(",", ":"))
    client = get_openai_client()
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "text", "text": "SCHEMA:\n" + schema_str},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image(page_png)}"}},
            ]
        }]
    )
    html = strip_code_fences(resp.choices[0].message.content)
    return html



def request_fix_html(schema_json: dict, ref_png: Path, render_png: Path, current_html: str, ssim_value: float) -> str:
    prompt = (
    f"Compare these images: REFERENCE (PDF page) vs RENDER (current HTML). SSIM={ssim_value:.4f}.\n"
    "Goal: refine the provided HTML/CSS so the render becomes a near-perfect PHOTOCOPY of the reference.\n\n"

    "STRICT RULES\n"
    "- Do NOT rename, add, remove, or move SCHEMA placeholders; keep all tokens exactly as in the current HTML.\n"
    "- Do NOT change the number of repeating sections or table rows that currently exist in the HTML.\n"
    "- If repeat markers (e.g., <!-- BEGIN:BLOCK_REPEAT ... -->) are present, keep them unchanged with exactly one prototype inside.\n"
    "- Prefer CSS edits; only introduce minimal HTML wrappers (e.g., structural containers/colgroups) if strictly necessary to achieve alignmentâ€”never alter tokens.\n\n"

    "VISUAL MATCHING (inference-based)\n"
    "Identify and correct EVERY visible discrepancy between reference and render at any scale. "
    "Infer and adjust geometry, proportions, typography and line metrics, borders/line weights, grid/column structure, "
    "text/number alignment, intra/inter-block spacing, pagination behavior, page frame presence, and header/footer placement. "
    "Derive all values from the reference image; do not assume defaults. The result should be indistinguishable from the reference when printed.\n\n"

    "OUTPUT\n"
    "- Return FULL HTML (<!DOCTYPE html> â€¦) with inline <style> onlyâ€”no external resources.\n"
    "- No markdown, no commentary, no sample data.\n"
    "- Preserve existing IDs/classes/markers; add only what is minimally required for fidelity.\n"
)

    schema_str = json.dumps(schema_json, ensure_ascii=False)
    client = get_openai_client()
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "text", "text": "SCHEMA:\n" + schema_str},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image(ref_png)}"}},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image(render_png)}"}},
                {"type": "text", "text": current_html},
            ]
        }]
    )
    return strip_code_fences(resp.choices[0].message.content)


async def main():
    # 1) PDF â†’ PNGs
    ref_pngs = pdf_to_pngs(PDF_PATH, OUT_DIR, dpi=DPI)
    ref_pngs = ref_pngs[:1]
    print(f"Extracted {len(ref_pngs)} page image(s).")

    # 2) LLM schema + initial HTML + iterative refinements
    schemas = {}
    all_final_pages = []
    for page_idx, ref_png in enumerate(ref_pngs, start=1):
        schema = request_schema_for_page(ref_png)
        schemas[f"p{page_idx}"] = schema
        (OUT_DIR / f"schema_p{page_idx}.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")

        html_v1 = request_initial_html(ref_png, schema)
        curr_html_path = OUT_DIR / f"template_p{page_idx}_v1.html"
        save_html(curr_html_path, html_v1)

        for i in range(1, ITERATIONS + 1):
            render_png = OUT_DIR / f"render_p{page_idx}_v{i}.png"
            diff_png   = OUT_DIR / f"diff_p{page_idx}_v{i}.png"
            await render_html_to_png(curr_html_path, render_png)

            score = compare_images(ref_png, render_png, diff_png)
            print(f"[page {page_idx} | v{i}] SSIM={score:.4f} -> {diff_png.name}")

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
