import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        html_path = Path('uploads/d1095f3e-4098-41f4-89d6-87bdc37f76d6/filled_1761006035.html').resolve()
        await page.goto(html_path.as_uri())
        await page.add_style_tag(content='@page { @bottom-center { content: "Page " counter(page) " of " counter(pages); } }')
        await page.emulate_media(media='print')
        pdf_path = Path('test_footer.pdf').resolve()
        await page.pdf(path=str(pdf_path), format='A4', print_background=True, margin={'top': '10mm', 'bottom': '20mm', 'left': '10mm', 'right': '10mm'})
        await browser.close()
        print('pdf', pdf_path)

asyncio.run(main())
