import fitz
from pathlib import Path

PAGE_NO_MARKER = "__NR_PAGE_NO__"
PAGE_COUNT_MARKER = "__NR_PAGE_COUNT__"

def replace_marker(page, marker, text):
    rects = page.search_for(marker)
    if not rects:
        return False
    for rect in rects:
        font_size = max(rect.height * 0.9, 6.0)
        page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1), width=0, overlay=True)
        page.insert_textbox(
            rect,
            text,
            fontsize=font_size,
            fontname="helv",
            color=(0, 0, 0),
            align=fitz.TEXT_ALIGN_CENTER,
            overlay=True,
        )
    return True

def bake(pdf_path: Path, out_path: Path):
    doc = fitz.open(pdf_path)
    total = doc.page_count
    for idx, page in enumerate(doc, start=1):
        changed = False
        if replace_marker(page, PAGE_NO_MARKER, str(idx)):
            changed = True
        if replace_marker(page, PAGE_COUNT_MARKER, str(total)):
            changed = True
        if changed:
            page.clean_contents()
    out_path.write_bytes(doc.tobytes())
    doc.close()

bake(Path('marker_sample.pdf'), Path('marker_sample_baked.pdf'))
