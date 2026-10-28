import { expect, test } from '@playwright/test'
import {
  clientURL,
  signInCloudPiNative,
  tcolinUser,
  testUser,
} from '../config/console'

import { setCheckbox, unsetCheckbox } from '../helpers/checkbox'
import {
  deleteValidationInput,
  fakeToken,
  invalidGitUrlErrorMessage,
  invalidInternalRepoErrorMessage,
} from '../helpers/constants'
import { createProject } from '../helpers/project'
import { createRepository, waitForRepoSync } from '../helpers/repository'

test.describe('Repositories', { tag: '@e2e' }, () => {
  // @TODO: Rework this Cypress-inherited test (use of following-sibling is a
  // good hint that something is very very wrong)
  test(
    'should handle repository form validation',
    { tag: ['@need-rework'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })
      const repo = {
        internalRepoName: 'repo00',
        externalRepoUrl: 'https://github.com/externalUser01/repo00.git',
        externalUserName: 'user',
        externalToken: 'videnden88EHEBdldd_T0k9n',
      }

      // Act
      await page.getByTestId('addRepoLink').click()
      await page.locator('dialog').waitFor({ state: 'visible' })
      await expect(page.locator('h2')).toContainText(
        'Ajouter un dépôt au projet',
      )
      await expect(page.getByTestId('addRepoBtn')).toBeDisabled()
      await setCheckbox(
        page.getByTestId('standaloneRepoSwitch').locator('input'),
      )
      // The double-fill is desired, because the first one often fails ¯\_(ツ)_/¯
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await unsetCheckbox(
        page.getByTestId('standaloneRepoSwitch').locator('input'),
      )
      await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await page.getByTestId('internalRepoNameInput').fill('$%_>')
      await expect(
        page
          .getByTestId('internalRepoNameInput')
          .locator('//following-sibling::*[1]'),
      ).toContainText(invalidInternalRepoErrorMessage)
      await expect(page.getByTestId('addRepoBtn')).toBeDisabled()
      // The double-fill is desired, because the first one often fails ¯\_(ツ)_/¯
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await expect(
        page
          .getByTestId('internalRepoNameInput')
          .locator('//following-sibling::*[1]'),
      ).not.toBeVisible()
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await page
        .getByTestId('externalRepoUrlInput')
        .fill(repo.externalRepoUrl.slice(0, -4))
      await expect(
        page
          .getByTestId('externalRepoUrlInput')
          .locator('//following-sibling::*[1]'),
      ).toContainText(invalidGitUrlErrorMessage)
      await expect(page.getByTestId('addRepoBtn')).toBeDisabled()
      await page
        .getByTestId('externalRepoUrlInput')
        .fill(repo.externalRepoUrl.slice(8))
      await expect(
        page
          .getByTestId('externalRepoUrlInput')
          .locator('//following-sibling::*[1]'),
      ).toContainText(invalidGitUrlErrorMessage)
      await expect(page.getByTestId('addRepoBtn')).toBeDisabled()
      await page
        .getByTestId('externalRepoUrlInput')
        .fill(repo.externalRepoUrl.replace('https', 'http'))
      await expect(
        page
          .getByTestId('externalRepoUrlInput')
          .locator('//following-sibling::*[1]'),
      ).toContainText(invalidGitUrlErrorMessage)
      await expect(page.getByTestId('addRepoBtn')).toBeDisabled()
      await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
      await expect(
        page
          .getByTestId('externalRepoUrlInput')
          .locator('//following-sibling::*[1]'),
      ).not.toBeVisible()
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await setCheckbox(page.getByTestId('input-checkbox-privateRepoCbx'))
      await expect(page.getByTestId('addRepoBtn')).toBeDisabled()
      await page
        .getByTestId('externalUserNameInput')
        .fill(repo.externalUserName)
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await page.getByTestId('externalTokenInput').fill(repo.externalToken)
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await page.getByTestId('externalUserNameInput').clear()
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await page.getByTestId('externalTokenInput').clear()
      await expect(page.getByTestId('addRepoBtn')).toBeDisabled()
      await unsetCheckbox(page.getByTestId('input-checkbox-privateRepoCbx'))
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await setCheckbox(page.getByTestId('input-checkbox-infraRepoCbx'))
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
    },
  )

  test(
    'should add a standalone public repo',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })

      // Act
      const repositoryName = await createRepository({
        page,
        repositoryName: 'repo00',
        standaloneRepo: true,
      })

      // Assert - a standalone repo offers no synchronisation
      await page.getByTestId(`repoTr-${repositoryName}`).click()
      await expect(page.locator('h2')).not.toContainText(
        'Synchroniser le dépôt',
      )
    },
  )

  test(
    'should add an external public repo',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })

      // Act
      await createRepository({
        page,
        repositoryName: 'repo01',
        externalRepoUrlInput: 'https://github.com/externalUser01/repo01.git',
      })
    },
  )

  test(
    'should add an external private repo',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })

      // Act
      await createRepository({
        page,
        repositoryName: 'repo02',
        externalRepoUrlInput: 'https://github.com/externalUser02/repo02.git',
        privateRepo: true,
        externalToken: 'hoqjC1vXtABzytBIWBXsdyzubmqMYkgA',
      })
    },
  )

  test(
    'should add an external public infra repo',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })

      // Act
      await createRepository({
        page,
        repositoryName: 'repo03',
        externalRepoUrlInput: 'https://github.com/externalUser03/repo03.git',
        infraRepo: true,
      })
    },
  )

  test(
    'should add an external private infra repo',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })

      // Act
      await createRepository({
        page,
        repositoryName: 'repo04',
        externalRepoUrlInput: 'https://github.com/externalUser04/repo04.git',
        privateRepo: true,
        externalUserName: 'externalUser+04',
        infraRepo: true,
      })
    },
  )

  test(
    'should update a repo',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })
      await createRepository({
        page,
        repositoryName: 'repo03',
        externalRepoUrlInput: 'https://github.com/externalUser03/repo03.git',
        infraRepo: true,
      })

      // Act - update repository
      await page.getByTestId(`repoTr-repo03`).click()
      await expect(page.getByTestId('internalRepoNameInput')).toBeDisabled()
      await page
        .getByTestId('externalRepoUrlInput')
        .fill('https://github.com/externalUser04/new-repo.git')
      await setCheckbox(page.getByTestId('input-checkbox-privateRepoCbx'))
      await page.getByTestId('externalUserNameInput').fill('newUser')
      await page.getByTestId('externalTokenInput').fill('newToken')
      await expect(
        page.getByTestId('input-checkbox-infraRepoCbx'),
      ).toBeEnabled()
      await page.getByTestId('updateRepoBtn').click()

      // Assert - changes persist after reload
      await page.getByTestId(`repoTr-repo03`).click()
      await expect(page.getByTestId('externalRepoUrlInput')).toHaveValue(
        'https://github.com/externalUser04/new-repo.git',
      )
      await expect(
        page.getByTestId('input-checkbox-privateRepoCbx'),
      ).toBeChecked()
      await expect(page.getByTestId('externalUserNameInput')).toHaveValue(
        'newUser',
      )
      await expect(page.getByTestId('externalTokenInput')).toHaveValue(
        fakeToken,
      )
    },
  )

  test(
    'should toggle all-branches synchronisation',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })
      await createRepository({
        page,
        repositoryName: 'repo03',
        externalRepoUrlInput: 'https://github.com/externalUser03/repo03.git',
        infraRepo: true,
      })

      // Act / Assert - toggling all-branches hides then restores the branch input
      await page.getByTestId(`repoTr-repo03`).click()
      await expect(page.getByTestId('branchNameInput')).toHaveValue('main')
      await expect(page.getByTestId('branchNameInput')).toBeEnabled()
      await expect(page.getByTestId('syncRepoBtn')).toBeEnabled()
      await page
        .getByTestId('toggleSyncAllBranches')
        .locator('input')
        .check({ force: true })
      await expect(page.getByTestId('branchNameInput')).not.toBeVisible()
      await expect(page.getByTestId('syncRepoBtn')).toBeEnabled()
      await page
        .getByTestId('toggleSyncAllBranches')
        .locator('input')
        .uncheck({ force: true })
      await expect(page.getByTestId('branchNameInput')).toHaveValue('main')
      await expect(page.getByTestId('branchNameInput')).toBeEnabled()
      await expect(page.getByTestId('syncRepoBtn')).toBeEnabled()
    },
  )

  test(
    'should synchronise a repo on a custom branch and persist it',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName } = await createProject({ page })
      await createRepository({
        page,
        repositoryName: 'repo03',
        externalRepoUrlInput: 'https://github.com/externalUser03/repo03.git',
        infraRepo: true,
      })
      const secondRepositoryName = await createRepository({
        page,
        repositoryName: 'repo04',
        externalRepoUrlInput: 'https://github.com/externalUser04/repo04.git',
      })

      // Act - sync on default branch, then on a custom branch
      await page.getByTestId(`repoTr-repo03`).click()
      const firstSyncRequest = waitForRepoSync({ page })
      await page.getByTestId('syncRepoBtn').click()
      await firstSyncRequest
      await expect(
        page.getByText(
          'Travail de synchronisation lancé pour le dépôt repo03Fermer le message',
        ),
      ).toBeVisible()

      await page.getByTestId('branchNameInput').clear()
      await expect(page.getByTestId('syncRepoBtn')).toBeDisabled()
      await page.getByTestId('branchNameInput').fill('develop')
      await expect(page.getByTestId('syncRepoBtn')).toBeEnabled()
      const secondSyncRequest = waitForRepoSync({ page })
      await page.getByTestId('syncRepoBtn').click()
      await secondSyncRequest
      await expect(
        page.getByText(
          'Travail de synchronisation lancé pour le dépôt repo03Fermer le message',
        ),
      ).toBeVisible()

      // Assert - custom branch persists across reload, other repos untouched
      await page
        .getByTestId('resource-modal')
        .getByRole('button', { name: 'Fermer' })
        .click()
      await page.getByTestId(`repoTr-repo03`).click()
      await expect(page.getByTestId('branchNameInput')).toHaveValue('develop')
      await page
        .getByTestId('resource-modal')
        .getByRole('button', { name: 'Fermer' })
        .click()
      await page.reload()
      await expect(page.locator('h1')).toContainText(projectName)
      await page.getByTestId(`repoTr-repo03`).click()
      await expect(page.getByTestId('branchNameInput')).toHaveValue('develop')
      await page
        .getByTestId('resource-modal')
        .getByRole('button', { name: 'Fermer' })
        .click()
      await page.getByTestId(`repoTr-${secondRepositoryName}`).click()
      await expect(page.getByTestId('branchNameInput')).toHaveValue('main')
    },
  )

  test(
    'should delete a repo',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })
      await createRepository({
        page,
        repositoryName: 'repo03',
        externalRepoUrlInput: 'https://github.com/externalUser03/repo03.git',
        infraRepo: true,
      })

      // Act
      await page.getByTestId(`repoTr-repo03`).click()
      await expect(page.getByTestId('repo-form')).toBeVisible()
      await expect(page.getByTestId('deleteRepoInput')).not.toBeVisible()
      await expect(page.getByTestId('deleteRepoZone')).toBeVisible()
      await page.getByTestId('showDeleteRepoBtn').click()
      await expect(page.getByTestId('deleteRepoBtn')).toBeDisabled()
      await page.getByTestId('deleteRepoInput').fill(deleteValidationInput)
      await page.getByTestId('deleteRepoBtn').click()

      // Assert - deletion persists after reload
      await page.reload()
      await expect(page.getByTestId(`repoTr-repo03`)).not.toBeVisible()
    },
  )

  test(
    'should not be able to delete a repository if not owner',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { id: projectId, name: projectName } = await createProject({
        page,
      })
      await createRepository({
        page,
        repositoryName: 'repo03',
        externalRepoUrlInput: 'https://github.com/externalUser03/repo03.git',
        infraRepo: true,
      })
      await page.getByRole('link', { name: 'Se déconnecter' }).click()
      await signInCloudPiNative({ page, credentials: tcolinUser })
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationProjects').click()
      await page.getByTestId('projectsSearchInput').fill(projectName)
      await page.getByTestId('projectsSearchBtn').click()
      await expect(page.getByTestId(`projectTr-${projectId}`)).toBeVisible()
      await page.getByTestId(`projectTr-${projectId}`).click()

      // Act
      await page.getByTestId(`repoTr-repo03`).click()

      // Assert - the delete zone is not offered
      await expect(page.getByTestId('repo-form')).toBeVisible()
      await expect(page.getByTestId('deleteRepoZone')).not.toBeVisible()
    },
  )

  test(
    'should not be able to delete a repository if project locked',
    { tag: ['@repos'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      // Only admin users can lock projects
      await signInCloudPiNative({ page, credentials: tcolinUser })
      const { id: projectId, name: projectName } = await createProject({
        page,
      })
      await createRepository({
        page,
        repositoryName: 'repo03',
        externalRepoUrlInput: 'https://github.com/externalUser03/repo03.git',
        infraRepo: true,
      })

      // Act - lock the project through the admin menu
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationProjects').click()
      await page.getByTestId('projectsSearchInput').fill(projectName)
      await page.getByTestId('projectsSearchBtn').click()
      await expect(page.getByTestId(`projectTr-${projectId}`)).toBeVisible()
      await page.getByTestId(`projectTr-${projectId}`).click()
      await page.getByTestId('handleProjectLockingBtn').click()

      // Assert - the delete button is not offered
      await page.getByTestId(`repoTr-repo03`).click()
      await expect(page.getByTestId('repo-form')).toBeVisible()
      await expect(page.getByTestId('showDeleteRepoBtn')).not.toBeVisible()
    },
  )
})
