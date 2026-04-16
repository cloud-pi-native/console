import type { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { expect } from '@playwright/test'
import { repoSyncTimeoutMs } from './constants'
import { waitForSnackbar } from './snackbar'

const repoSyncApiRegex = /\/api\/.*\/repositories\/.*\/sync$/

export function waitForRepoSync({
  page,
  timeoutMs = repoSyncTimeoutMs,
}: {
  page: Page
  timeoutMs?: number
}) {
  return page.waitForResponse((response) => {
    const request = response.request()
    const success = response.status() >= 200 && response.status() < 300
    return request.method() === 'POST' && success && repoSyncApiRegex.test(response.url())
  }, { timeout: timeoutMs })
}

async function openAddRepositoryForm(page: Page) {
  await page.getByTestId('addRepoLink').click()
}

async function fillRepositoryUrl(page: Page, externalRepoUrlInput?: string) {
  const url = externalRepoUrlInput ?? `${faker.internet.url({ appendSlash: true })}myrepository.git`
  await page.getByTestId('externalRepoUrlInput').fill(url)
}

async function closeResourceModal(page: Page) {
  await page
    .getByTestId('resource-modal')
    .getByRole('button', { name: 'Fermer' })
    .click()
}

export async function addRandomRepositoryToProject({
  page,
  repositoryName,
  externalRepoUrlInput,
  infraRepo,
}: {
  page: Page
  repositoryName?: string
  externalRepoUrlInput?: string
  infraRepo?: boolean
}) {
  repositoryName = repositoryName ?? faker.string.alpha(10).toLowerCase()
  await openAddRepositoryForm(page)
  await page.getByTestId('internalRepoNameInput').fill(repositoryName)
  await fillRepositoryUrl(page, externalRepoUrlInput)
  if (infraRepo)
    await page.getByText('Dépôt contenant du code d\'').click()
  await page.getByTestId('addRepoBtn').click()
  await expect(page.getByTestId(`repoTr-${repositoryName}`)).toContainText(
    repositoryName,
  )
  return repositoryName
}

export async function synchronizeBranchOnRepository({
  page,
  repositoryName,
  branchName,
}: {
  page: Page
  repositoryName: string
  branchName?: string
}) {
  branchName = branchName ?? faker.string.alpha(10).toLowerCase()
  await page.getByTestId(`repoTr-${repositoryName}`).click()
  await expect(page.getByTestId('resource-modal')).toBeVisible()
  await page.getByTestId('branchNameInput').fill(branchName)
  const syncRequest = waitForRepoSync({ page, timeoutMs: repoSyncTimeoutMs })
  await page.getByTestId('syncRepoBtn').click()
  await syncRequest
  await closeResourceModal(page)
  await waitForSnackbar({ page, text: 'Travail de synchronisation lancé' })
  return branchName
}
