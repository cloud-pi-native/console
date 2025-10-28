import { faker } from '@faker-js/faker'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { Credentials } from 'config/console.js'

interface Resources {
  cpu: number
  gpu: number
  memory: number
}

// Assuming we are on the Home page, create a random project with given name, or a generated one
export async function addProject({
  page,
  projectName,
  members,
  hprodResources,
  prodResources,
}: {
  page: Page
  projectName?: string
  members?: Credentials[]
  hprodResources?: Resources
  prodResources?: Resources
}) {
  projectName = projectName ?? faker.string.alpha(10).toLowerCase()
  await page.getByTestId('menuMyProjects').click()
  await page.getByTestId('createProjectLink').click()
  await page.getByTestId('nameInput').click()
  await page.getByTestId('nameInput').fill(projectName)
  if (hprodResources) {
    await page.getByTestId('cpuHprodInput').fill(hprodResources.cpu.toString())
    await page.getByTestId('gpuHprodInput').fill(hprodResources.gpu.toString())
    await page.getByTestId('memoryHprodInput').fill(hprodResources.memory.toString())
  }
  if (prodResources) {
    await page.getByTestId('cpuProdInput').fill(prodResources.cpu.toString())
    await page.getByTestId('gpuProdInput').fill(prodResources.gpu.toString())
    await page.getByTestId('memoryProdInput').fill(prodResources.memory.toString())
  }
  if (!hprodResources && !prodResources) {
    // Limitless
    await page.getByTestId('limitlessProjectSwitch').locator('label').click()
  }
  await page.getByTestId('createProjectBtn').click()
  await expect(page.locator('h1')).toContainText(projectName)
  if (members) {
    await page.getByTestId('test-tab-team').click()
    for (const member of members) {
      await page.getByRole('combobox', { name: 'Ajouter un utilisateur' }).fill(member.email)
      await page.getByTestId('addUserBtn').click()
      await expect(page.getByRole('cell', { name: member.email })).toBeVisible()
    }
    await page.getByTestId('test-tab-resources').click()
  }
  return projectName
}

export async function deleteProject(
  page: Page,
  projectName: string,
) {
  await page.getByTestId('menuAdministrationBtn').click()
  await page.getByTestId('menuAdministrationProjects').click()
  await page.getByRole('row', { name: new RegExp(projectName) }).click()
  await page.getByRole('button', { name: 'Supprimer le projet' }).click()
  await page.getByTestId('archiveProjectInput').fill('DELETE')
  await page.getByTestId('confirmDeletionBtn').click()
  await expect(page.getByRole('row', { name: new RegExp(projectName) })).not.toBeVisible()
}

// functions use in admin-stages.spec.ts
export async function createStage({
  page,
  associateToCluster,
}: {
  page: Page
  associateToCluster: 'first' | 'all' | 'none'
}): Promise<string> {
  const stageName = faker.string.alpha(10).toLowerCase()
  await page.getByTestId('menuAdministrationBtn').click()
  await page.getByTestId('menuAdministrationStages').click()
  await expect(page.getByTestId('addStageLink')).toBeVisible()
  await page.getByTestId('addStageLink').click()
  await expect(page.locator('h1')).toContainText('Informations du type d\'environnement')
  await expect(page.getByTestId('addStageBtn')).toBeVisible()
  await expect(page.getByTestId('addStageBtn')).toBeDisabled()
  await expect(page.getByTestId('updateStageBtn')).not.toBeVisible()
  await page.getByTestId('nameInput').fill(stageName)
  await expect(page.getByTestId('addStageBtn')).toBeEnabled()
  // Aucun cluster associé à la création
  await expect(page.locator('.fr-tag--dismiss')).toHaveCount(0)
  // Association de cluster
  if (associateToCluster === 'first') {
    await page.locator('.fr-tag').first().click()
    await expect(page.locator('.fr-tag--dismiss')).toHaveCount(1)
  }
  if (associateToCluster === 'all') {
    await expect(page.locator('.fr-tag')).not.toHaveCount(0)
    const numberOfAvalaibleClusters = (await page.locator('.fr-tag').all()).length
    for (let i = 0; i < numberOfAvalaibleClusters; i++) {
      await page.locator('.fr-tag').first().click()
    }
    await expect(page.locator('.fr-tag--dismiss')).toHaveCount(numberOfAvalaibleClusters)
  }
  await page.getByTestId('addStageBtn').click()
  return stageName
}

export async function deleteStage(
  page: Page,
  stageName: string,
) {
  await page.getByTestId('menuAdministrationStages').click()
  await page.getByTestId(`stageTile-${stageName}`).click()
  await expect(page.getByTestId('deleteStageZone')).toBeVisible()
  await expect(page.getByTestId('associatedEnvironmentsZone')).not.toBeVisible()
  await expect(page.getByTestId('associatedEnvironmentsTable')).not.toBeVisible()
  await page.getByTestId('showDeleteStageBtn').click()
  await page.getByTestId('deleteStageInput').fill('DELETE')
  await page.getByTestId('deleteStageBtn').click()
}

