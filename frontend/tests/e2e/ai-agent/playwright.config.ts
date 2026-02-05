/**
 * Separate Playwright config for AI Agent tests.
 * Uses different output dirs to avoid conflicts with the semantic audit.
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.ts'],
  fullyParallel: false,
  timeout: 300_000, // 5 minutes per test (LLM calls are slow)
  expect: {
    timeout: 15_000,
  },
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5176',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  outputDir: '../../../playwright-results-ai-agent',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
