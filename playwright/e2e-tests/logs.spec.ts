import { expect, test } from '@playwright/test'

import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'

test.describe('Admin - Logs', () => {
  test('should display logs and paginate', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })

    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationLogs').click()

    await expect(page.locator('h1')).toContainText(
      'Journaux des services associés à la chaîne DSO',
    )
    await expect(page.getByTestId('logCountInfo')).toBeVisible()
    await expect(page.getByTestId('positionInfo').first()).toBeVisible()

    await expect(page.getByTestId('seePreviousPageBtn').first()).toBeDisabled()
    await expect(page.getByTestId('seeFirstPageBtn').first()).toBeDisabled()
    await expect(page.getByTestId('seeNextPageBtn').first()).toBeEnabled()
    await expect(page.getByTestId('seeLastPageBtn').first()).toBeEnabled()

    await expect(page.locator('[data-testid$="-json"]')).toHaveCount(10)

    await page.getByTestId('seeNextPageBtn').first().click()
    await expect(page.getByTestId('seePreviousPageBtn')).toBeEnabled()
    await expect(page.getByTestId('seeFirstPageBtn')).toBeEnabled()

    await page.getByTestId('showLogsBtn').click()
    await expect(page.locator('[data-testid$="-json"]')).toHaveCount(0)
    await page.getByTestId('showLogsBtn').click()
    await expect(page.locator('[data-testid$="-json"]')).not.toHaveCount(0)
  })
})