// functions use in clusters.spec.ts
export async function createCluster({
  page,
  zone,
  confidentiality,
  associateStage,
  associateStageNames,
  informations,
}: {
  page: Page
  zone?: 'publique' | 'Zone privée' // optionnel car défaut sur Zone privée
  confidentiality: 'public' | 'dedicated'
  associateStage?: 'first' | 'all' | 'none'
  associateStageNames?: string[]
  informations?: string
}): Promise<string> {
  const clusterName = faker.string.alpha(10).toLowerCase()
  await page.getByTestId('menuAdministrationClusters').click()
  await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
  await page.getByTestId('addClusterLink').click()
  await page.getByTestId('labelInput').fill(clusterName)
  if (zone) {
    await page.getByLabel('Zone associée').selectOption({ label: zone })
  }
  await page
    .getByLabel('Confidentialité du cluster')
    .selectOption({ label: confidentiality })
  if (confidentiality === 'public') {
    await expect(page.locator('#projects-select')).not.toBeVisible()
  } else {
    await expect(page.locator('#projects-select')).toBeVisible()
  }
  if (associateStageNames) {
    for (const customStageName in associateStageNames) {
      await page.getByTestId('choice-selector-search-stages-select').fill(customStageName)
      await page.locator('#stages-select .fr-tag').first().click()
    }
  }
  if (associateStage === 'first') {
    await page.locator('#stages-select .fr-tag').first().click()
  }
  if (associateStage === 'all') {
    const numberOfStages = (await page.locator('#stages-select .fr-tag').all()).length
    for (let i = 0; i < numberOfStages; i++) {
      await page.locator('#stages-select .fr-tag').first().click()
    }
  }
  if (informations) {
    await page.getByTestId('infosInput').fill(informations)
  }
  await page.getByTestId('addClusterBtn').click()
  await page.getByTestId('projectsSearchInput').fill(clusterName)
  return clusterName
}

export async function deleteCluster({
  page,
  clusterName,
}: {
  page: Page
  clusterName: string
}) {
  await page.getByTestId('menuAdministrationClusters').click()
  await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
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
}

// functions use in integration.spec.ts
export async function createZone({
  page,
}: {
  page: Page
}): Promise<string> {
  const zoneName = faker.string.alpha(10).toLowerCase()
  await page.getByTestId('menuAdministrationZones').click()
  await page.getByTestId('createZoneLink').click()
  await page.getByTestId('slugInput').fill(zoneName)
  await page.getByTestId('labelInput').fill(zoneName)
  await page.getByTestId('argocdUrlInput').fill(faker.internet.url())
  await page.getByTestId('descriptionInput').fill(faker.string.alpha(100).toLowerCase())
  await page.getByTestId('addZoneBtn').click()
  return zoneName
}

// functions use in environment.spec.ts
export async function addEnvToProject({
  page,
  envName,
  zone,
  customStageName,
  customClusterName,
  memoryInput = '1',
  cpuInput = '1',
  gpuInput = '1',
  envsToDelete,
}: {
  page: Page
  envName?: string
  zone: 'publique' | 'Zone privée'
  customStageName: string
  customClusterName: string
  memoryInput?: string
  cpuInput?: string
  gpuInput?: string
  envsToDelete?: string[]
}): Promise<string> {
  envName = envName ?? faker.string.alpha(10).toLowerCase()
  envsToDelete?.push(envName)
  await page.getByTestId('addEnvironmentLink').click()
  await page.getByTestId('environmentNameInput').fill(envName)
  await page.getByLabel('Choix de la zone cible').selectOption({ label: zone })
  await page.getByLabel('Type d\'environnement').selectOption({ label: customStageName })
  await expect(page.getByLabel('Choix du cluster cible')).toBeVisible()
  await page.getByLabel('Choix du cluster cible').selectOption({ label: customClusterName })
  await page.getByTestId('memoryInput').fill(memoryInput)
  await page.getByTestId('cpuInput').fill(cpuInput)
  await page.getByTestId('gpuInput').fill(gpuInput)
  await page.getByTestId('addEnvironmentBtn').click()
  return envName
}

export async function removeEnvFromProject(
  page: Page,
  projectName: string,
  envName: string,
) {
  await page.getByTestId('menuMyProjects').click()
  await page.getByRole('link', { name: projectName }).click()
  await page.getByTestId(`environmentTr-${envName}`).click()
  await page.getByTestId('showDeleteEnvironmentBtn').click()
  await expect(page.getByTestId('deleteEnvironmentZone')).toBeVisible()
  await page.getByTestId('deleteEnvironmentInput').fill('DELETE')
  await page.getByTestId('deleteEnvironmentBtn').click()
  await expect(page.getByTestId(`environmentTr-${envName}`)).not.toBeVisible()
}
