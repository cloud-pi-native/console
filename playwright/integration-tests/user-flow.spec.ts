import { expect, test } from '@playwright/test'
import { testUser, clientURL, signInCloudPiNative } from '../config/console'

import {
  addProject,
  addRandomRepositoryToProject,
  deleteProject,
} from '../e2e-tests/utils'

const projectsToDelete: string[] = []

test.describe('Integration tests user flow', { tag: '@integ' }, () => {
  test.describe.configure({ mode: 'serial' })
  const projectName = 'socleprojecttest'
  const repositoryName = 'socle-project-test'
  projectsToDelete.push(projectName)

  test('Project creation and configuration', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page, projectName })
    // Enable Nexus Maven plugin
    await page.getByTestId('test-tab-services').click()
    await page.getByRole('button', { name: 'Nexus' }).click()
    await page.getByText('Activé', { exact: true }).nth(4).click()
    await page.getByTestId('saveBtn').click()
    await expect(page.getByText('Paramètres sauvegardés')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Reprovisionnement nécessaire' })).toBeVisible()
    // Check if project reprovisioning is successful
    await page.getByTestId('replayHooksBtn').click()
    await expect(page.getByRole('heading', { name: 'Opération en cours...' })).toBeVisible()
    await expect(page.getByText('Le projet a été reprovisionn')).toBeVisible()
    // Add repository to project
    await page.getByTestId('test-tab-resources').click()
    await addRandomRepositoryToProject({
      page,
      repositoryName,
      externalRepoUrlInput: 'https://github.com/cloud-pi-native/socle-project-test.git',
      infraRepo: true,
    })
    await page.getByRole('cell', { name: repositoryName }).click()
    await page.getByTestId('deployRevisionInput').fill('main')
    await page.getByTestId('deployPathInput').fill('helm/')
    await page.getByTestId('helmValuesFilesTextarea').fill('values-cpin-hp.yaml')
    await page.getByTestId('updateRepoBtn').click()
    await expect(page.getByRole('heading', { name: 'Opération en cours...' })).toBeVisible()
  })

  test('Check Vault kv', { tag: '@replayable' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    await page.getByTestId('test-tab-services').click()
    const page1Promise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Vault' }).click()
    const page1 = await page1Promise
    const page2Promise = page1.waitForEvent('popup')
    await page1.getByRole('button', { name: 'Sign in with OIDC Provider' }).click()
    await page2Promise
    await expect(page1.getByRole('link', { name: 'Vault home' })).toBeVisible()
    // Check that standard user has access to his project kv
    await expect(page1.getByText('No secrets yet')).toBeVisible()
    await expect(page1.getByRole('link', { name: 'Create secret' })).toBeVisible()
    await page1.getByLabel('breadcrumbs').getByRole('link', { name: 'Secrets' }).click()
    // Check that forge-dso kv is not accessible for standard user
    await expect(page1.getByRole('link', { name: 'forge-dso' })).not.toBeVisible()
  })

  test('Pipelines run', { tag: '@replayable' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    // Check if mirror pipeline is successful
    await page.getByTestId('test-tab-services').click()
    const page1Promise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Gitlab' }).click()
    const page1 = await page1Promise
    await page1.getByTestId('group-name').filter({ hasText: 'mirror' }).click()
    await expect(page1.getByTestId('status_success_borderless-icon')).toBeVisible()
    // Check if tests are successful
    await page1.getByRole('link', { name: projectName }).click()
    await page1.getByTestId('group-name').filter({ hasText: repositoryName }).click()
    await page1.getByTestId('ci-icon').click()
    await expect(
      page1.getByRole('link', { name: 'Status: Passed test-vault' }),
    ).toBeVisible()
    await expect(
      page1.getByRole('link', { name: 'Status: Passed test-nexus' }),
    ).toBeVisible()
    await expect(
      page1.getByRole('link', { name: 'Status: Passed test-harbor' }),
    ).toBeVisible()
    await expect(
      page1.getByRole('link', { name: 'Status: Passed test-sonar' }),
    ).toBeVisible()
  })

  test('Prepare ArgoCD deployment', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    // Create environment for project to trigger ArgoCD deployment
    await page.getByTestId('test-tab-resources').click()
    await page.getByTestId('addEnvironmentLink').click()
    await page.getByTestId('environmentNameInput').click()
    await page.getByTestId('environmentNameInput').fill('integ')
    await page.getByLabel('Zone *Choix de la zone cible').selectOption({ label: 'DSO' })
    await page.getByLabel('Type d\'environnement *Type d\'').selectOption({ label: 'dev' })
    await page.getByLabel('Cluster *Choix du cluster').selectOption({ label: 'sdid-hp' })
    await page.getByTestId('memoryInput').fill('2')
    await page.getByTestId('cpuInput').fill('1')
    await page.getByTestId('gpuInput').fill('0')
    await page.getByTestId('addEnvironmentBtn').click()
    await expect(page.getByRole('heading', { name: 'Opération en cours...' })).toBeVisible()
  })

  test('View Sonar scan report', { tag: '@replayable' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    // Check if sonar scan is available
    await page.getByTestId('test-tab-services').click()
    const page1Promise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'SonarQube' }).click()
    const page1 = await page1Promise
    await page1.getByRole('button', { name: 'OpenID Connect Log in with' }).click()
    await page1.getByPlaceholder('Search for projects...').fill(projectName)
    await page1.getByRole('link', { name: `${projectName}-${repositoryName}` }).click()
    await expect(
      page1.getByTestId('overview__quality-gate-panel').getByText('Passed', { exact: true }),
    ).toBeVisible()
  })

  test('Check Harbor repository', { tag: '@replayable' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    await page.getByTestId('test-tab-services').click()
    const page1Promise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Harbor' }).click()
    const page1 = await page1Promise
    await page1.getByRole('button', { name: 'LOGIN WITH keycloak' }).click()
    await expect(page1.getByRole('button', { name: 'Administration' })).not.toBeVisible()
    await expect(page1.getByText('Guest')).toBeVisible()
    await expect(page1.getByRole('heading', { name: 'Private' })).toBeVisible()
    await page1.getByRole('link', { name: `${projectName}/java-demo` }).click()
    await expect(page1.getByRole('button', { name: 'main' })).toBeVisible()
    await expect(page1.getByText('Policy')).not.toBeVisible()
    // Check trivy scan result, hopefully will stay at C
    await expect(page1.getByRole('button', { name: 'C', exact: true })).toBeVisible()
  })

  test('ArgoCD deployment', { tag: '@replayable' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    // Check if ArgoCD deployment is successful
    await page.getByTestId('test-tab-services').click()
    const page1Promise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'ArgoCD DSO' }).click()
    const page1 = await page1Promise
    await page1.getByRole('button', { name: 'Log in via Keycloak' }).click()
    await page1.locator('span').filter({ hasText: `${projectName}-integ-socle-` }).click()
    await expect(page1.getByText('Synced').nth(1)).toBeVisible()
    await expect(page1.getByText('Sync OK')).toBeVisible()
    await expect(page1.getByText('Healthy').nth(1)).toBeVisible()
    await page1.getByRole('button', { name: ' Details' }).click()
    const page2Promise = page1.waitForEvent('popup')
    await page1.getByRole('link', { name: `http://${repositoryName}.` }).click()
    const page2 = await page2Promise
    await expect(page2.locator('html')).toContainText('Application is running')
  })

  test('Cleanup user test data', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    // ArgoCD deployment will be deleted when stage is deleted
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    await page.getByRole('cell', { name: 'integ' }).click()
    await page.getByTestId('showDeleteEnvironmentBtn').click()
    await page.getByTestId('deleteEnvironmentInput').fill('DELETE')
    await page.getByTestId('deleteEnvironmentBtn').click()
    await page.getByRole('heading', { name: 'Opération en cours...' }).click()
    await expect(
      page.getByRole('cell', { name: 'Aucun environnement existant' }),
    ).toBeVisible()
    await page.getByTestId('test-tab-services').click()
    const page1Promise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'ArgoCD DSO' }).click()
    const page1 = await page1Promise
    await page1.getByRole('button', { name: 'Log in via Keycloak' }).click()
    await expect(
      page1.locator('span').filter({ hasText: `${projectName}-integ-socle-` }),
    ).not.toBeVisible()
    // Remove repository from project
    await page.getByTestId('test-tab-resources').click()
    await page.getByRole('cell', { name: repositoryName }).click()
    await page.getByTestId('showDeleteRepoBtn').click()
    await page.getByTestId('deleteRepoInput').fill('DELETE')
    await page.getByTestId('deleteRepoBtn').click()
    await page.getByRole('heading', { name: 'Opération en cours...' }).click()
    await expect(page.getByRole('cell', { name: 'Aucun dépôt existant' })).toBeVisible()
    for (const projectName of projectsToDelete) {
      await deleteProject(page, projectName)
    }
  })
})
