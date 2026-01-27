export async function waitForAndClick({
  locator,
  page,
  timeout = 300000,
}: {
  locator: Locator
  page: Page
  timeout?: number
}) {
  const refreshInterval = 5000
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      if (await locator.isVisible()) {
        await locator.click()
        return
      }
    } catch (_) {
      // Element not in DOM yet, ignore
    }
    await page.waitForTimeout(refreshInterval)
  }
  throw new Error(`Timeout waiting for element to become visible: ${locator.toString()}`)
}
