import type { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { expect } from '@playwright/test'
import { deleteValidationInput } from './constants'
import { openClustersAdministration } from './navigation'

type ClusterZone = string
type ClusterConfidentiality = 'public' | 'dedicated'
type ClusterAssociateStage = 'first' | 'all' | 'none'

async function selectClusterZone(page: Page, zone: ClusterZone) {
  await page.getByLabel('Zone associée').selectOption({ label: zone })
}

async function selectClusterConfidentiality(page: Page, confidentiality: ClusterConfidentiality) {
  await page
    .getByLabel('Confidentialité du cluster')
    .selectOption({ label: confidentiality })

  const projectsSelect = page.locator('#projects-select')
  switch (confidentiality) {
    case 'public':
      await expect(projectsSelect).not.toBeVisible()
      break
    case 'dedicated':
      await expect(projectsSelect).toBeVisible()
      break
  }
}

async function addStageToClusterAssociationByName(page: Page, stageName: string) {
  await page
    .getByTestId('choice-selector-search-stages-select')
    .fill(stageName)
  await page.locator('#stages-select .fr-tag').first().click()
}

async function addStagesToClusterAssociationByNames(page: Page, stageNames: string[]) {
  for (const stageName of stageNames)
    await addStageToClusterAssociationByName(page, stageName)
}

async function addFirstStageToClusterAssociation(page: Page) {
  await page.locator('#stages-select .fr-tag').first().click()
}

async function addAllStagesToClusterAssociation(page: Page) {
  const numberOfStages = (await page.locator('#stages-select .fr-tag').all()).length
  for (let i = 0; i < numberOfStages; i++)
    await page.locator('#stages-select .fr-tag').first().click()
}

async function fillClusterInformations(page: Page, informations: string) {
  await page.getByTestId('infosInput').fill(informations)
}

async function searchCluster(page: Page, clusterName: string) {
  await page.getByTestId('projectsSearchInput').fill(clusterName)
}

async function openCluster(page: Page, clusterName: string) {
  await page.getByTestId(`clusterLink-${clusterName}`).click()
}

async function confirmClusterDeletion(page: Page) {
  await expect(page.getByTestId('deleteClusterZone')).toBeVisible()
  await page.getByTestId('showDeleteClusterBtn').click()
  await expect(page.getByTestId('deleteClusterBtn')).toBeVisible()
  await expect(page.getByTestId('deleteClusterBtn')).toBeDisabled()
  await page.getByTestId('deleteClusterInput').fill(deleteValidationInput)
  await expect(page.getByTestId('deleteClusterBtn')).toBeEnabled()
  await page.getByTestId('deleteClusterBtn').click()
}

export async function createCluster({
  page,
  zone,
  confidentiality,
  associateStage,
  associateStageNames,
  informations,
}: {
  page: Page
  zone?: ClusterZone
  confidentiality: ClusterConfidentiality
  associateStage?: ClusterAssociateStage
  associateStageNames?: string[]
  informations?: string
}): Promise<string> {
  const clusterName = faker.string.alpha(10).toLowerCase()
  await openClustersAdministration({ page })
  await page.getByTestId('addClusterLink').click()
  await page.getByTestId('labelInput').fill(clusterName)
  if (zone)
    await selectClusterZone(page, zone)
  await selectClusterConfidentiality(page, confidentiality)
  if (associateStageNames?.length)
    await addStagesToClusterAssociationByNames(page, associateStageNames)

  switch (associateStage ?? 'none') {
    case 'first':
      await addFirstStageToClusterAssociation(page)
      break
    case 'all':
      await addAllStagesToClusterAssociation(page)
      break
    case 'none':
      break
  }

  if (informations)
    await fillClusterInformations(page, informations)
  await page.getByTestId('addClusterBtn').click()
  await expect(page.getByTestId('cpin-loader')).toHaveCount(0)
  await searchCluster(page, clusterName)
  return clusterName
}

export async function deleteCluster({ page, clusterName }: { page: Page, clusterName: string }) {
  await openClustersAdministration({ page })
  await searchCluster(page, clusterName)
  await expect(page.getByTestId(`clusterLink-${clusterName}`)).toBeVisible()
  await openCluster(page, clusterName)
  await confirmClusterDeletion(page)
}
