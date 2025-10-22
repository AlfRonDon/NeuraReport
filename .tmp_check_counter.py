import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        html_path = Path('uploads/d1095f3e-4098-41f4-89d6-87bdc37f76d6/filled_1761006035.html').resolve()
        await page.goto(html_path.as_uri())
        await page.emulate_media(media='print')
        content_num = await page.evaluate("() => getComputedStyle(document.querySelector('.nr-page-number'), '::after').content")
        content_count = await page.evaluate("() => getComputedStyle(document.querySelector('.nr-page-count'), '::after').content")
        print('page', content_num)
        print('pages', content_count)
        await browser.close()

asyncio.run(main())
