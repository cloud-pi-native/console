import type { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'

export async function createDeployment({
  page,
  deploymentName,
  envName,
  repoName,
  customStageName,
}: {
  page: Page
  deploymentName?: string
  envName: string
  repoName: string
  customStageName: string
}): Promise<string> {
  deploymentName = deploymentName ?? faker.string.alpha(10).toLocaleLowerCase()
  await openDeploymentCreateForm(page)
  await fillDeploymentName(page, deploymentName)
  await selectDeploymentEnvironment(page, envName, customStageName)
  await selectDeploymentRepository(page, repoName)
  await submitDeploymentForm(page)
  return deploymentName
}

async function openDeploymentCreateForm(page: Page) {
  await page.getByRole('button', { name: 'Ajouter un nouveau déploiement' }).click()
}

async function fillDeploymentName(page: Page, deploymentName: string) {
  await page.getByRole('textbox', { name: 'Nom du déploiement * Ne doit' }).fill(deploymentName)
}

async function selectDeploymentEnvironment(page: Page, envName: string, customStageName: string) {
  await page.getByText(`${envName} ${customStageName}`).click()
}

async function selectDeploymentRepository(page: Page, repoName: string) {
  await page.getByLabel('Dépôt *').selectOption({ label: repoName })
}

async function submitDeploymentForm(page: Page) {
  await page.getByRole('button', { name: 'Enregistrer' }).click()
}
