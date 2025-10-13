import { expect, test } from '@playwright/test'

import type { Credentials } from './utils'
import { adminUser, clientURL, signInCloudPiNative } from './utils'

test.describe('Service Chains page', () => {
  test.describe('Given an Admin-level user', () => {
    let user: Credentials
    test.beforeEach(() => {
      user = adminUser
    })

    // @TODO These tests assume that there is at least one Service Chain present
    // in the mocked up data. Ensure that this is true at all times !
    test('should list service chains', { tag: '@e2e' }, async ({ page }) => {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: user })
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationServiceChains').click()
      // We take the first service chain available
      await expect(
        page
          .getByTestId('tableAdministrationServiceChains')
          .locator('tr')
          .nth(1),
      ).toBeVisible()
    })

    test('should show a service chain details', { tag: '@e2e' }, async ({ page }) => {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: user })
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationServiceChains').click()
      // We take the first service chain available
      await page
        .getByTestId('tableAdministrationServiceChains')
        .locator('tr')
        .nth(1)
        .click()
      await expect(
        page.getByRole('heading', { name: /Chaîne de services/ }),
      ).toBeVisible()
    })

    test('should show a service chain flows', { tag: '@e2e' }, async ({ page }) => {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: user })
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationServiceChains').click()
      await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
      // We take the first service chain available
      await page
        .getByTestId('tableAdministrationServiceChains')
        .locator('tr')
        .nth(1)
        .click()
      await expect(
        page.getByTestId('service-chain-flows'),
      ).toBeVisible()
    })
  })
})
