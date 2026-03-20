import { expect, test } from '@playwright/test'
import {
  adminUser,
  clientURL,
  cnolletUser,
  signInCloudPiNative,
  testUser,
} from '../config/console'
import {
  addProject,
  addRandomRepositoryToProject,
  deleteProject,
  deleteProjectBySlug,
  deleteValidationInput,
  synchronizeBranchOnRepository,
} from './utils'

test.describe('Projects page', () => {
  test(
    'Should display only projects that user is member of',
    { tag: '@e2e' },
    async ({ page }) => {
      // Create a project as one user
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName } = await addProject({ page })

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
      const { name: projectName } = await addProject({ page })

      // Act
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationProjects').click()
      await page.getByLabel('Filtre rapide').selectOption('Tous')
      await page.getByTestId('projectsSearchInput').fill(projectName)
      await page.getByTestId('projectsSearchBtn').click()
      await page.getByRole('cell', { name: projectName }).first().click()
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

  test('Should search projects and run a bulk action', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })

    const { name: projectNameA } = await addProject({ page, projectName: 'adminproja' })
    const { name: projectNameB } = await addProject({ page, projectName: 'adminprojb' })

    try {
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationProjects').click()
      await expect(page.locator('h1')).toContainText('Liste des projets')

      await page.getByTestId('projectsSearchInput').fill(projectNameA)
      await page.getByTestId('projectsSearchBtn').click()
      await expect(page.getByTestId('tableAdministrationProjects')).toContainText(projectNameA)

      await page.getByTestId('projectsSearchInput').fill('admin-proj-')
      await page.getByTestId('projectsSearchBtn').click()

      await page.getByTestId('select-all-cbx').check({ force: true })
      await expect(page.getByTestId('projectSelectedCount')).toContainText('projets sélectionnés')

      await page.getByTestId('selectBulkAction').selectOption({ value: 'lock' })
      await page.getByTestId('validateBulkAction').click()

      await expect(page.getByTestId('snackbar')).toContainText('Traitement en cours')
      await expect(page.getByTestId('projectSelectedCount')).toHaveCount(0)
    } finally {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: adminUser })
      await deleteProject(page, projectNameA)
      await deleteProject(page, projectNameB)
    }
  })

  test('should validate name and create a project with minimal form infos', { tag: '@e2e' }, async ({ page }) => {
    const projectName = `project${Date.now()}`

    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })
    await page.getByTestId('menuMyProjects').click()
    await page.getByTestId('createProjectLink').click()

    await expect(page.locator('h1')).toContainText('Commander un espace projet')

    await page.getByTestId('nameInput').fill(`${projectName} ErrorSpace`)
    await expect(page.getByTestId('nameInput')).toHaveClass(/fr-input--error/)
    await expect(page.getByTestId('createProjectBtn')).toBeDisabled()

    await page.getByTestId('nameInput').fill(projectName)
    await expect(page.getByTestId('nameInput')).not.toHaveClass(/fr-input--error/)
    await expect(page.getByTestId('createProjectBtn')).toBeEnabled()

    await page.getByTestId('descriptionInput').fill(
      'Application de prise de rendez-vous en préfécture.',
    )
    await page.getByTestId('createProjectBtn').click()

    await expect(page.locator('h1')).toContainText(projectName)

    const slug = (await page.getByTestId('project-slug').textContent())?.replace(
      'slug: ',
      '',
    )
    if (slug) {
      await deleteProjectBySlug(page, slug)
    }
  })

  test('should suffix slug when project name is already taken', { tag: '@e2e' }, async ({ page }) => {
    const projectName = `dupe${Date.now()}`

    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: adminUser })

    await page.getByTestId('menuMyProjects').click()
    await page.getByTestId('createProjectLink').click()
    await page.getByTestId('nameInput').fill(projectName)
    await page.getByTestId('createProjectBtn').click()
    await expect(page.locator('h1')).toContainText(projectName)
    const firstSlug = (await page.getByTestId('project-slug').textContent())?.replace(
      'slug: ',
      '',
    )

    await page.getByTestId('menuMyProjects').click()
    await page.getByTestId('createProjectLink').click()
    await page.getByTestId('nameInput').fill(projectName)
    await page.getByTestId('createProjectBtn').click()
    await expect(page.locator('h1')).toContainText(projectName)
    const secondSlug = (await page.getByTestId('project-slug').textContent())?.replace(
      'slug: ',
      '',
    )

    expect(firstSlug).toBeDefined()
    expect(secondSlug).toBeDefined()
    expect(secondSlug).not.toEqual(firstSlug)
    expect(secondSlug).toContain(`${projectName}-`)

    if (firstSlug) await deleteProjectBySlug(page, firstSlug)
    if (secondSlug) await deleteProjectBySlug(page, secondSlug)
  })
})
