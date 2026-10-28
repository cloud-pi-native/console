import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, tcolinUser, testUser } from '../config/console'
import { createProject } from '../helpers/project'

test.describe('Services externes', { tag: '@e2e' }, () => {
  test('should show the project services table empty state as user', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await createProject({ page })

    // Act
    await page.getByTestId('test-tab-services').click()

    // Assert
    await expect(page.locator('#servicesTable')).toContainText('Aucun service disponible')
  })

  test('should show the project services table empty state as admin', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { id: projectId, name: projectName } = await createProject({ page })
    await page.getByRole('link', { name: 'Se Déconnecter' }).click()
    await signInCloudPiNative({ page, credentials: tcolinUser })

    // Act
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationProjects').click()
    await page.getByTestId('projectsSearchInput').fill(projectName)
    await page.getByTestId('projectsSearchBtn').click()
    await expect(page.getByTestId(`projectTr-${projectId}`)).toBeVisible()
    await page.getByTestId(`projectTr-${projectId}`).click()
    await page.getByTestId('test-tab-services').click()

    // Assert
    await expect(page.locator('#servicesTable')).toContainText('Aucun service disponible')
  })
})
