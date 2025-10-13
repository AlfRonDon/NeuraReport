import { test, expect } from '@playwright/test'

const viewports = [
  { width: 360, height: 780 },
  { width: 390, height: 820 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 900 },
  { width: 1440, height: 900 },
]

const scenarios = [
  {
    name: 'Setup - Connect',
    path: '/',
    prepare: async (page) => {
      await expect(page.getByRole('heading', { name: 'Connect Database' })).toBeVisible()
    },
  },
  {
    name: 'Setup - Generate Templates',
    path: '/',
    prepare: async (page) => {
      await page.waitForFunction(() => typeof window.__NEURA_APP_STORE__ !== 'undefined')
      await page.evaluate(() => window.__NEURA_APP_STORE__?.setState({ setupNav: 'generate' }))
      await page.waitForFunction(() => window.__NEURA_APP_STORE__?.getState()?.setupNav === 'generate')
      await page.waitForTimeout(150)
    },
  },
  {
    name: 'Setup - Generate Report',
    path: '/',
    prepare: async (page) => {
      await page.waitForFunction(() => typeof window.__NEURA_APP_STORE__ !== 'undefined')
      await page.evaluate(() => window.__NEURA_APP_STORE__?.setState({ setupNav: 'templates' }))
      await page.waitForFunction(() => window.__NEURA_APP_STORE__?.getState()?.setupNav === 'templates')
      await expect(page.getByRole('heading', { name: 'Generate Report' })).toBeVisible()
    },
  },
  {
    name: 'Generate Route',
    path: '/generate',
    prepare: async (page) => {
      await expect(page.getByRole('heading', { name: 'Template Picker' })).toBeVisible()
    },
  },
]

test.describe('@ui Layout has no horizontal scroll', () => {
  for (const viewport of viewports) {
    test.describe(`${viewport.width}x${viewport.height}`, () => {
      for (const scenario of scenarios) {
        test(`${scenario.name}`, async ({ page }) => {
          await page.setViewportSize(viewport)
          await page.goto(scenario.path, { waitUntil: 'domcontentloaded' })
          await page.waitForLoadState('domcontentloaded')
          await scenario.prepare(page)
          await page.waitForTimeout(100)

          const { scrollWidth, clientWidth } = await page.evaluate(() => {
            const { documentElement } = document
            return {
              scrollWidth: documentElement.scrollWidth,
              clientWidth: documentElement.clientWidth,
            }
          })

          expect.soft(scrollWidth, `${scenario.name} width`).toBeLessThanOrEqual(clientWidth + 1)
        })
      }
    })
  }
})
