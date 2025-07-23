import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { clientURL, cnolletUser, signInCloudPiNative, testUser } from './utils'

// Assuming we are on the Home page, create a random project with given name, or a generated one
async function addProject({
  page,
  projectName,
}: {
  page: Page
  projectName?: string
}) {
  projectName = projectName ?? faker.string.alpha(10).toLowerCase()
  await page.getByTestId('menuMyProjects').click()
  await page.getByTestId('createProjectLink').click()
  await page.getByTestId('nameInput').click()
  await page.getByTestId('nameInput').fill(projectName)
  await page.getByTestId('createProjectBtn').click()
  await expect(page.locator('h1')).toContainText(projectName)
  return projectName
}

// Assuming we are on a given Project page, add a random repository with given name, or a generated one
async function addRandomRepositoryToProject({
  page,
  repositoryName,
}: {
  page: Page
  repositoryName?: string
}) {
  repositoryName = repositoryName ?? faker.string.alpha(10).toLowerCase()
  await page.getByTestId('addRepoLink').click()
  await page.getByTestId('internalRepoNameInput').fill(repositoryName)
  await page
    .getByTestId('externalRepoUrlInput')
    .fill(`${faker.internet.url({ appendSlash: true })}myrepository.git`)
  await page.getByTestId('addRepoBtn').click()
  await expect(page.getByTestId(`repoTr-${repositoryName}`)).toContainText(
    repositoryName,
  )
  return repositoryName
}

// Assuming we are on a given Project page, and we have a Repository and a Branch name,
// start branch synchronisation with this branch
async function synchronizeBranchOnRepository({
  page,
  repositoryName,
  branchName,
}: {
  page: Page
  repositoryName: string
  branchName?: string
}) {
  branchName = branchName ?? faker.string.alpha(10).toLowerCase()
  await page.getByRole('cell', { name: repositoryName }).click()
  await page.getByTestId('branchNameInput').fill(branchName)
  await page.getByTestId('syncRepoBtn').click()
  await page
    .getByTestId('resource-modal')
    .getByRole('button', { name: 'Fermer' })
    .click()
  await expect(page.getByText('Travail de synchronisation lancé')).toBeVisible()
  return branchName
}

test.describe('Projects page', () => {
  test('should display only projects that user is member of', async ({
    page,
  }) => {
    // Create a project as one user
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const projectName = await addProject({ page })

    // Sign off and login as another user
    await page.getByRole('link', { name: 'Se déconnecter' }).click()
    await signInCloudPiNative({ page, credentials: cnolletUser })

    // Previously created project should not appear for this user
    await page.getByTestId('menuMyProjects').click()
    await expect(page.getByRole('link', { name: projectName })).not.toBeVisible()
  })

  test('should not keep the same default branch name for all repositories of a projects', async ({
    page,
  }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page })
    // Adding a project directly puts us on the newly created project page,
    // so no need to add navigation steps to go there
    const firstRepositoryName = await addRandomRepositoryToProject({ page })
    const branchName = await synchronizeBranchOnRepository({
      page,
      repositoryName: firstRepositoryName,
    })
    const secondRepositoryName = await addRandomRepositoryToProject({ page })
    await page.getByRole('cell', { name: secondRepositoryName }).click()
    await expect(page.getByTestId('branchNameInput')).not.toHaveValue(
      branchName,
    )
  })
})
