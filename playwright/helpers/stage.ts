import type { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { expect } from '@playwright/test'
import { openStagesAdministration } from './navigation'

async function assertStageCreateForm(page: Page) {
  await expect(page.locator('h1')).toContainText(
    'Informations du type d\'environnement',
  )
  await expect(page.getByTestId('addStageBtn')).toBeVisible()
  await expect(page.getByTestId('addStageBtn')).toBeDisabled()
  await expect(page.getByTestId('updateStageBtn')).not.toBeVisible()
}

async function addFirstClusterAssociation(page: Page) {
  await page.locator('.fr-tag').first().click()
  await expect(page.locator('.fr-tag--dismiss')).toHaveCount(1)
}

async function addAllClusterAssociations(page: Page) {
  await expect(page.locator('.fr-tag')).not.toHaveCount(0)
  const numberOfAvalaibleClusters = (await page.locator('.fr-tag').all()).length
  for (let i = 0; i < numberOfAvalaibleClusters; i++)
    await page.locator('.fr-tag').first().click()

  await expect(page.locator('.fr-tag--dismiss')).toHaveCount(
    numberOfAvalaibleClusters,
  )
}

export async function createStage({
  page,
  associateToCluster,
}: {
  page: Page
  associateToCluster: 'first' | 'all' | 'none'
}): Promise<string> {
  const stageName = faker.string.alpha(10).toLowerCase()
  await openStagesAdministration(page)
  await expect(page.getByTestId('addStageLink')).toBeVisible()
  await page.getByTestId('addStageLink').click()
  await assertStageCreateForm(page)
  await page.getByTestId('nameInput').fill(stageName)
  await expect(page.getByTestId('addStageBtn')).toBeEnabled()
  await expect(page.locator('.fr-tag--dismiss')).toHaveCount(0)

  const assocActions: Record<'first' | 'all' | 'none', () => Promise<void>> = {
    first: () => addFirstClusterAssociation(page),
    all: () => addAllClusterAssociations(page),
    none: () => Promise.resolve(),
  }
  await assocActions[associateToCluster]()

  await page.getByTestId('addStageBtn').click()
  return stageName
}

export async function deleteStage(page: Page, stageName: string) {
  await openStagesAdministration(page)
  await page.getByTestId(`stageTile-${stageName}`).click()
  await expect(page.getByTestId('deleteStageZone')).toBeVisible()
  await expect(
    page.getByTestId('associatedEnvironmentsZone'),
  ).not.toBeVisible()
  await expect(
    page.getByTestId('associatedEnvironmentsTable'),
  ).not.toBeVisible()
  await page.getByTestId('showDeleteStageBtn').click()
  await page.getByTestId('deleteStageInput').fill('DELETE')
  await page.getByTestId('deleteStageBtn').click()
}
