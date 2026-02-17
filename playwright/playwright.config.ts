import path from 'node:path'

import dotenv from 'dotenv'

import { defineConfig, devices } from '@playwright/test'

dotenv.config({
  path: path.resolve(__dirname, '..', 'apps/client', '.env.docker'),
})

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e-tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  retries: 3,

  // workers: 1, // Default is 50% logical cores

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Retain trace on failed tries. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
  },

  /* All timeouts are in milliseconds */
  // Timeout for each and every `test` block
  timeout: Number(process.env.CONSOLE_GLOBAL_TIMEOUT) || 30_000,

  // Timeout for each and every `expect` command
  expect: {
    timeout: Number(process.env.CONSOLE_EXPECT_TIMEOUT) || 10_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
})
