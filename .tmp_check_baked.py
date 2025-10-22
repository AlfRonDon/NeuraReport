import fitz
from pathlib import Path
pdf_path = Path('test_multi_baked.pdf')
doc = fitz.open(pdf_path)
for i, page in enumerate(doc, 1):
    text = page.get_text()
    idx = text.rfind('Page')
    if idx >= 0:
        print('Page', i, text[idx:idx+30])
    else:
        print('Page', i, 'not found')
print('total', len(doc))
