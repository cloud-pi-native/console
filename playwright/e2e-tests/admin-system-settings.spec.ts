import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'

test.describe('Réglages système', { tag: '@e2e' }, () => {
  test('Should display system settings with maintenance mode off', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })

    // Act - read-only visit, toggling maintenance would break the whole suite
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationSystemSettings').click()

    // Assert
    await expect(page.getByRole('heading', { name: 'Réglages de la console Cloud π Native' })).toBeVisible()
    await expect(page.getByTestId('toggle-maintenance')).toBeVisible()
    await expect(page.getByTestId('toggle-maintenance')).toContainText('Activer le mode maintenance')
  })
})
