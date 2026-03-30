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
      { name: 'Administrateur', oidcGroup: '/console/admin', roleType: 'managed' },
      { name: 'DevOps', oidcGroup: '/console/devops', roleType: 'managed' },
      { name: 'Développeur', oidcGroup: '/console/developer', roleType: 'managed' },
      { name: 'Lecture seule', oidcGroup: '/console/readonly', roleType: 'managed' },
    ]

    for (const role of systemRoles) {
      // Click on the role to select it
      const roleElement = page.getByText(role.name)
      await expect(roleElement).toBeVisible()
      await roleElement.click()

      // Check name input is disabled
      await expect(page.getByTestId('roleNameInput')).toHaveValue(role.name)

      // Check OIDC group input is disabled and has correct value
      await expect(page.getByTestId('roleOidcGroupInput')).toHaveValue(role.oidcGroup)

      // Check role type select is disabled and has correct value
      const roleTypeSelect = page.locator('#roleTypeSelect')
      await expect(roleTypeSelect).toBeDisabled()
      await expect(roleTypeSelect).toHaveValue(role.roleType)

      // Check delete button is not visible
      await expect(page.getByTestId('deleteBtn')).toBeHidden()
    }
  })
})
