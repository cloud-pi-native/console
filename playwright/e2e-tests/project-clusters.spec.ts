import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, testUser } from '../config/console'
import { createProject } from '../helpers/project'

test.describe('Project clusters', { tag: '@e2e' }, () => {
  test('Should list available clusters for a standard user project', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await createProject({ page })

    // Act
    await page.getByTestId('test-tab-clusters').click()

    // Assert
    await expect(page.getByRole('heading', { name: 'Listes des clusters disponibles' })).toBeVisible()
    await expect(page.locator('.cluster-panel').first()).toBeVisible()
    await expect(page.locator('.cluster-panel', { hasText: 'public1' }).first()).toBeVisible()
  })
})
