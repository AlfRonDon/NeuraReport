import fitz
from pathlib import Path
pdf_path = Path('test_footer2.pdf')
doc = fitz.open(pdf_path)
for i, page in enumerate(doc, 1):
    text = page.get_text()
    idx = text.rfind('Page')
    if idx >= 0:
        print('Page', i, text[idx:idx+50])
    else:
        print('Page', i, 'not found')
print('total', len(doc))
