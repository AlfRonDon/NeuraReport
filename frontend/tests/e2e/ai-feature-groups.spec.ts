import { test, expect } from '@playwright/test'

test.describe('AI feature groups', () => {
  test('DocQA page loads @ui', async ({ page }) => {
    await page.goto('/docqa')
    await expect(page.getByRole('heading', { name: 'Document Q&A' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Session' })).toBeVisible()
  })

  test('Knowledge Library page loads @ui', async ({ page }) => {
    await page.goto('/knowledge')
    await expect(page.getByRole('heading', { name: 'Knowledge Library' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Upload Document' })).toBeVisible()
  })

  test('AI Agents page loads @ui', async ({ page }) => {
    await page.goto('/agents')
    await expect(page.getByRole('heading', { name: 'AI Agents' })).toBeVisible()
    await expect(page.getByText('Select Agent')).toBeVisible()
  })

  test('NL2SQL generates and executes a read-only query @ui', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/query')

    // Pick a connection (required to enable Generate SQL).
    const label = page.locator('label', { hasText: 'Database Connection' }).first()
    await expect(label).toBeVisible()
    const labelId = await label.getAttribute('id')
    const connectionSelect = labelId
      ? page.locator(`[role="combobox"][aria-labelledby*="${labelId}"]`)
      : page.getByRole('combobox').first()
    await expect(connectionSelect.first()).toBeVisible()

    await connectionSelect.first().click()
    const sampleOption = page.getByRole('option', { name: /sample\.db/i })
    if (await sampleOption.count()) {
      await sampleOption.first().click()
    } else {
      await page.getByRole('option').first().click()
    }

    await page.getByPlaceholder(/Ask a question about your data/i).fill('How many orders are there?')

    const generateBtn = page.getByRole('button', { name: 'Generate SQL' })
    await expect(generateBtn).toBeEnabled()
    await generateBtn.click()

    await expect(page.getByText('Generated SQL')).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: 'Execute Query' }).click()
    await expect(page.getByText('Results')).toBeVisible({ timeout: 20_000 })
  })
})
