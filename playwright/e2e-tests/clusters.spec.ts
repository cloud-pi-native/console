import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'

import {
  addProject,
  addEnvToProject,
  adminUser,
  clientURL,
  createCluster,
  deleteCluster,
  signInCloudPiNative,
} from './utils'

test.describe('Clusters page', () => {
  test('should create a public cluster', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    const clusterName = await createCluster({
      page,
      zone: 'publique',
      confidentiality: 'public',
      associateStage: 'first',
    })
    // Validate
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await expect(page.getByRole('row', { name: clusterName }).getByText('publique')).toBeVisible()
    await expect(page.getByRole('row', { name: clusterName }).getByText('Public')).toBeVisible()
  })

  test('should update a public cluster', { tag: '@e2e' }, async ({ page }) => {
    const clusterName2 = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    // Create
    const clusterName = await createCluster({
      page,
      confidentiality: 'public',
    })
    // Update
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await page.getByRole('cell', { name: clusterName }).click()
    await expect(page.getByTestId('labelInput')).toHaveValue(clusterName)
    await expect(page.getByTestId('labelInput')).toBeEnabled()
    await page.getByTestId('labelInput').fill(clusterName2)
    await expect(page.getByTestId('updateClusterBtn')).toBeVisible()
    await expect(page.locator('#projects-select')).not.toBeVisible()
    await expect(page.locator('#privacy-select option[selected]')).toHaveText('public')
    await page.getByTestId('memoryInput').fill('1')
    await page.getByTestId('cpuInput').fill('1')
    await page.getByTestId('gpuInput').fill('1')
    await page.getByTestId('updateClusterBtn').click()
    // Validate
    await page.getByTestId('projectsSearchInput').fill(clusterName2)
    await expect(page.getByRole('cell', { name: clusterName2 })).toBeVisible()
    await expect(page.getByRole('row', { name: clusterName2 })).toContainText('1GiB 1CPU 1GPU')
  })

  test('should create a dedicated cluster', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    // Create
    const clusterName = await createCluster({
      page,
      confidentiality: 'dedicated',
    })
    // Validate
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await expect(page.getByRole('row', { name: clusterName })).toContainText('Dédié')
  })

  test('should associate a project to a dedicated cluster', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    // Create a dedicated project
    const projectName = await addProject({ page })
    // Create the cluster
    await page.getByTestId('menuAdministrationBtn').click()
    const clusterName = await createCluster({
      page,
      confidentiality: 'dedicated',
    })
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
    await expect(page.getByRole('row', { name: clusterName })).toContainText('Dédié')
  })

  test('should create a cluster even if given informations is longer than 200 chars but shorter than 1001 chars', async ({
    page,
  }) => {
    const informations = faker.string.alpha(1000).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    const clusterName = await createCluster({
      page,
      confidentiality: 'dedicated',
      informations,
    })
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await page.getByRole('cell', { name: clusterName }).click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await expect(page.getByTestId('infosInput')).toHaveValue(informations)
  })

  test('should NOT create a cluster when given informations is longer than 1000 chars', async ({
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

  test('should delete a cluster', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    // Create
    const clusterName = await createCluster({
      page,
      confidentiality: 'dedicated',
    })
    // Delete
    await deleteCluster({
      page,
      clusterName,
    })
    // Validate
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(page.getByTestId('noClusterMsg')).toBeVisible()
    await expect(page.getByTestId('noClusterMsg')).toHaveText('Aucun cluster trouvé')
  })

  test('should NOT delete a cluster with associated environment', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    // Create a public cluster
    const clusterName = await createCluster({
      page,
      zone: 'publique',
      confidentiality: 'public',
      associateStage: 'all',
    })
    // Create a project and an environment using this cluster
    await addProject({ page })
    const envName = await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: clusterName,
      cpuInput: '2',
      gpuInput: '0',
    })
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

  test('should NOT update the cluster label if it has associated environment', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    // Create a public cluster
    const clusterName = await createCluster({
      page,
      zone: 'publique',
      confidentiality: 'public',
      associateStage: 'all',
    })
    // Create a project and an environment using this cluster
    await addProject({ page })
    await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: clusterName,
      cpuInput: '2',
      gpuInput: '0',
    })
    // Verify that cluster label is disabled
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationClusters').click()
    await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
    await page.getByTestId('projectsSearchInput').fill(clusterName)
    await expect(page.getByRole('cell', { name: clusterName })).toBeVisible()
    await page.getByRole('cell', { name: clusterName }).click()
    await expect(page.getByTestId('labelInput')).toHaveValue(clusterName)
    await expect(page.getByTestId('labelInput')).toBeDisabled()
  })
})
