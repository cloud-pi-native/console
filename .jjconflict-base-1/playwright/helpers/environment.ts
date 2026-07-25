import type { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { expect } from '@playwright/test'
import { deleteValidationInput } from './constants'
import { openMyProjects } from './navigation'

type EnvironmentZone = 'publique' | 'Zone privée'

async function openEnvironmentCreateForm(page: Page) {
  await page.getByTestId('addEnvironmentLink').click()
}

async function fillEnvironmentName(page: Page, envName: string) {
  await page.getByTestId('environmentNameInput').fill(envName)
}

async function selectEnvironmentZone(page: Page, zone: EnvironmentZone) {
  await page.getByLabel('Choix de la zone cible').selectOption({ label: zone })
}

async function selectEnvironmentStage(page: Page, stageName: string) {
  await page
    .getByLabel('Type d\'environnement')
    .selectOption({ label: stageName })
}

async function selectEnvironmentCluster(page: Page, clusterName: string) {
  await expect(page.getByLabel('Choix du cluster cible')).toBeVisible()
  await page
    .getByLabel('Choix du cluster cible')
    .selectOption({ label: clusterName })
}

async function fillEnvironmentResources(
  page: Page,
  { memoryInput, cpuInput, gpuInput }: { memoryInput: string, cpuInput: string, gpuInput: string },
) {
  await page.getByTestId('memoryInput').fill(memoryInput)
  await page.getByTestId('cpuInput').fill(cpuInput)
  await page.getByTestId('gpuInput').fill(gpuInput)
}

async function submitEnvironmentCreation(page: Page) {
  await page.getByTestId('addEnvironmentBtn').click()
}

export async function createEnvironment({
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
  zone: EnvironmentZone
  customStageName: string
  customClusterName: string
  memoryInput?: string
  cpuInput?: string
  gpuInput?: string
  envsToDelete?: string[]
}): Promise<string> {
  envName = envName ?? faker.string.alpha(10).toLowerCase()
  envsToDelete?.push(envName)
  await openEnvironmentCreateForm(page)
  await fillEnvironmentName(page, envName)
  await selectEnvironmentZone(page, zone)
  await selectEnvironmentStage(page, customStageName)
  await selectEnvironmentCluster(page, customClusterName)
  await fillEnvironmentResources(page, { memoryInput, cpuInput, gpuInput })
  await submitEnvironmentCreation(page)
  return envName
}

export async function deleteEnvironment({ page, projectName, envName }: { page: Page, projectName: string, envName: string }) {
  await openMyProjects({ page })
  await page.getByRole('link', { name: projectName }).click()
  await page.getByTestId(`environmentTr-${envName}`).click()
  await page.getByTestId('showDeleteEnvironmentBtn').click()
  await expect(page.getByTestId('deleteEnvironmentZone')).toBeVisible()
  await page.getByTestId('deleteEnvironmentInput').fill(deleteValidationInput)
  await page.getByTestId('deleteEnvironmentBtn').click()
  await expect(page.getByTestId(`environmentTr-${envName}`)).not.toBeVisible()
}
