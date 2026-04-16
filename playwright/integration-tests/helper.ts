import type { Locator, Page } from '@playwright/test'
import { pollingIntervalMs, uiLongActionTimeoutMs } from '../helpers/constants'

export async function waitForAndClick({
  locator,
  page,
  timeoutMs = uiLongActionTimeoutMs,
}: {
  locator: Locator
  page: Page
  timeoutMs?: number
}) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      if (await locator.isVisible()) {
        await locator.click()
        return
      }
    } catch {
      // Element not in DOM yet, ignore
    }
    await page.waitForTimeout(pollingIntervalMs)
  }
  throw new Error(`Timeout waiting for element to become visible: ${locator.toString()}`)
}
