import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, testUser } from 'config/console'
import { createDeployment } from 'helpers/deployment'
import { createEnvironment } from 'helpers/environment'
import { createProject, deleteProject } from 'helpers/project'
import { createRepository } from 'helpers/repository'

test.describe('Déploiement', { tag: '@e2e' }, () => {
  let projectName: string

  test.beforeEach(async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { name } = await createProject({ page })
    projectName = name
  })

  // Not working on CI (need to mock plugins....)
  test.skip('should not be able to create a deployment without an environment or a repository', async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter un nouveau déploiement' }).click()
    await expect(page.getByText('Pour créer un déploiement, vous devez d\'abord créer un environnement et un dépôt.')).toBeVisible()
  })

  // Not working on CI (need to mock plugins....)
  test.skip('should create a deployment', async ({ page }) => {
    const envName = await createEnvironment({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
      cpuInput: '2',
      gpuInput: '0',
    })
    const repoName = await createRepository({ page })

    const deploymentName = await createDeployment({ page, envName, repoName, customStageName: 'dev' })
    await expect(page.getByText(deploymentName)).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    if (!projectName) return
    await deleteProject({ page, projectName })
  })
})
