import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, testUser } from '../config/console'

test.describe('Page non trouvée', { tag: '@e2e' }, () => {
  test('should expose only the active backend documentation', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    await expect(page.getByTestId('swaggerUrl')).toHaveAttribute('href', '/swagger-ui-server-nestjs')
    await expect(page.getByRole('link', { name: /^swagger/ })).toHaveCount(1)
  })

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
