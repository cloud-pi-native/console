import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'

import { addProject, adminUser, clientURL, signInCloudPiNative } from './utils'

test.describe('Clusters page', () => {
  test('should create a public cluster', async ({ page }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByLabel('Zone associée').selectOption({ label: 'publique' })
    await page.getByLabel('Confidentialité du cluster').selectOption({ label: 'public' })
    await page.locator('#stages-select .fr-tag').first().click()
    await expect(page.locator('#projects-select')).not.toBeVisible()
    await page.getByTestId('addClusterBtn').click()
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    // Validate
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await expect(page.getByTestId(`clusterTr-${clusterName}`).getByText('publique')).toBeVisible()
    await expect(page.getByTestId(`clusterTr-${clusterName}`).getByText('Public')).toBeVisible()
  })

  test('should update a public cluster', async ({ page }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    // Create
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByLabel('Confidentialité du cluster').selectOption({ label: 'public' })
    await page.getByTestId('addClusterBtn').click()
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    // Update
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await page.getByRole('cell', { name: clusterName }).click()
    await expect(page.getByTestId('labelInput')).toHaveValue(clusterName)
    await expect(page.getByTestId('labelInput')).toBeDisabled()
    await expect(page.getByTestId('updateClusterBtn')).toBeVisible()
    await expect(page.locator('#projects-select')).not.toBeVisible()
    await expect(page.locator('#privacy-select option[selected]')).toHaveText('public')
    await page.getByTestId('memoryInput').fill('1')
    await page.getByTestId('cpuInput').fill('1')
    await page.getByTestId('gpuInput').fill('1')
    await page.getByTestId('updateClusterBtn').click()
    // Validate
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await expect(page.getByTestId(`clusterTr-${clusterName}`)).toContainText('1GiB 1CPU 1GPU')
  })

  test('should create a dedicated cluster', async ({ page }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    // Create
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByLabel('Confidentialité du cluster').selectOption({ label: 'dedicated' })
    await expect(page.locator('#projects-select')).toBeVisible()
    await page.getByTestId('addClusterBtn').click()
    // Validate
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await expect(page.getByTestId(`clusterTr-${clusterName}`)).toContainText('Dédié')
  })

  test('should associate a project to a dedicated cluster', async ({ page }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    const projectName = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    // Create a dedicated project
    await addProject({ page, projectName })
    // Create the cluster
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByLabel('Confidentialité du cluster').selectOption({ label: 'dedicated' })
    await page.getByTestId('addClusterBtn').click()
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    // Update
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await page.getByRole('cell', { name: clusterName }).click()
    await expect(page.getByTestId('updateClusterBtn')).toBeVisible()
    await expect(page.locator('#projects-select')).toBeVisible()
    await expect(page.locator('#privacy-select option[selected]')).toHaveText('dedicated')
    // Associating specifically created project
    await page.locator('#projects-select').click()
    await expect(page.locator('#projects-select .fr-tag--dismiss')).toHaveCount(0)
    await page.getByTestId('choice-selector-search-projects-select').fill(projectName)
    await page.locator('#projects-select .fr-tag').click()
    await expect(page.locator('#projects-select .fr-tag--dismiss')).toHaveCount(1)
    await page.getByTestId('updateClusterBtn').click()
    // Validate
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await expect(page.getByTestId(`clusterTr-${clusterName}`)).toContainText('Dédié')
  })

  test('should create a cluster even if given informations is longer than 200 chars but shorter than 1001 chars', async ({
    page,
  }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    const informations = faker.string.alpha(1000).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByTestId('infosInput').fill(informations)
    await page.getByTestId('addClusterBtn').click()
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(
      page.getByRole('cell', {
        name: clusterName,
      }),
    ).toBeVisible()
    await page.getByRole('cell', { name: clusterName }).click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await expect(page.getByTestId('infosInput')).toHaveValue(informations)
  })

  test('should NOT create a cluster even if given informations is longer than 1000 chars', async ({
    page,
  }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    const informations = faker.string.alpha(1001).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByTestId('infosInput').fill(informations)
    await expect(page.getByTestId('addClusterBtn')).toBeDisabled()
  })

  test('should delete a cluster', async ({ page }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    // Create
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByTestId('addClusterBtn').click()
    // Delete
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await page.getByRole('cell', { name: clusterName }).click()
    await expect(page.getByTestId('deleteClusterZone')).toBeVisible()
    await page.getByTestId('showDeleteClusterBtn').click()
    await expect(page.getByTestId('deleteClusterBtn')).toBeVisible()
    await expect(page.getByTestId('deleteClusterBtn')).toBeDisabled()
    await page.getByTestId('deleteClusterInput').fill('DELETE')
    await expect(page.getByTestId('deleteClusterBtn')).toBeEnabled()
    await page.getByTestId('deleteClusterBtn').click()
    // Validate
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(page.locator('table tbody tr')).toHaveCount(1)
    await expect(page.locator('table tbody tr')).toHaveText('Aucun cluster trouvé')
  })

  test('should NOT delete a cluster with associated environment', async ({ page }) => {
    const clusterName = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    // Create a public cluster
    await page.getByTestId('addClusterLink').click()
    await page.getByTestId('labelInput').fill(clusterName)
    await page.getByLabel('Zone associée').selectOption({ label: 'publique' })
    await page.getByLabel('Confidentialité du cluster').selectOption({ label: 'public' })
    const numberOfStages = (await page.locator('#stages-select .fr-tag').all()).length
    for (let i = 0; i < numberOfStages; i++) {
      await page.locator('#stages-select .fr-tag').first().click()
    }
    await page.getByTestId('addClusterBtn').click()
    // Create a project and an environment using this cluster
    const projectName = faker.string.alpha(10).toLowerCase()
    const envName = faker.string.alpha(10).toLowerCase()
    await addProject({ page, projectName })
    await page.getByTestId('addEnvironmentLink').click()
    await page.getByTestId('environmentNameInput').fill(envName)
    await page.getByLabel('Choix de la zone cible').selectOption({ label: 'publique' })
    await page.getByLabel('Type d\'environnement').selectOption({ label: 'dev' })
    await expect(page.getByLabel('Choix du cluster cible')).toBeVisible()
    await page.getByLabel('Choix du cluster cible').selectOption({ label: clusterName })
    await page.getByTestId('memoryInput').fill('1')
    await page.getByTestId('cpuInput').fill('2')
    await page.getByTestId('gpuInput').fill('0')
    await page.getByTestId('addEnvironmentBtn').click()
    // Try to delete the cluster
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await page.getByRole('cell', { name: clusterName }).click()
    await expect(page.getByTestId('deleteClusterZone')).not.toBeVisible()
    await expect(page.getByText('Le cluster ne peut être supprimé')).toBeVisible()
    await expect(page.getByTestId('associatedEnvironmentsTable')).toBeVisible()
    await expect(page.getByRole('cell', { name: envName })).toBeVisible()
  })
})
