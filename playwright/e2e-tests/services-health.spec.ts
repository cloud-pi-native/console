import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, testUser } from '../config/console'

test.describe('Services health', { tag: '@e2e' }, () => {
  test('Should display the platform services health', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    // Act
    await page.getByTestId('menuServicesHealth').click()

    // Assert - the badge wording is environment-dependent, only check it is filled
    await expect(page.getByRole('heading', { name: 'Status des services de la plateforme DSO' })).toBeVisible()
    await expect(page.getByTestId('services-health-badge')).toBeVisible()
    await expect(page.getByTestId('services-health-badge')).toContainText(/\S/)
    await expect(page.getByTestId('Keycloak-info')).toBeVisible()
  })
})
