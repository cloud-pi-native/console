import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'

const adminLogsUrlRe = /\/admin\/logs/
const logCountRe = /Total\s*:\s*(\d+)/

async function goToAdminLogs(page: Page) {
  await page.goto(clientURL)
  await signInCloudPiNative({ page, credentials: tcolinUser })
  await page.getByTestId('menuAdministrationBtn').click()
  await page.getByTestId('menuAdministrationLogs').click()
  await expect(page).toHaveURL(adminLogsUrlRe)
  await expect(page.getByTestId('logCountInfo')).toBeVisible()
}

test.describe('Administration logs', { tag: '@e2e' }, () => {
  test('Should display logs list, logged in as admin', async ({ page }) => {
    await goToAdminLogs(page)

    const logCountText = await page.getByTestId('logCountInfo').textContent()
    expect(logCountText).toBeTruthy()
    const total = Number((logCountText || '').match(logCountRe)?.[1] || 0)

    const positionInfo = page.getByTestId('positionInfo').first()
    const seePreviousPageBtn = page.getByTestId('seePreviousPageBtn').first()
    const seeFirstPageBtn = page.getByTestId('seeFirstPageBtn').first()
    const seeNextPageBtn = page.getByTestId('seeNextPageBtn').first()
    const seeLastPageBtn = page.getByTestId('seeLastPageBtn').first()

    await expect(positionInfo).toContainText('sur')
    await expect(seePreviousPageBtn).toBeDisabled()
    await expect(seeFirstPageBtn).toBeDisabled()

    const logs = page.locator('[data-testid$="-json"]')
    await expect(logs).toHaveCount(Math.min(10, total))

    if (total > 10) {
      await expect(seeNextPageBtn).toBeEnabled()
      await expect(seeLastPageBtn).toBeEnabled()

      const firstLogText = await logs.first().textContent()
      await seeNextPageBtn.click()

      await expect(seePreviousPageBtn).toBeEnabled()
      await expect(seeFirstPageBtn).toBeEnabled()
      await expect(positionInfo).toContainText('sur')
      await expect(logs.first()).not.toHaveText(firstLogText || '')

      await seeFirstPageBtn.click()
      await expect(seePreviousPageBtn).toBeDisabled()
      await expect(seeFirstPageBtn).toBeDisabled()
    } else {
      await expect(seeNextPageBtn).toBeDisabled()
      await expect(seeLastPageBtn).toBeDisabled()
    }
  })

  test('Should toggle compact logs display, logged in as admin', async ({ page }) => {
    await goToAdminLogs(page)

    await expect(page.locator('h1')).toContainText(
      'Journaux des services associés à la chaîne DSO',
    )

    const jsonBoxes = page.locator('.json-box')
    await expect(jsonBoxes.first()).toBeVisible()

    await page.getByTestId('showLogsBtn').click()
    await expect(jsonBoxes).toHaveCount(0)

    await page.getByTestId('showLogsBtn').click()
    await expect(jsonBoxes.first()).toBeVisible()
  })
})
