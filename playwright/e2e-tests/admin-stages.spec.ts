import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'

import {
  addProject,
  adminUser,
  clientURL,
  createStage,
  deleteStage,
  signInCloudPiNative,
  testUser,
} from './utils'

test.describe('Stages administration page', { tag: '@e2e' }, () => {
  test('should display default stages list', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationStages').click()
    for (const stageName of ['dev', 'integration', 'prod', 'staging']) {
      await expect(page.getByTestId(`stageTile-${stageName}`)).toBeVisible()
    }
  })

  test('should create a custom stage', async ({ page }) => {
    // Create stage
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    const stageName = await createStage({ page, associateToCluster: 'all' })
    // Validation de la création
    await expect(page.getByTestId('addStageLink')).toBeVisible()
    await expect(page.getByTestId(`stageTile-${stageName}`)).toBeVisible()

    // Check stage availability in environment form
    await page.getByRole('link', { name: 'Se déconnecter' }).click()
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page })
    const envName = faker.string.alpha(10).toLowerCase()
    await page.getByTestId('addEnvironmentLink').click()
    await page.getByTestId('environmentNameInput').fill(envName)
    await page.getByLabel('Choix de la zone cible').selectOption({ label: 'publique' })
    await page.getByLabel('Type d\'environnement').selectOption({ label: stageName })
    await expect(page.getByLabel('Choix du cluster cible')).toBeVisible()
    await page.getByLabel('Choix du cluster cible').selectOption({ label: 'public1' })
    await page.getByTestId('memoryInput').fill('1')
    await page.getByTestId('cpuInput').fill('2')
    await page.getByTestId('gpuInput').fill('0')
    await page.getByTestId('addEnvironmentBtn').click()
    await expect(page.getByRole('cell', { name: envName })).toBeVisible()
  })

  test('should update a custom stage', async ({ page }) => {
    // Create stage (1 cluster)
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    const stageName = await createStage({ page, associateToCluster: 'first' })
    await expect(page.getByTestId(`stageTile-${stageName}`)).toBeVisible()
    // Update stage (adding 1 extra cluster)
    await page.getByTestId(`stageTile-${stageName}`).click()
    await expect(page.locator('h1')).toContainText(`Informations du type d\'environnement ${stageName}`)
    await expect(page.getByTestId('addStageBtn')).not.toBeVisible()
    await expect(page.getByTestId('updateStageBtn')).toBeVisible()
    await expect(page.getByTestId('updateStageBtn')).toBeEnabled()
    await expect(page.getByTestId('nameInput')).toBeDisabled()
    await expect(page.getByTestId('nameInput')).toHaveValue(stageName)
    await expect(page.locator('.fr-tag--dismiss')).toHaveCount(1)
    await page.locator('.fr-tag').first().click()
    await expect(page.locator('.fr-tag--dismiss')).toHaveCount(2)
    await page.getByTestId('updateStageBtn').click()
    // Check stage (2 clusters)
    await page.getByTestId(`stageTile-${stageName}`).click()
    await expect(page.locator('h1')).toContainText(`Informations du type d\'environnement ${stageName}`)
    await expect(page.locator('.fr-tag--dismiss')).toHaveCount(2)
  })

  test('should not be able to create a stage with an existing name', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationStages').click()
    // Try to create a stage "dev"
    await expect(page.getByTestId('addStageLink')).toBeVisible()
    await page.getByTestId('addStageLink').click()
    await page.getByTestId('nameInput').fill('dev')
    await page.getByTestId('addStageBtn').click()
    await expect(page.getByTestId('snackbar').getByText('Un type d\'environnement portant ce nom existe déjà')).toBeVisible()
  })

  test('should delete a custom stage', async ({ page }) => {
    // Create stage
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    const stageName = await createStage({ page, associateToCluster: 'first' })
    await expect(page.getByTestId('addStageLink')).toBeVisible()
    await expect(page.getByTestId(`stageTile-${stageName}`)).toBeVisible()

    // Delete custom stage
    await deleteStage(page, stageName)
    await expect(page.getByTestId(`stageTile-${stageName}`)).not.toBeVisible()
  })

  test('should not delete a used custom stage', async ({ page }) => {
    // Create stage
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    const stageName = await createStage({ page, associateToCluster: 'all' })
    await expect(page.getByTestId('addStageLink')).toBeVisible()
    await expect(page.getByTestId(`stageTile-${stageName}`)).toBeVisible()

    // Use custom stage in an environment
    await addProject({ page })
    const envName = faker.string.alpha(10).toLowerCase()
    await page.getByTestId('addEnvironmentLink').click()
    await page.getByTestId('environmentNameInput').fill(envName)
    await page.getByLabel('Choix de la zone cible').selectOption({ label: 'publique' })
    await page.getByLabel('Type d\'environnement').selectOption({ label: stageName })
    await expect(page.getByLabel('Choix du cluster cible')).toBeVisible()
    await page.getByLabel('Choix du cluster cible').selectOption({ label: 'public1' })
    await page.getByTestId('memoryInput').fill('1')
    await page.getByTestId('cpuInput').fill('2')
    await page.getByTestId('gpuInput').fill('0')
    await page.getByTestId('addEnvironmentBtn').click()
    await expect(page.getByRole('cell', { name: envName })).toBeVisible()

    // Check custom stage in admin view
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationStages').click()
    await page.getByTestId(`stageTile-${stageName}`).click()
    await expect(page.getByTestId('deleteStageZone')).not.toBeVisible()
    await expect(page.getByTestId('associatedEnvironmentsZone')).toBeVisible()
    await expect(page.getByTestId('associatedEnvironmentsZone')).toContainText('Le type d\'environnement ne peut être supprimé')
    await expect(page.getByTestId('associatedEnvironmentsTable')).toBeVisible()
    await expect(page.getByRole('cell', { name: envName })).toBeVisible()
  })
})
