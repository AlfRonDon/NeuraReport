import { test, expect } from '@playwright/test'

const captureConsole = (page) => {
  const messages: string[] = []
  page.on('console', (msg) => {
    if (['warning', 'error'].includes(msg.type())) {
      const text = msg.text()
      if (text.includes('net::ERR_CONNECTION_REFUSED')) return
      messages.push(`${msg.type()}: ${text}`)
    }
  })
  return messages
}

test.describe('Keyboard navigation', () => {
  test('skip link focuses main content @ui', async ({ page }) => {
    const consoleMessages = captureConsole(page)
    await page.goto('/')
    await page.keyboard.press('Tab')

    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeVisible()

    const outlineWidth = await skipLink.evaluate((el) => getComputedStyle(el).outlineWidth)
    expect(outlineWidth).not.toBe('0px')

    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()

    expect(consoleMessages).toEqual([])
  })

  test('tab order reaches setup navigation @ui', async ({ page }) => {
    const consoleMessages = captureConsole(page)
    await page.goto('/')

    // Skip to main content first
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    const navTab = page.getByRole('tab', { name: 'Connect' })
    let focused = false
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab')
      const isFocused = await navTab.evaluate((el) => el === document.activeElement)
      if (isFocused) {
        focused = true
        break
      }
    }
    expect(focused).toBe(true)

    const generateTab = page.getByRole('tab', { name: 'Generate Templates' })
    let reached = false
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab')
      const isFocused = await generateTab.evaluate((el) => el === document.activeElement)
      if (isFocused) {
        reached = true
        break
      }
    }
    expect(reached).toBe(true)

    expect(consoleMessages).toEqual([])
  })
})
