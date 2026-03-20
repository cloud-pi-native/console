import { expect, test } from '@playwright/test'

import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'
import { addProject, deleteProject } from './utils'

test.describe('Admin - Projects', () => {
  test('should search projects and run a bulk action', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })

    const { name: projectNameA } = await addProject({ page, projectName: `admin-proj-a` })
    const { name: projectNameB } = await addProject({ page, projectName: `admin-proj-b` })

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
      await signInCloudPiNative({ page, credentials: tcolinUser })
      await deleteProject(page, projectNameA)
      await deleteProject(page, projectNameB)
    }
  })

  test('should lock and unlock a project from its dashboard', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })

    const { name: projectName } = await addProject({ page, projectName: `admin-lock` })

    try {
      await page.getByTestId('handleProjectLockingBtn').click()
      await expect(page.getByTestId('handleProjectLockingBtn')).toContainText('Déverrouiller')

      await page.getByTestId('handleProjectLockingBtn').click()
      await expect(page.getByTestId('handleProjectLockingBtn')).toContainText('Verrouiller')
    } finally {
      await deleteProject(page, projectName)
    }
  })
})
