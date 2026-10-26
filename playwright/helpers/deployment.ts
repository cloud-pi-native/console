import type { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { expect } from '@playwright/test'
import { deleteValidationInput } from './constants'

export async function createDeployment({
  page,
  deploymentName,
  envName,
  repoName,
}: {
  page: Page
  deploymentName?: string
  envName: string
  repoName: string
}): Promise<string> {
  deploymentName = deploymentName ?? faker.string.alpha(8).toLowerCase()
  await openDeploymentCreateForm(page)
  await fillDeploymentName(page, deploymentName)
  await selectDeploymentEnvironment(page, envName)
  await selectDeploymentRepository(page, repoName)
  await submitDeploymentForm(page)
  return deploymentName
}

export async function deleteDeployment({
  page,
  deploymentName,
}: {
  page: Page
  deploymentName: string
}) {
  await openDeploymentUpdateForm(page, deploymentName)
  await showDeploymentDeleteZone(page)
  await confirmDeploymentDeletion(page)
}

async function openDeploymentCreateForm(page: Page) {
  await page.getByRole('button', { name: 'Ajouter un nouveau déploiement' }).click()
  await expect(page.locator('h4', { hasText: 'Ajouter un déploiement au projet' })).toBeVisible()
}

async function fillDeploymentName(page: Page, deploymentName: string) {
  await page.getByLabel('Nom du déploiement').fill(deploymentName)
}

async function selectDeploymentEnvironment(page: Page, envName: string) {
  // The environment is a rich radio: clicking the input itself is intercepted
  // by its label, so we click the label instead.
  await page.locator('.fr-modal label', { hasText: envName }).first().click()
}

async function selectDeploymentRepository(page: Page, repoName: string) {
  await page.getByLabel(/Dépôt/).selectOption({ label: repoName })
}

async function submitDeploymentForm(page: Page) {
  await page.getByRole('button', { name: 'Enregistrer' }).click()
}

async function openDeploymentUpdateForm(page: Page, deploymentName: string) {
  await page.locator('.fr-card', { hasText: deploymentName }).first().click()
  await expect(page.locator('h4', { hasText: 'Modifier le déploiement' })).toBeVisible()
}

async function showDeploymentDeleteZone(page: Page) {
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
}

async function confirmDeploymentDeletion(page: Page) {
  await page.getByLabel(/Veuillez taper 'DELETE'/).fill(deleteValidationInput)
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
}
