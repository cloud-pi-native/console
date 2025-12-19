import { expect, test } from '@playwright/test'
import { adminUser, secondTestUser, testUser, clientURL, signInCloudPiNative } from '../config/console'

import {
  addProject,
  addRandomRepositoryToProject,
  deleteProject,
} from '../e2e-tests/utils'

const projectsToDelete: string[] = []
const projectName = 'socleprojecttest'
const repositoryName = 'socle-project-test'
const destinationCluster = process.env.CONSOLE_DESTINATION_CLUSTER || 'cpin-app-hp'
const helmValuesFiles = process.env.CONSOLE_VALUES_FILE || 'values-cpin-hp.yaml'
projectsToDelete.push(projectName)

test.describe('Integration tests user flow: project creation', { tag: '@integ' }, () => {
  test.describe.configure({ mode: 'serial' })

  test('Preliminary checks', { tag: '@replayable' }, async ({ page }) => {
    await page.goto(clientURL)
    // Check all services are healthy
    await page.getByTestId('menuServicesHealth').click()
    await expect(page.getByTestId('ArgoCD-info').getByText('OK')).toBeVisible()
    await expect(page.getByTestId('Gitlab-info').getByText('OK')).toBeVisible()
    await expect(page.getByTestId('Harbor-info').getByText('OK')).toBeVisible()
    await expect(page.getByTestId('Keycloak-info').getByText('OK')).toBeVisible()
    await expect(page.getByTestId('Nexus-info').getByText('OK')).toBeVisible()
    await expect(page.getByTestId('SonarQube-info').getByText('OK')).toBeVisible()
    await expect(page.getByTestId('Vault-info').getByText('OK')).toBeVisible()
    await expect(page.getByText('Tous les services')).toBeVisible()
    // Check maintenance mode is disabled
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationSystemSettings').click()
    await expect(page.getByText('Le mode Maintenance est')).not.toBeVisible()
    await expect(page.getByText('Désactiver le mode maintenance')).not.toBeVisible()
    await expect(page.getByText('Activer le mode maintenance')).toBeVisible()
  })

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
    await page.getByTestId('helmValuesFilesTextarea').fill(helmValuesFiles)
    await page.getByTestId('updateRepoBtn').click()
    await expect(page.getByRole('heading', { name: 'Opération en cours...' })).toBeVisible()
  })
})

