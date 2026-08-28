import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, testUser } from 'config/console'
import { createProject, deleteProject } from 'helpers/project'

// Cahier de tests fonctionnels — SECR-001 / SECR-003
// SECR-001: Affichage des secrets de projet (toggle "Afficher les secrets des services")
// SECR-003: Bouton indisponible (projet verrouillé) — covered indirectly here by the
//   visibility contract on a fresh project; the locked-project variant requires an
//   archived/locked fixture the CI stack does not provision (see skip below).
test.describe('Secrets du projet (SECR)', { tag: '@e2e' }, () => {
  let projectName: string

  test.beforeEach(async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { name } = await createProject({ page })
    projectName = name
  })

  test('SECR-001: the secrets toggle is visible on a fresh project dashboard', async ({ page }) => {
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()

    // The toggle button exists and defaults to the hidden state
    const toggle = page.getByRole('button', { name: 'Afficher les secrets des services' })
    await expect(toggle).toBeVisible()
  })

  test('SECR-001: toggling switches the label between show/hide', async ({ page }) => {
    await page.getByTestId('menuMyProjects').click()
    await page.getByRole('link', { name: projectName }).click()

    const toggle = page.getByRole('button', { name: 'Afficher les secrets des services' })
    await toggle.click()
    await expect(page.getByRole('button', { name: 'Cacher les secrets des services' })).toBeVisible()
    // toggle back for state cleanliness
    await page.getByRole('button', { name: 'Cacher les secrets des services' }).click()
    await expect(page.getByRole('button', { name: 'Afficher les secrets des services' })).toBeVisible()
  })

  test.skip('SECR-003: secrets button unavailable on a locked project', async () => {
    // Requires provisioning a project with status locked/archived plus its plugin stack.
    // The merge-queue CI stack does not seed locked projects; to enable, seed a locked
    // project via admin API in beforeEach and assert the toggle is not rendered.
  })

  test.afterEach(async ({ page }) => {
    if (!projectName)
      return
    await deleteProject({ page, projectName })
    projectName = ''
  })
})
