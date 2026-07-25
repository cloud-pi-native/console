import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { snackbarTimeoutMs } from './constants'

export async function waitForSnackbar({
  page,
  text,
  timeoutMs = snackbarTimeoutMs,
}: {
  page: Page
  text: string | RegExp
  timeoutMs?: number
}) {
  await expect(page.getByTestId('snackbar')).toContainText(text, {
    timeout: timeoutMs,
  })
}