test.describe('Integration tests user flow: first checks', { tag: '@integ' }, () => {
  test.describe.configure({ mode: 'serial' })

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

  test('Project permissions', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    // Add user to project
    await page.getByTestId('test-tab-team').click()
    await page.getByTestId('addUserSuggestionInput').locator('input').fill(secondTestUser.email)
    await page.getByTestId('addUserBtn').click()
    await expect(page.getByRole('heading', { name: 'Reprovisionnement nécessaire' })).toBeVisible()
    // Create read-only role
    await page.getByTestId('test-tab-roles').click()
    await page.getByTestId('addRoleBtn').click()
    await page.getByTestId('roleNameInput').fill('readOnly')
    await page.getByText('Afficher les secrets Permet d').click()
    await page.getByText('Voir les environnements').click()
    await page.getByText('Voir les dépôts Permet de').click()
    await page.getByTestId('saveBtn').click()
    await expect(page.getByText('Rôle mis à jour')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Reprovisionnement nécessaire' })).toBeVisible()
    // Add user to read-only role
    await page.getByTestId('test-members').click()
    await page.getByLabel('Rôles', { exact: true }).getByText(secondTestUser.email).click()
    await expect(page.getByText('Rôle mis à jour')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Reprovisionnement nécessaire' })).toBeVisible()
    // Replay project hooks
    await page.getByTestId('replayHooksBtn').click()
    await expect(page.getByRole('heading', { name: 'Opération en cours...' })).toBeVisible()
    await expect(page.getByText('Le projet a été reprovisionn')).toBeVisible()
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
})

test.describe('Integration tests user flow: after pipelines checks', { tag: '@integ' }, () => {
  test.describe.configure({ mode: 'serial' })

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
    await page.getByLabel('Cluster *Choix du cluster').selectOption({ label: destinationCluster })
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
})

test.describe('Integration tests user flow: deployment and metrics', { tag: '@integ' }, () => {
  test.describe.configure({ mode: 'serial' })

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
    await page1.getByText('app.kubernetes.io/managed-by=dso-console, dso/environment=integ, dso/').click()
    await expect(page1.getByText('Synced').nth(1)).toBeVisible()
    await expect(page1.getByText('Sync OK')).toBeVisible()
    await expect(page1.getByText('Healthy').nth(1)).toBeVisible()
    await page1.getByRole('button', { name: ' Details' }).click()
    const page2Promise = page1.waitForEvent('popup')
    await page1.getByRole('link', { name: `http://${repositoryName}.` }).click()
    const page2 = await page2Promise
    await expect(page2.locator('html')).toContainText('Application is running')
  })

  test('Check Grafana', { tag: '@replayable' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    await page.getByTestId('test-tab-services').click()
    const page1Promise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'Grafana' }).click()
    const page1 = await page1Promise
    await page1.getByRole('link', { name: 'Sign in with grafana-projects' }).click()
    await expect(page1.getByRole('link', { name: 'Grafana', exact: true })).toBeVisible()
    await page1.getByTestId('data-testid Toggle menu').click()
    await page1.getByRole('button', { name: 'Expand section Dashboards' }).click()
    await page1.getByRole('link', { name: 'Dashboards', exact: true }).click()
    await page1.getByRole('link', { name: 'dso-grafana' }).click()
    // Check if we can see some metrics
    await page1.getByRole('link', { name: 'Kubernetes / Views /' }).click()
    await expect(page1.getByText('0.100')).toBeVisible() // Cpu request
    await expect(page1.getByText('0.500')).toBeVisible() // Cpu limit
    await expect(page1.getByText('256')).toBeVisible() // Memory request
    await expect(page1.getByText('512')).toBeVisible() // Memory limit
    // Check if we can see some logs
    await page1.getByTestId('data-testid dso-grafana breadcrumb').click()
    await page1.getByRole('link', { name: 'Loki Kubernetes Logs' }).click()
    await expect(page1.getByTestId('data-testid Panel status error').first()).not.toBeVisible()
    await expect(page1.locator('.rc-drawer-mask')).not.toBeVisible()
    await page1.getByTestId('data-testid TimePicker Open Button').click()
    await page1.getByText('Last 1 hour').click()
    await page1.locator('.css-13x53bc-Icon-topVerticalAlign').first().click()
    await expect(page1.getByRole('cell', { name: 'app_kubernetes_io_name' }).nth(1)).toBeVisible()
    await expect(page1.getByText('demo-java-helm').nth(1)).toBeVisible()
  })
})

test.describe('Integration tests user flow: Cleanup', { tag: '@integ' }, () => {
  test.describe.configure({ mode: 'serial' })

  test('Remove permissions and user', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    // Remove role membership
    await page.getByTestId('test-tab-roles').click()
    await page.getByRole('button', { name: 'readOnly' }).click()
    await page.getByTestId('test-members').click()
    await page.getByLabel('Rôles', { exact: true }).getByText(secondTestUser.email).click()
    await expect(page.getByText('Rôle mis à jour')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Reprovisionnement nécessaire' })).toBeVisible()
    // Remove role
    await page.getByTestId('test-general').click()
    await page.getByTestId('deleteBtn').click()
    await page.getByText('Rôle supprimé').click()
    // Remove project membership
    await page.getByTestId('test-tab-team').click()
    await page.getByTitle(`Retirer ${secondTestUser.email} du`).click()
  })

  test('Remove stage', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
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
    // ArgoCD deployment will be deleted when stage is deleted
    await page.getByTestId('test-tab-services').click()
    const page1Promise = page.waitForEvent('popup')
    await page.getByRole('link', { name: 'ArgoCD DSO' }).click()
    const page1 = await page1Promise
    await page1.getByRole('button', { name: 'Log in via Keycloak' }).click()
    await expect(
      page1.locator('span').filter({ hasText: `${projectName}-integ-socle-` }),
    ).not.toBeVisible()
  })

  test('Remove repository from project', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
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
