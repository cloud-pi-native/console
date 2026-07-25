import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

process.loadEnvFile(path.resolve(__dirname, '..', 'apps/client', '.env.docker'))

const isIntegration = process.env.INTEGRATION === 'true'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: isIntegration ? './integration-tests' : './e2e-tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  retries: 3,

  workers: process.env.CI ? 1 : undefined, // Default is 50% logical cores

  // The maximum number of test failures forthe whole test suite run.
  // After reaching this number, testing will stop and exit with an error.
  // Setting to zero (default) disables this behavior.
  maxFailures: 1,

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
