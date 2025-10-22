import fitz
from pathlib import Path

pdf_path = Path('marker_sample_baked.pdf')
doc = fitz.open(pdf_path)
page = doc[0]
pix = page.get_pixmap(dpi=150)
pix.save('marker_sample_page1.png')
print('saved image')
