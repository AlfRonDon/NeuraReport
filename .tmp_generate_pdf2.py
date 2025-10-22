import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        html_path = Path('uploads/d1095f3e-4098-41f4-89d6-87bdc37f76d6/filled_1761006035.html').resolve()
        await page.goto(html_path.as_uri())
        await page.add_style_tag(content='body { counter-reset: page 0; counter-increment: page 1; } .nr-page-number::after { content: counter(page); } .nr-page-count::after { content: counter(pages); }')
        await page.emulate_media(media='print')
        pdf_path = Path('test_footer2.pdf').resolve()
        await page.pdf(path=str(pdf_path), format='A4', print_background=True, margin={'top': '14mm', 'bottom': '18mm', 'left': '14mm', 'right': '14mm'})
        await browser.close()
        print('pdf', pdf_path)

asyncio.run(main())
