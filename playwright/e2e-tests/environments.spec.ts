import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'
import {
  adminUser,
  clientURL,
  cnolletUser,
  signInCloudPiNative,
  testUser,
} from '../config/console'

import { addEnvToProject, addProject, removeEnvFromProject } from './utils'

test.describe('Environments page', { tag: '@e2e' }, () => {
  test('should add environments to an existing project', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page })
    const envName = await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
      cpuInput: '2',
      gpuInput: '0',
    })
    await expect(page.getByRole('cell', { name: envName })).toBeVisible()
  })

  test('should not add environments to a project without enough hprod GPU', async ({
    page,
  }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({
      page,
      hprodResources: {
        cpu: 10,
        memory: 10,
        gpu: 1,
      },
    })
    const envName = await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
      memoryInput: '2',
      gpuInput: '2',
    })
    await expect(page.getByRole('cell', { name: envName })).not.toBeVisible()
    await expect(
      page
        .getByTestId('snackbar')
        .getByText(
          'Le projet ne dispose pas de suffisamment de ressources : GPU.',
        ),
    ).toBeVisible()
  })

  test('should not add incorrect environments', async ({ page }) => {
    const envName = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page })
    await page.getByTestId('addEnvironmentLink').click()

    // Incorrect input
    await page.getByTestId('environmentNameInput').click()
    await page.getByTestId('environmentNameInput').fill(`${envName}-yolo`)
    await expect(
      page.getByRole('alert').getByText('Le nom de l\'environnment ne doit pas'),
    ).toBeVisible()

    // Valid input
    await page.getByTestId('cancelEnvironmentBtn').click()
    await addEnvToProject({
      page,
      envName,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
    })

    // Second try with same name (invalid)
    await addEnvToProject({
      page,
      envName,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
    })
    await expect(
      page
        .getByTestId('snackbar')
        .getByText('Ce nom d\'environnement est déjà pris'),
    ).toBeVisible()
  })

  test('should alert cluster unavailability', async ({ page }) => {
    const envName = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page })
    await page.getByTestId('addEnvironmentLink').click()
    await page.getByTestId('environmentNameInput').fill(envName)
    await page
      .getByLabel('Choix de la zone cible')
      .selectOption({ label: 'Zone privée' })
    await page
      .getByLabel('Type d\'environnement')
      .selectOption({ label: 'dev' })
    await expect(page.getByTestId('noClusterOptionAlert')).toBeVisible()
    await expect(page.getByLabel('Choix du cluster cible')).not.toBeVisible()

    await page
      .getByLabel('Choix de la zone cible')
      .selectOption({ label: 'publique' })
    await expect(page.getByTestId('noClusterOptionAlert')).not.toBeVisible()
    await expect(page.getByLabel('Choix du cluster cible')).toBeVisible()
  })

  test('should display zone infos and cluster infos', async ({ page }) => {
    const envName = faker.string.alpha(10).toLowerCase()
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page })
    await page.getByTestId('addEnvironmentLink').click()
    await page.getByTestId('environmentNameInput').fill(envName)
    await page
      .getByLabel('Choix de la zone cible')
      .selectOption({ label: 'publique' })
    await expect(page.getByTestId('chosenZoneDescription')).toBeVisible()

    await page
      .getByLabel('Type d\'environnement')
      .selectOption({ label: 'dev' })
    await page
      .getByLabel('Choix du cluster cible')
      .selectOption({ label: 'public1' })
    await expect(page.getByTestId('clusterInfos')).toBeVisible()
  })

  test('should update environment resources', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page })
    const envName = await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
    })
    await expect(page.getByTestId(`environmentTr-${envName}`)).toContainText(
      '1GiB 1CPU 1GPU',
    )

    await page.getByTestId(`environmentTr-${envName}`).click()
    await expect(page.getByTestId('putEnvironmentBtn')).toBeVisible()
    await expect(page.locator('#zone-select option[selected]')).toHaveText(
      'publique',
    )
    await expect(page.locator('#stage-select option[selected]')).toHaveText(
      'dev',
    )
    await expect(page.locator('#cluster-select option[selected]')).toHaveText(
      'public1',
    )
    await expect(page.getByTestId('memoryInput')).toHaveValue('1')
    await expect(page.getByTestId('cpuInput')).toHaveValue('1')
    await expect(page.getByTestId('gpuInput')).toHaveValue('1')
    await page.getByTestId('memoryInput').fill('1.5')
    await page.getByTestId('cpuInput').fill('2')
    await page.getByTestId('gpuInput').fill('10')
    await page.getByTestId('putEnvironmentBtn').click()
    await expect(page.getByTestId(`environmentTr-${envName}`)).toContainText(
      '1.5GiB 2CPU 10GPU',
    )
  })

  test('should not update environment resources when cluster is too small', async ({
    page,
  }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page })
    const envName = await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
    })
    await expect(page.getByTestId(`environmentTr-${envName}`)).toContainText(
      '1GiB 1CPU 1GPU',
    )

    await page.getByTestId(`environmentTr-${envName}`).click()
    await expect(page.getByTestId('putEnvironmentBtn')).toBeVisible()
    await expect(page.locator('#zone-select option[selected]')).toHaveText(
      'publique',
    )
    await expect(page.locator('#stage-select option[selected]')).toHaveText(
      'dev',
    )
    await expect(page.locator('#cluster-select option[selected]')).toHaveText(
      'public1',
    )
    await expect(page.getByTestId('memoryInput')).toHaveValue('1')
    await expect(page.getByTestId('cpuInput')).toHaveValue('1')
    await expect(page.getByTestId('gpuInput')).toHaveValue('1')
    await page.getByTestId('memoryInput').fill('120')
    await page.getByTestId('cpuInput').fill('1')
    await page.getByTestId('gpuInput').fill('1')
    await page.getByTestId('putEnvironmentBtn').click()
    await expect(
      page
        .getByTestId('snackbar')
        .getByText(
          'Le cluster ne dispose pas de suffisamment de ressources : Mémoire.',
        ),
    ).toBeVisible()
  })

  test('should delete an environment', async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { name: projectName } = await addProject({ page })
    const envName = await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
    })

    await removeEnvFromProject(page, projectName, envName)
  })

  test('should not be able to delete an environment if not owner', async ({
    page,
  }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { name: projectName } = await addProject({
      page,
      members: [cnolletUser],
    })
    const envName = await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
    })
    await expect(page.getByRole('cell', { name: envName })).toBeVisible()

    // Sign off and login as another user (project member)
    await page.getByRole('link', { name: 'Se déconnecter' }).click()
    await signInCloudPiNative({ page, credentials: cnolletUser })
    // Select previously created project
    await page.getByTestId('menuMyProjects').click()
    await expect(page.getByTestId('createProjectLink')).toBeVisible()
    await page.getByRole('link', { name: projectName }).click()
    await expect(page.getByRole('cell', { name: envName })).toBeVisible()
    // Verify absence of delete button
    await page.getByTestId(`environmentTr-${envName}`).click()
    await expect(
      page.getByTestId('showDeleteEnvironmentBtn'),
    ).not.toBeVisible()
  })

  test('should not be able to delete an environment if project locked', async ({
    page,
  }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { name: projectName } = await addProject({ page })
    const envName = await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
    })
    await expect(page.getByRole('cell', { name: envName })).toBeVisible()

    // Sign off and login as admin to lock the project
    await page.getByRole('link', { name: 'Se déconnecter' }).click()
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationProjects').click()
    await page.getByTestId('projectsSearchInput').click()
    await page.getByTestId('projectsSearchInput').fill(projectName)
    await page.getByTestId('projectsSearchBtn').click()
    await page.getByRole('cell', { name: projectName }).first().click()
    await page.getByTestId('handleProjectLockingBtn').click()

    // Sign off and login back as user
    await page.getByRole('link', { name: 'Se déconnecter' }).click()
    await signInCloudPiNative({ page, credentials: testUser })
    // Verify absence of delete button
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    await page.getByTestId(`environmentTr-${envName}`).click()
    await expect(
      page.getByTestId('showDeleteEnvironmentBtn'),
    ).not.toBeVisible()
  })

  test('should show a warning if autosync is deactivated', async ({
    page,
  }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page })
    const envName = await addEnvToProject({
      page,
      zone: 'publique',
      customStageName: 'dev',
      customClusterName: 'public1',
    })
    await expect(page.getByRole('cell', { name: envName })).toBeVisible()

    // Verify warning message
    await page.getByTestId(`environmentTr-${envName}`).click()
    await expect(page.getByTestId('input-checkbox-autosyncCbx')).toBeVisible()
    await expect(page.getByTestId('input-checkbox-autosyncCbx')).toBeChecked()
    await expect(page.getByTestId('noAutosyncAlert')).not.toBeVisible()

    // Act - Uncheck auto-sync to trigger warning message
    await page.getByTestId('input-checkbox-autosyncCbx').uncheck({
      force: true,
    })
    await expect(page.getByTestId('noAutosyncAlert')).toBeVisible()
    await expect(page.getByTestId('noAutosyncAlert'))
      .toHaveText('La synchronisation automatique est désactivée. Les déploiements devront être synchronisés manuellement.')
  })
})
