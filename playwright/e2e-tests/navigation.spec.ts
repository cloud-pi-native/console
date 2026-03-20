import { expect, test } from '@playwright/test'
import { clientURL, cnolletUser, signInCloudPiNative, tcolinUser } from '../config/console'
import { addProject, deleteProject } from './utils'

test.describe('Navigation', () => {
  test('should display header and links', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)

    await expect(page.locator('.fr-header__service')).toContainText('Console Cloud π Native')
    await expect(page.getByTestId('swaggerUrl')).toHaveAttribute('href', '/swagger-ui')
    await expect(page.getByTestId('appVersionUrl')).toContainText('vpr-')
    await expect(page.getByTestId('appVersionUrl')).toHaveAttribute(
      'href',
      /https:\/\/github\.com\/cloud-pi-native\/console\/releases\/tag\/vpr-/,
    )
  })

  test('should redirect to 404 if page not found', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: cnolletUser })
    await page.goto(`${clientURL}/nowhere`)
    await expect(page.locator('.fr-h1')).toContainText('Page non trouvée')
  })

  test('should show sidemenu when not logged in', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await expect(page.getByTestId('mainMenu')).toBeVisible()
    await expect(page.getByTestId('menuProjectBtn')).toHaveCount(0)
    await expect(page.getByTestId('menuAdministrationList')).toHaveCount(0)
    await expect(page.getByTestId('menuAdministrationBtn')).toHaveCount(0)
    await expect(page.getByTestId('menuDoc')).toBeVisible()
  })

  test('should show sidemenu for a regular user', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: cnolletUser })

    const { name: projectName } = await addProject({ page })
    try {
      await page.getByTestId('menuMyProjects').click()
      await expect(page).toHaveURL(/\/projects$/)
      await page.getByRole('link', { name: projectName }).click()
      await expect(page).toHaveURL(/\/projects\//)
    } finally {
      await deleteProject(page, projectName)
    }
  })

  test('should show sidemenu for an admin', { tag: '@e2e' }, async ({ page }) => {
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })

    await expect(page.getByTestId('mainMenu')).toBeVisible()
    await expect(page.getByTestId('menuAdministrationList')).not.toBeVisible()

    await page.getByTestId('menuMyProjects').click()
    await expect(page.getByTestId('menuAdministrationList')).not.toBeVisible()
    await expect(page).toHaveURL(/\/projects$/)

    await page.getByTestId('menuDoc').click()
    await expect(page.getByTestId('menuAdministrationList')).not.toBeVisible()

    await page.getByTestId('menuAdministrationBtn').click()
    await expect(page.getByTestId('menuAdministrationList')).toBeVisible()
    await page.getByTestId('menuAdministrationUsers').click()
    await expect(page.getByTestId('menuAdministrationUsers')).toHaveClass(/router-link-active/)
    await expect(page).toHaveURL(/\/admin\/users/)
  })
})
