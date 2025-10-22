import fitz
from pathlib import Path

PAGE_NO_MARKER = "__NR_PAGE_NO__"
PAGE_COUNT_MARKER = "__NR_PAGE_COUNT__"

def replace_pdf_marker(page: "fitz.Page", marker: str, text: str) -> None:
    rects = page.search_for(marker)
    if not rects:
        return
    for rect in rects:
        pad_w = max(rect.width * 0.05, 0.5)
        pad_h = max(rect.height * 0.25, 0.5)
        padded = fitz.Rect(rect.x0 - pad_w, rect.y0 - pad_h, rect.x1 + pad_w, rect.y1 + pad_h)
        page.draw_rect(padded, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)
        font_size = max(rect.height * 0.85, 6.0)
        page.insert_textbox(
            padded,
            text,
            fontsize=font_size,
            fontname="helv",
            color=(0, 0, 0),
            align=fitz.TEXT_ALIGN_CENTER,
        )

def bake(pdf_path: Path, out_path: Path):
    doc = fitz.open(pdf_path)
    total = doc.page_count
    for idx, page in enumerate(doc, start=1):
        replace_pdf_marker(page, PAGE_NO_MARKER, str(idx))
        replace_pdf_marker(page, PAGE_COUNT_MARKER, str(total))
    out_path.write_bytes(doc.tobytes())
    doc.close()
    print('wrote', out_path)

bake(Path('test_multi.pdf'), Path('test_multi_baked.pdf'))
