import { expect, test } from '@playwright/test'
import {
  adminUser,
  clientURL,
  cnolletUser,
  signInCloudPiNative,
  testUser,
} from '../config/console'
import { deleteValidationInput } from '../helpers/constants'
import { createProject } from '../helpers/project'
import { createRepository, synchronizeBranchOnRepository } from '../helpers/repository'

test.describe('Projects page', () => {
  test(
    'Should display only projects that user is member of',
    { tag: '@e2e' },
    async ({ page }) => {
      // Create a project as one user
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName } = await createProject({ page })

      // Sign off and login as another user
      await page.getByRole('link', { name: 'Se déconnecter' }).click()
      await signInCloudPiNative({ page, credentials: cnolletUser })

      // Previously created project should not appear for this user
      await page.getByTestId('menuMyProjects').click()
      await expect(page.getByTestId('createProjectLink')).toBeVisible()
      await expect(
        page.getByRole('link', { name: projectName }),
      ).not.toBeVisible()
    },
  )

  test(
    'Should not keep the same default branch name for all repositories of a projects',
    { tag: '@e2e' },
    async ({ page }) => {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })
      // Adding a project directly puts us on the newly created project page,
      // so no need to add navigation steps to go there
      const firstRepositoryName = await createRepository({ page })
      const branchName = await synchronizeBranchOnRepository({
        page,
        repositoryName: firstRepositoryName,
      })
      const secondRepositoryName = await createRepository({ page })
      await page.getByTestId(`repoTr-${secondRepositoryName}`).click()
      await expect(page.getByTestId('resource-modal')).toBeVisible()
      await expect(page.getByTestId('branchNameInput')).not.toHaveValue(
        branchName,
      )
    },
  )

  // @TODO Archiving and Deleting a project is, basically, the same thing. It seems that
  // initially we wanted to delete projects but we moved on to archiving, while not updating
  // the frontend x)
  test(
    'Should archive a project, when logged in as an admin',
    { tag: ['@e2e', '@need-rework'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: adminUser })
      const { id: projectId, name: projectName } = await createProject({ page })

      // Act
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationProjects').click()
      await page.getByLabel('Filtre rapide').selectOption('Tous')
      await page.getByTestId('projectsSearchInput').fill(projectName)
      await page.getByTestId('projectsSearchBtn').click()
      await expect(page.getByTestId(`projectTr-${projectId}`)).toBeVisible()
      await page.getByTestId(`projectTr-${projectId}`).click()
      await expect(page.locator('h1')).toContainText(projectName)
      await expect(page.getByTestId('archiveProjectInput')).not.toBeVisible()
      await page.getByTestId('showArchiveProjectBtn').click()
      await expect(page.getByTestId('confirmDeletionBtn')).toBeDisabled()
      await page.getByTestId('archiveProjectInput').fill(deleteValidationInput)
      await page.getByTestId('confirmDeletionBtn').click()

      // Assert
      await page.getByTestId('menuAdministrationProjects').click()
      await page.getByLabel('Filtre rapide').selectOption('Archivés')
      await page.getByTestId('projectsSearchInput').fill(projectName)
      await page.getByTestId('projectsSearchBtn').click()
      // Projects are renamed (suffixed with a timestamp and `_archived`) so @TODO: Do Better…
      await expect(page.getByRole('table', { name: 'Liste des projets' })).toContainText(projectName)
    },
  )
})
