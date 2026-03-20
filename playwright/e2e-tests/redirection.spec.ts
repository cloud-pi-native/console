import { expect, test } from '@playwright/test'

import { clientURL, signInCloudPiNative, testUser } from '../config/console'
import { addProject, deleteProject } from './utils'

const projectsUrlRegex = /\/projects/
const loginUrlRegex = /\/login$/
const swaggerUiUrlRegex = /\/swagger-ui/

test.describe('Redirection', () => {
  test('should keep original page on reload', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    await page.getByTestId('menuMyProjects').click()
    await expect(page).toHaveURL(projectsUrlRegex)

    await page.reload()
    await expect(page).toHaveURL(projectsUrlRegex)
  })

  test('should redirect to home if trying to access login while logged in', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })

    await page.goto(`${clientURL}/login`)
    await expect(page).not.toHaveURL(loginUrlRegex)
    await expect(page.locator('#top')).toContainText('Cloud π Native')
  })

  test('should open swagger ui from header link', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)

    const popupPromise = page.waitForEvent('popup')
    await page.getByTestId('swaggerUrl').click()
    const popup = await popupPromise

    await expect(popup).toHaveURL(swaggerUiUrlRegex)
    await expect(popup.locator('div.description')).toContainText(
      'API de gestion des ressources Cloud Pi Native.',
    )
  })

  test('should return to originally requested page after login', { tag: ['@e2e', '@need-rework'] }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    const { slug, name: projectName } = await addProject({ page })

    try {
      await page.getByRole('link', { name: 'Se déconnecter' }).click()
      await page.goto(`${clientURL}/projects/${slug}`)

      await page.getByRole('textbox', { name: 'Username or email' }).fill(
        testUser.username,
      )
      await page.getByRole('textbox', { name: 'Password' }).fill(
        testUser.password,
      )
      await page.getByRole('button', { name: 'Sign In' }).click()

      await expect(page).toHaveURL(`${clientURL}/projects/${slug}`)
      await expect(page.locator('h1')).toContainText(projectName)
    } finally {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await deleteProject(page, projectName)
    }
  })
})
