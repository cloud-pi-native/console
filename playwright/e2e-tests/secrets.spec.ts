import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, testUser } from 'config/console'
import { openMyProjects } from 'helpers/navigation'
import { createProject, deleteProject } from 'helpers/project'

// Parcours secrets du projet : bascule du bouton « Afficher/Cacher les secrets
// des services ». Le cas projet verrouillé (bouton indisponible) n'est pas
// couvert — la stack CI ne provisionne pas de projet verrouillé.
test.describe('Secrets du projet', { tag: '@e2e' }, () => {
  let projectName: string

  test.beforeEach(async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { name } = await createProject({ page })
    projectName = name
  })

  test('toggling switches the label between show/hide', async ({ page }) => {
    await openMyProjects({ page })
    await page.getByRole('link', { name: projectName }).click()

    const toggle = page.getByRole('button', { name: 'Afficher les secrets des services' })
    await expect(toggle).toBeVisible()
    await toggle.click()
    await expect(page.getByRole('button', { name: 'Cacher les secrets des services' })).toBeVisible()
    await page.getByRole('button', { name: 'Cacher les secrets des services' }).click()
    await expect(page.getByRole('button', { name: 'Afficher les secrets des services' })).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    if (!projectName)
      return
    await deleteProject({ page, projectName })
    projectName = ''
  })
})
