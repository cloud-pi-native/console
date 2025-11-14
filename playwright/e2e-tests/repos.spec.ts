import { expect, test } from '@playwright/test'
import {
  clientURL,
  signInCloudPiNative,
  tcolinUser,
  testUser,
} from 'config/console'

import {
  addProject,
  deleteValidationInput,
  fakeToken,
  invalidGitUrlErrorMessage,
  invalidInternalRepoErrorMessage,
} from './utils'

test.describe('Repositories', () => {
  // @TODO: Rework this Cypress-inherited test (use of following-sibling is a
  // good hint that something is very very wrong)
  test(
    'Should handle repository form validation',
    { tag: ['@e2e', '@need-rework'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName, slug: projectSlug } = await addProject({
        page,
      })
      const repo = {
        internalRepoName: 'repo00',
        externalRepoUrl: 'https://github.com/externalUser01/repo00.git',
        externalUserName: 'user',
        externalToken: 'videnden88EHEBdldd_T0k9n',
      }

      // Act
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await expect(page.locator('h1')).toContainText(projectName)

      // Assert
      await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)

      await page.getByTestId('addRepoLink').click()
      await expect(page.locator('h2')).toContainText(
        'Ajouter un dépôt au projet',
      )
      await expect(page.getByTestId('addRepoBtn')).toBeDisabled()
      await page.getByTestId('standaloneRepoSwitch').locator('input').check({
        force: true,
      })
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await page
        .getByTestId('standaloneRepoSwitch')
        .locator('input')
        .uncheck({ force: true })
      await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await page.getByTestId('internalRepoNameInput').fill('$%_>')
      await expect(
        page
          .getByTestId('internalRepoNameInput')
          .locator('//following-sibling::*[1]'),
      ).toContainText(invalidInternalRepoErrorMessage)
      await expect(page.getByTestId('addRepoBtn')).toBeDisabled()
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
        .fill(repo.externalRepoUrl.replace(/s/i, ''))
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
      await page.getByTestId('input-checkbox-privateRepoCbx').check({
        force: true,
      })
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
      await page.getByTestId('input-checkbox-privateRepoCbx').uncheck({
        force: true,
      })
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
      await page.getByTestId('input-checkbox-infraRepoCbx').check({
        force: true,
      })
      await expect(page.getByTestId('addRepoBtn')).toBeEnabled()
    },
  )

  test(
    'Should add a standalone public repo',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName, slug: projectSlug } = await addProject({
        page,
      })
      const repo = {
        internalRepoName: 'repo00',
        isInfra: false,
      }

      // Act
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await expect(page.locator('h1')).toContainText(projectName)

      // Assert
      await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
      await page.getByTestId('addRepoLink').click()
      await expect(page.locator('h2')).toContainText(
        'Ajouter un dépôt au projet',
      )
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await page
        .getByTestId('standaloneRepoSwitch')
        .locator('input')
        .check({ force: true })
      await page.getByTestId('addRepoBtn').click()
      await page.getByTestId(`repoTr-${repo.internalRepoName}`).click()
      await expect(page.locator('h2')).not.toContainText(
        'Synchroniser le dépôt',
      )
    },
  )

  test(
    'Should add an external public repo',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName, slug: projectSlug } = await addProject({
        page,
      })
      const repo = {
        externalRepoUrl: 'https://github.com/externalUser01/repo01.git',
        externalToken: 'private-token',
        externalUserName: 'this-is+tobi',
        internalRepoName: 'repo01',
        isInfra: false,
        isPrivate: false,
      }

      // Act
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await expect(page.locator('h1')).toContainText(projectName)

      // Assert
      await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
      await page.getByTestId('addRepoLink').click()
      await expect(page.locator('h2')).toContainText(
        'Ajouter un dépôt au projet',
      )
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
      await page.getByTestId('addRepoBtn').click()
      await expect(
        page.getByTestId(`repoTr-${repo.internalRepoName}`),
      ).toBeVisible()
    },
  )

  test(
    'Should add an external private repo',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName, slug: projectSlug } = await addProject({
        page,
      })
      const repo = {
        externalRepoUrl: 'https://github.com/externalUser02/repo02.git',
        externalToken: 'hoqjC1vXtABzytBIWBXsdyzubmqMYkgA',
        externalUserName: '',
        internalRepoName: 'repo02',
        isInfra: false,
        isPrivate: true,
      }

      // Act
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await expect(page.locator('h1')).toContainText(projectName)

      // Assert
      await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
      await page.getByTestId('addRepoLink').click()
      await expect(page.locator('h2')).toContainText(
        'Ajouter un dépôt au projet',
      )
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
      await page
        .getByTestId('input-checkbox-privateRepoCbx')
        .check({ force: true })
      await page.getByTestId('externalTokenInput').fill(repo.externalToken)
      await page.getByTestId('addRepoBtn').click()
      await expect(
        page.getByTestId(`repoTr-${repo.internalRepoName}`),
      ).toBeVisible()
    },
  )

  test(
    'Should add an external public infra repo',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName, slug: projectSlug } = await addProject({
        page,
      })
      const repo = {
        externalRepoUrl: 'https://github.com/externalUser03/repo03.git',
        externalToken: 'private-token',
        externalUserName: 'this-is+tobi',
        internalRepoName: 'repo03',
        isInfra: true,
        isPrivate: false,
      }

      // Act
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await expect(page.locator('h1')).toContainText(projectName)

      // Assert
      await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
      await page.getByTestId('addRepoLink').click()
      await expect(page.locator('h2')).toContainText(
        'Ajouter un dépôt au projet',
      )
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
      await page
        .getByTestId('input-checkbox-infraRepoCbx')
        .check({ force: true })
      await page.getByTestId('addRepoBtn').click()
      await expect(
        page.getByTestId(`repoTr-${repo.internalRepoName}`),
      ).toBeVisible()
    },
  )

  test(
    'Should add an external private infra repo',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName, slug: projectSlug } = await addProject({
        page,
      })
      const repo = {
        externalRepoUrl: 'https://github.com/externalUser04/repo04.git',
        externalToken: '',
        externalUserName: 'externalUser+04',
        internalRepoName: 'repo04',
        isInfra: true,
        isPrivate: true,
      }

      // Act
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await expect(page.locator('h1')).toContainText(projectName)

      // Assert
      await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
      await page.getByTestId('addRepoLink').click()
      await expect(page.locator('h2')).toContainText(
        'Ajouter un dépôt au projet',
      )
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
      await page
        .getByTestId('input-checkbox-privateRepoCbx')
        .check({ force: true })
      await page
        .getByTestId('externalUserNameInput')
        .fill(repo.externalUserName)
      await page.getByTestId('externalTokenInput').fill(repo.externalToken)
      await page
        .getByTestId('input-checkbox-infraRepoCbx')
        .check({ force: true })
      await page.getByTestId('addRepoBtn').click()
      await expect(
        page.getByTestId(`repoTr-${repo.internalRepoName}`),
      ).toBeVisible()
    },
  )

  test('Should update a repo', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { name: projectName, slug: projectSlug } = await addProject({
      page,
    })
    const repo = {
      externalRepoUrl: 'https://github.com/externalUser03/repo03.git',
      externalToken: 'private-token',
      externalUserName: 'this-is+tobi',
      internalRepoName: 'repo03',
      isInfra: true,
      isPrivate: false,
    }

    // Act - Create repository
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    await expect(page.locator('h1')).toContainText(projectName)
    await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
    await page.getByTestId('addRepoLink').click()
    await expect(page.locator('h2')).toContainText(
      'Ajouter un dépôt au projet',
    )
    await page.getByTestId('internalRepoNameInput').fill(repo.internalRepoName)
    await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
    await page
      .getByTestId('input-checkbox-infraRepoCbx')
      .check({ force: true })
    await page.getByTestId('addRepoBtn').click()
    await expect(
      page.getByTestId(`repoTr-${repo.internalRepoName}`),
    ).toBeVisible()

    // Assert - Update repository
    await page.getByTestId(`repoTr-repo03`).click()
    await expect(page.getByTestId('internalRepoNameInput')).toBeDisabled()
    await page
      .getByTestId('externalRepoUrlInput')
      .fill('https://github.com/externalUser04/new-repo.git')
    await page
      .getByTestId('input-checkbox-privateRepoCbx')
      .check({ force: true })
    await page.getByTestId('externalUserNameInput').fill('newUser')
    await page.getByTestId('externalTokenInput').fill('newToken')
    await expect(page.getByTestId('input-checkbox-infraRepoCbx')).toBeEnabled()
    await page.getByTestId('updateRepoBtn').click()
    await expect(page.getByTestId(`repoTr-repo03`)).toBeVisible()
    await page.reload()
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
    await expect(page.getByTestId('externalTokenInput')).toHaveValue(fakeToken)
  })

  test('Should synchronise a repo', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { name: projectName, slug: projectSlug } = await addProject({
      page,
    })
    const repo = {
      externalRepoUrl: 'https://github.com/externalUser03/repo03.git',
      externalToken: 'private-token',
      externalUserName: 'this-is+tobi',
      internalRepoName: 'repo03',
      isInfra: true,
      isPrivate: false,
    }

    // Act - Create repository
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    await expect(page.locator('h1')).toContainText(projectName)
    await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
    await page.getByTestId('addRepoLink').click()
    await expect(page.locator('h2')).toContainText(
      'Ajouter un dépôt au projet',
    )
    await page.getByTestId('internalRepoNameInput').fill(repo.internalRepoName)
    await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
    await page
      .getByTestId('input-checkbox-infraRepoCbx')
      .check({ force: true })
    await page.getByTestId('addRepoBtn').click()
    await expect(
      page.getByTestId(`repoTr-${repo.internalRepoName}`),
    ).toBeVisible()

    // Assert - Update repository
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
    await page.getByTestId('syncRepoBtn').click()
    await expect(page.getByTestId('snackbar')).toContainText(
      'Travail de synchronisation lancé pour le dépôt repo03',
    )
    await page.getByTestId('branchNameInput').clear()
    await expect(page.getByTestId('syncRepoBtn')).toBeDisabled()
    await page.getByTestId('branchNameInput').fill('develop')
    await expect(page.getByTestId('syncRepoBtn')).toBeEnabled()
    await page.getByTestId('syncRepoBtn').click()
    await expect(page.getByTestId('snackbar')).toContainText(
      'Travail de synchronisation lancé pour le dépôt repo03',
    )
  })

  test('Should delete a repo', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { name: projectName, slug: projectSlug } = await addProject({
      page,
    })
    const repo = {
      externalRepoUrl: 'https://github.com/externalUser03/repo03.git',
      externalToken: 'private-token',
      externalUserName: 'this-is+tobi',
      internalRepoName: 'repo03',
      isInfra: true,
      isPrivate: false,
    }

    // Act - Create repository
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()
    await expect(page.locator('h1')).toContainText(projectName)
    await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
    await page.getByTestId('addRepoLink').click()
    await expect(page.locator('h2')).toContainText(
      'Ajouter un dépôt au projet',
    )
    await page.getByTestId('internalRepoNameInput').fill(repo.internalRepoName)
    await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
    await page
      .getByTestId('input-checkbox-infraRepoCbx')
      .check({ force: true })
    await page.getByTestId('addRepoBtn').click()
    await expect(
      page.getByTestId(`repoTr-${repo.internalRepoName}`),
    ).toBeVisible()

    // Assert - Delete repository
    //
    await page.getByTestId(`repoTr-${repo.internalRepoName}`).click()
    await expect(page.getByTestId('repo-form')).toBeVisible()
    await expect(page.getByTestId('deleteRepoInput')).not.toBeVisible()
    await expect(page.getByTestId('deleteRepoZone')).toBeVisible()
    await page.getByTestId('showDeleteRepoBtn').click()
    await expect(page.getByTestId('deleteRepoBtn')).toBeDisabled()
    await page.getByTestId('deleteRepoInput').fill(deleteValidationInput)
    await page.getByTestId('deleteRepoBtn').click()
    await expect(page.getByTestId('repo-form')).not.toBeVisible()
    await page.reload()
    await expect(
      page.getByTestId(`repoTr-${repo.internalRepoName}`),
    ).not.toBeVisible()
  })

  test(
    'Should not be able to delete a repository if not owner',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName, slug: projectSlug } = await addProject({
        page,
      })
      const repo = {
        externalRepoUrl: 'https://github.com/externalUser03/repo03.git',
        externalToken: 'private-token',
        externalUserName: 'this-is+tobi',
        internalRepoName: 'repo03',
        isInfra: true,
        isPrivate: false,
      }

      // Act - Create repository
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await expect(page.locator('h1')).toContainText(projectName)
      await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
      await page.getByTestId('addRepoLink').click()
      await expect(page.locator('h2')).toContainText(
        'Ajouter un dépôt au projet',
      )
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
      await page
        .getByTestId('input-checkbox-infraRepoCbx')
        .check({ force: true })
      await page.getByTestId('addRepoBtn').click()
      await expect(
        page.getByTestId(`repoTr-${repo.internalRepoName}`),
      ).toBeVisible()
      await page.getByRole('link', { name: 'Se déconnecter' }).click()
      await signInCloudPiNative({ page, credentials: tcolinUser })
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationProjects').click()
      await page.getByTestId('projectsSearchInput').fill(projectName)
      await page.getByTestId('projectsSearchBtn').click()
      await page.getByRole('cell', { name: projectName }).first().click()
      await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)

      // Assert - Attempt to delete repository
      await page.getByTestId(`repoTr-${repo.internalRepoName}`).click()
      await expect(page.getByTestId('repo-form')).toBeVisible()
      await expect(page.getByTestId('deleteRepoZone')).not.toBeVisible()
    },
  )

  test(
    'Should not be able to delete a repository if project locked',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({
        page,
        credentials:
          // Only admin users can lock projects
          tcolinUser,
      })
      const { name: projectName, slug: projectSlug } = await addProject({
        page,
      })
      const repo = {
        externalRepoUrl: 'https://github.com/externalUser03/repo03.git',
        externalToken: 'private-token',
        externalUserName: 'this-is+tobi',
        internalRepoName: 'repo03',
        isInfra: true,
        isPrivate: false,
      }

      // Act - Create repository
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await expect(page.locator('h1')).toContainText(projectName)
      await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
      await page.getByTestId('addRepoLink').click()
      await expect(page.locator('h2')).toContainText(
        'Ajouter un dépôt au projet',
      )
      await page
        .getByTestId('internalRepoNameInput')
        .fill(repo.internalRepoName)
      await page.getByTestId('externalRepoUrlInput').fill(repo.externalRepoUrl)
      await page
        .getByTestId('input-checkbox-infraRepoCbx')
        .check({ force: true })
      await page.getByTestId('addRepoBtn').click()
      await expect(
        page.getByTestId(`repoTr-${repo.internalRepoName}`),
      ).toBeVisible()

      // Act - Lock the project (have to go through admin menu for that)
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationProjects').click()
      await page.getByTestId('projectsSearchInput').fill(projectName)
      await page.getByTestId('projectsSearchBtn').click()
      await page.getByRole('cell', { name: projectName }).first().click()
      await expect(page.getByTestId('project-slug')).toHaveText(projectSlug)
      await page.getByTestId('handleProjectLockingBtn').click()

      // Assert - Attempt to delete repository
      await page.getByTestId(`repoTr-${repo.internalRepoName}`).click()
      await expect(page.getByTestId('repo-form')).toBeVisible()
      await expect(page.getByTestId('showDeleteRepoBtn')).not.toBeVisible()
    },
  )
})
