import fitz
from pathlib import Path

PAGE_NO_MARKER = "__NR_PAGE_NO__"
PAGE_COUNT_MARKER = "__NR_PAGE_COUNT__"

doc = fitz.open()
for i in range(3):
    page = doc.new_page()
    page.insert_text((50, 750), f"Footer {PAGE_NO_MARKER} of {PAGE_COUNT_MARKER}", fontsize=12)

path = Path('marker_sample.pdf')
path.write_bytes(doc.tobytes())
doc.close()
print('created', path)
