import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, testUser } from '../config/console'

test.describe('Page non trouvée', { tag: '@e2e' }, () => {
  test('should display a 404 page for an unknown route', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    // Act
    await page.goto(`${clientURL}/definitely-not-a-page`)

    // Assert
    await expect(page.getByText('Page non trouvée')).toBeVisible()
    await expect(page.getByText('Erreur 404')).toBeVisible()
  })
})
