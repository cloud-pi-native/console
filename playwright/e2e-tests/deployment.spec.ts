import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, testUser } from '../config/console'
import { createDeployment, deleteDeployment } from '../helpers/deployment'
import { createEnvironment } from '../helpers/environment'
import { createProject, deleteProject } from '../helpers/project'
import { createRepository } from '../helpers/repository'

test.describe('Déploiement', { tag: '@e2e' }, () => {
  let projectName: string

  test.beforeEach(async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { name } = await createProject({ page })
    projectName = name
  })

  test('should not be able to create a deployment without an environment or a repository', async ({ page }) => {
    // Act
    await page.getByRole('button', { name: 'Ajouter un nouveau déploiement' }).click()

    // Assert
    await expect(page.getByTestId('snackbar')).toContainText('Pour créer un déploiement, vous devez d\'abord créer un environnement et un dépôt.')
  })

  test('should create a deployment', async ({ page }) => {
    // Arrange
    const envName = await createEnvironment({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
      gpuInput: '0',
    })
    const repoName = await createRepository({ page })
    // The create button acts on not-yet-loaded environment and repository
    // arrays, so both tables must be populated before clicking it.
    await expect(page.locator('[data-testid^="environmentTr-"]').first()).toBeVisible()
    await expect(page.locator('[data-testid^="repoTr-"]').first()).toBeVisible()

    // Act
    const deploymentName = await createDeployment({ page, envName, repoName })

    // Assert
    await expect(page.getByTestId('snackbar')).toContainText('Déploiement enregistré')
    await expect(page.locator('.fr-card', { hasText: deploymentName })).toBeVisible()
  })

  test('should delete a deployment', async ({ page }) => {
    // Arrange
    const envName = await createEnvironment({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
      gpuInput: '0',
    })
    const repoName = await createRepository({ page })
    await expect(page.locator('[data-testid^="environmentTr-"]').first()).toBeVisible()
    await expect(page.locator('[data-testid^="repoTr-"]').first()).toBeVisible()
    const deploymentName = await createDeployment({ page, envName, repoName })
    await expect(page.locator('.fr-card', { hasText: deploymentName })).toBeVisible()

    // Act
    await deleteDeployment({ page, deploymentName })

    // Assert
    await expect(page.getByTestId('snackbar')).toContainText('Suppression du déploiement enregistrée')
    await expect(page.locator('.fr-card', { hasText: deploymentName })).toHaveCount(0)
  })

  test.afterEach(async ({ page }) => {
    if (!projectName) return
    await deleteProject({ page, projectName })
  })
})
