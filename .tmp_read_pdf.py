import fitz
from pathlib import Path
pdf_path = Path('uploads/d1095f3e-4098-41f4-89d6-87bdc37f76d6/filled_1761006035.pdf')
doc = fitz.open(pdf_path)
for i, page in enumerate(doc, 1):
    text = page.get_text()
    idx = text.rfind('Page')
    if idx >= 0:
        print('Page', i, 'snippet:', text[idx:idx+50])
    else:
        print('Page', i, 'snippet: not found')
print('total pages', len(doc))
