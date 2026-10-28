import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'

test.describe('Administration plugins', { tag: '@e2e' }, () => {
  test('Should display the plugins table empty state', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })

    // Act
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationPlugins').click()

    // Assert - the CI stack declares no plugin
    await expect(page.locator('#servicesTable')).toContainText('Aucun service disponible')
  })
})
