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
    const { slug } = await addProject({ page })

    // Act
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationRoles').click()

    // Assert
    const systemRoles = [
      { name: 'Administrateur', oidcGroup: '/admin' },
      { name: 'DevOps', oidcGroup: '/devops' },
      { name: 'Développeur', oidcGroup: '/developer' },
      { name: 'Lecture seule', oidcGroup: '/readonly' },
    ]

    for (const role of systemRoles) {
      // Click on the role to select it
      await page.getByText(role.name, { exact: true }).click()

      // Check name input is disabled
      await expect(page.getByTestId('roleNameInput')).toBeDisabled()
      await expect(page.getByTestId('roleNameInput')).toHaveValue(role.name)

      // Check OIDC group input is disabled and has correct value
      await expect(page.getByTestId('roleOidcGroupInput')).toBeDisabled()
      const expectedOidcGroup = `/${role.oidcGroup}`
      await expect(page.getByTestId('roleOidcGroupInput')).toHaveValue(expectedOidcGroup)

      // Check delete button is not visible
      await expect(page.getByTestId('deleteBtn')).toBeHidden()
    }
  })
})
