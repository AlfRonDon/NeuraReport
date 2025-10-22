import fitz
from pathlib import Path
pdf_path = Path('marker_sample_baked.pdf')
doc = fitz.open(pdf_path)
for i, page in enumerate(doc, 1):
    if 'Page 1' in page.get_text():
        print('Found Page 1 on page', i)
    if 'Page 2' in page.get_text():
        print('Found Page 2 on page', i)
    if 'Page 3' in page.get_text():
        print('Found Page 3 on page', i)
