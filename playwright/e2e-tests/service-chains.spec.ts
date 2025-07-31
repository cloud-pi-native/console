import { expect, test } from '@playwright/test'

import { adminUser, clientURL, signInCloudPiNative } from './utils'

test.describe('Service Chains page', () => {
  test('should list service chains', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationServiceChains').click()
    await expect(
      page.getByRole('cell', { name: 'dso.dso.minint.fr' }),
    ).toBeVisible()
  })
})
