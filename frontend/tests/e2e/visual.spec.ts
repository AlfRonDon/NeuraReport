import { test, expect } from '@playwright/test'

const breakpoints = [
  { width: 360, height: 720 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
]

const surfaces = [
  {
    name: 'setup-connect',
    prepare: async (page) => {
      await page.goto('/')
      await page.getByRole('tab', { name: 'Connect' }).click()
    },
  },
  {
    name: 'setup-upload',
    prepare: async (page) => {
      await page.goto('/')
      await page.getByRole('tab', { name: 'Generate Templates' }).click()
      await page.waitForTimeout(150)
    },
  },
  {
    name: 'setup-templates',
    prepare: async (page) => {
      await page.goto('/')
      await page.getByRole('tab', { name: 'Generate Report' }).click()
      await page.waitForTimeout(150)
    },
  },
  {
    name: 'generate-page',
    prepare: async (page) => {
      await page.goto('/generate')
      await page.waitForTimeout(150)
    },
  },
]

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

test.describe('Responsive visuals', () => {
  for (const viewport of breakpoints) {
    test(`renders without overflow at ${viewport.width}px @visual`, async ({ page }) => {
      const consoleMessages = captureConsole(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const surface of surfaces) {
        await surface.prepare(page)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        )
        expect(overflow).toBeFalsy()

        const screenshot = await page.locator('#main-content').screenshot()
        test.info().attach(`${surface.name}-${viewport.width}`, {
          body: screenshot,
          contentType: 'image/png',
        })
      }

      expect(consoleMessages).toEqual([])
    })
  }
})
