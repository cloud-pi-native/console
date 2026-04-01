import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function waitForSnackbar({
  page,
  text,
  timeoutMs = 20000,
}: {
  page: Page
  text: string | RegExp
  timeoutMs?: number
}) {
  await expect(page.getByTestId('snackbar')).toContainText(text, {
    timeout: timeoutMs,
  })
}
