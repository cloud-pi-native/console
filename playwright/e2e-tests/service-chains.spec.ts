import { expect, test } from '@playwright/test'

import type { Credentials } from './utils'
import { adminUser, clientURL, signInCloudPiNative } from './utils'

test.describe('Service Chains page', () => {
  test.describe('Given an Admin-level user', () => {
    let user: Credentials
    test.beforeEach(() => {
      user = adminUser
    })

    test('should list every service chain', async ({ page }) => {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: user })
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationServiceChains').click()
      await expect(
        page.getByRole('cell', { name: 'dso.dso.minint.fr' }),
      ).toBeVisible()
    })

    test('should show a service chain details', async ({ page }) => {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: user })
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationServiceChains').click()
      await page.getByRole('cell', { name: 'dso.dso.minint.fr' }).click()
      await expect(page.locator('h1')).toContainText('dso.dso.minint.fr')
    })
  })
})
