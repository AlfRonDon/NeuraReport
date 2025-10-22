import fitz
from pathlib import Path
pdf_path = Path('marker_sample_baked.pdf')
doc = fitz.open(pdf_path)
for i, page in enumerate(doc, 1):
    text = page.get_text()
    print('Page', i, text)
