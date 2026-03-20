import { expect, test } from '@playwright/test'

import { clientURL, signInCloudPiNative, testUser } from '../config/console'

const servicesHealthUrlRegex = /\/services-health/

test.describe('Services health', () => {
  test('should display services health when logged in', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    await page.getByTestId('menuServicesHealth').click()
    await expect(page).toHaveURL(servicesHealthUrlRegex)
    await expect(page.locator('h1')).toContainText(
      'Status des services de la plateforme DSO',
    )
    await expect(page.getByTestId('box-info').locator(':scope > *')).toHaveCount(
      7,
    )
  })

  test('should display services health when not logged in', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible()

    await page.getByTestId('menuServicesHealth').click()
    await expect(page).toHaveURL(servicesHealthUrlRegex)
    await expect(page.locator('h1')).toContainText(
      'Status des services de la plateforme DSO',
    )
    await expect(page.getByTestId('box-info').locator(':scope > *')).toHaveCount(
      7,
    )
  })
})
