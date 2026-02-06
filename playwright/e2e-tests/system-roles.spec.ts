import { expect, test } from '@playwright/test'
import {
  clientURL,
  signInCloudPiNative,
  testUser,
} from '../config/console'
import {
  addProject,
} from './utils'

test.describe('System Roles at Project Creation', () => {
  test('Should have built-in system roles after project creation', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: testUser })
    await addProject({ page })

    // Act
    await page.getByTestId('test-tab-roles').click()

    // Assert
    const systemRoles = [
      { name: 'Administrateur', oidcGroup: '/console/admin' },
      { name: 'DevOps', oidcGroup: '/console/devops' },
      { name: 'Développeur', oidcGroup: '/console/developer' },
      { name: 'Lecture seule', oidcGroup: '/console/readonly' },
    ]

    for (const role of systemRoles) {
      // Click on the role to select it
      const roleElement = await page.getByText(role.name)
      await expect(roleElement).toBeVisible()
      await roleElement.click()

      // Check name input is disabled
      await expect(page.getByTestId('roleNameInput')).toBeDisabled()
      await expect(page.getByTestId('roleNameInput')).toHaveValue(role.name)

      // Check OIDC group input is disabled and has correct value
      await expect(page.getByTestId('roleOidcGroupInput')).toBeDisabled()
      await expect(page.getByTestId('roleOidcGroupInput')).toHaveValue(role.oidcGroup)

      // Check delete button is not visible
      await expect(page.getByTestId('deleteBtn')).toBeHidden()
    }
  })
})
