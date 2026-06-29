import { expect, test } from '@playwright/test'
import { adminUser, clientURL, signInCloudPiNative } from '../config/console'

test.describe('Service Chains page', () => {
  test.describe('Given an Admin-level user', () => {
    test(
      'should list service chains',
      { tag: ['@e2e', '@service-chains'] },
      async ({ page }) => {
        await page.goto(clientURL)
        await signInCloudPiNative({ page, credentials: adminUser })
        await page.getByTestId('menuAdministrationBtn').click()
        await page.getByTestId('menuAdministrationServiceChains').click()
        // We take the first service chain available
        await expect(
          page
            .getByTestId('tableAdministrationServiceChains')
            .locator('tr')
            .nth(1),
        ).toBeVisible()
      },
    )

    test(
      'should show a service chain details',
      { tag: ['@e2e', '@service-chains'] },
      async ({ page }) => {
        await page.goto(clientURL)
        await signInCloudPiNative({ page, credentials: adminUser })
        await page.getByTestId('menuAdministrationBtn').click()
        await page.getByTestId('menuAdministrationServiceChains').click()
        // We take the first service chain available
        await page
          .getByTestId('tableAdministrationServiceChains')
          .locator('tr')
          .nth(1)
          .click()
        await expect(
          page.getByRole('heading', { name: 'Chaîne de services' }),
        ).toBeVisible()
      },
    )

    test(
      'should show a service chain flows',
      { tag: ['@e2e', '@service-chains', '@service-chain-flows'] },
      async ({ page }) => {
        await page.goto(clientURL)
        await signInCloudPiNative({ page, credentials: adminUser })
        await page.getByTestId('menuAdministrationBtn').click()
        await expect(page.locator('.fr-collapsing')).toBeVisible()
        await expect(page.locator('.fr-collapsing')).not.toBeVisible()

        await page.getByTestId('menuAdministrationServiceChains').click()
        await expect(
          page.getByTitle('Voir les détails de la chaîne de service').first(),
        ).toBeVisible()
        // We take the first service chain available
        await page
          .getByTestId('tableAdministrationServiceChains')
          .locator('tr')
          .nth(1)
          .click()
        await expect(page.getByTestId('service-chain-flows')).toBeVisible()
      },
    )
  })
})
