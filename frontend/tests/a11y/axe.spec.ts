import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

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

const views = [
  {
    name: 'setup',
    prepare: async (page) => {
      await page.goto('/')
      await page.getByRole('tab', { name: 'Connect' }).click()
    },
  },
  {
    name: 'upload',
    prepare: async (page) => {
      await page.goto('/')
      await page.getByRole('tab', { name: 'Generate Templates' }).click()
      await page.waitForTimeout(150)
    },
  },
  {
    name: 'templates',
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

test.describe('Accessibility audit', () => {
  for (const view of views) {
    test(`${view.name} has no serious violations @a11y`, async ({ page }) => {
      const consoleMessages = captureConsole(page)
      await view.prepare(page)

      const results = await new AxeBuilder({ page }).analyze()
      const serious = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      )

      expect(serious).toEqual([])
      expect(consoleMessages).toEqual([])
    })
  }
})
