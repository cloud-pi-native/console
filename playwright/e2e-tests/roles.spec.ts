import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, tcolinUser } from 'config/console'

test.describe('Administration Roles', () => {
  test(
    'Should list admin roles',
    { tag: ['@e2e', '@need-rework'] },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: tcolinUser })

      // Act
      await page.getByTestId('menuAdministrationBtn').click()
      await page.getByTestId('menuAdministrationRoles').click()

      // Assert
      // Obviously, we should not use data-testid that are made of ids…
      // @TODO: Do better.
      await expect(
        page.getByTestId('76229c96-4716-45bc-99da-00498ec9018c-tab'),
      ).toBeVisible()
      await expect(
        page.getByTestId('eadf604f-5f54-4744-bdfb-4793d2271e9b-tab'),
      ).toBeVisible()
    },
  )

  test('Should add a new OIDC role', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const newOidcRole = {
      name: faker.string.alpha(10).toLowerCase(),
      oidcGroupName: faker.string.alpha(10).toLowerCase(),
      user: {
        id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
        firstName: 'Claire',
        lastName: 'NOLLET',
        email: 'thibault.colin@test.com',
        createdAt: '2023-07-03T14:46:56.771Z',
        updatedAt: '2023-07-03T14:46:56.771Z',
        adminRoleIds: [],
        type: 'human',
      },
    }

    // Act
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationRoles').click()

    await expect(page.getByTestId('role-list')).not.toContainText(
      newOidcRole.name,
    )
    await page.getByTestId('addRoleBtn').click()
    await expect(page.getByTestId('snackbar')).toContainText('Rôle ajouté')
    await expect(page.getByTestId('saveBtn')).toBeDisabled()
    await expect(page.getByTestId('roleNameInput')).toHaveValue('Nouveau rôle')
    await page.getByTestId('roleNameInput').fill(newOidcRole.name)
    await page.getByTestId('oidcGroupInput').fill(newOidcRole.oidcGroupName)
    await page.getByTestId('saveBtn').click()

    // Assert
    await expect(page.getByTestId('role-list')).toContainText(newOidcRole.name)
    await page.getByTestId('test-members').click()
    await expect(page.getByTestId('addUserBtn')).toBeDisabled()
    await page
      .getByTestId('addUserSuggestionInput')
      .locator('input')
      .fill(`${newOidcRole.user.email}`)
    await page.getByTestId('addUserBtn').click()
    await page.getByTestId('menuAdministrationUsers').click()
    await expect(page.getByTestId('addUserBtn')).toBeEnabled()
    await page.getByTestId('addUserBtn').click()
    await page.getByTestId('menuAdministrationUsers').click()

    // Assert
    await expect(page.getByTestId(`user-${newOidcRole.user.id}`)).toContainText(
      newOidcRole.name,
    )
  })

  test('Should add a new non-OIDC role', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const newRole = {
      name: faker.string.alpha(10).toLowerCase(),
    }

    // Act
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationRoles').click()

    await expect(page.getByTestId('role-list')).not.toContainText(newRole.name)
    await page.getByTestId('addRoleBtn').click()
    await expect(page.getByTestId('snackbar')).toContainText('Rôle ajouté')
    await expect(page.getByTestId('saveBtn')).toBeDisabled()
    await expect(page.getByTestId('roleNameInput')).toHaveValue('Nouveau rôle')
    await page.getByTestId('roleNameInput').fill(newRole.name)
    await page.locator('input[name=MANAGE]').check({ force: true })
    await page.getByTestId('saveBtn').click()

    // Assert
    await expect(page.getByTestId('role-list')).toContainText(newRole.name)
  })

  test('Should add a user to a role', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const newRole = {
      name: faker.string.alpha(10).toLowerCase(),
      user: {
        id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
        firstName: 'Claire',
        lastName: 'NOLLET',
        email: 'claire.nollet@test.com',
        createdAt: '2023-07-03T14:46:56.771Z',
        updatedAt: '2023-07-03T14:46:56.771Z',
        adminRoleIds: [],
        type: 'human',
      },
    }

    // Act
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationRoles').click()
    // Create non-OIDC role
    await expect(page.getByTestId('role-list')).not.toContainText(newRole.name)
    await page.getByTestId('addRoleBtn').click()
    await expect(page.getByTestId('snackbar')).toContainText('Rôle ajouté')
    await expect(page.getByTestId('saveBtn')).toBeDisabled()
    await expect(page.getByTestId('roleNameInput')).toHaveValue('Nouveau rôle')
    await page.getByTestId('roleNameInput').fill(newRole.name)
    await page.locator('input[name=MANAGE]').check({ force: true })
    await page.getByTestId('saveBtn').click()
    await expect(page.getByTestId('role-list')).toContainText(newRole.name)
    // Add user to role
    await page.getByTestId('test-members').click()
    await expect(page.getByTestId('addUserBtn')).toBeDisabled()
    await page
      .getByTestId('addUserSuggestionInput')
      .locator('input')
      .fill(`${newRole.user.email}`)
    await page.getByTestId('addUserBtn').click()
    await page.getByTestId('menuAdministrationUsers').click()

    // Assert
    await expect(page.getByTestId(`user-${newRole.user.id}`)).toContainText(
      newRole.name,
    )
  })

  test('Should remove OIDC role', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const newOidcRole = {
      name: faker.string.alpha(10).toLowerCase(),
      oidcGroupName: faker.string.alpha(10).toLowerCase(),
    }

    // Act
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationRoles').click()
    // Create OIDC role
    await expect(page.getByTestId('role-list')).not.toContainText(
      newOidcRole.name,
    )
    await page.getByTestId('addRoleBtn').click()
    await expect(page.getByTestId('snackbar')).toContainText('Rôle ajouté')
    await expect(page.getByTestId('saveBtn')).toBeDisabled()
    await expect(page.getByTestId('roleNameInput')).toHaveValue('Nouveau rôle')
    await page.getByTestId('roleNameInput').fill(newOidcRole.name)
    await page.getByTestId('oidcGroupInput').fill(newOidcRole.oidcGroupName)
    await page.getByTestId('saveBtn').click()
    await expect(page.getByTestId('role-list')).toContainText(newOidcRole.name)
    // Delete role
    await page.getByTestId('deleteBtn').click()
    await page.getByTestId('confirmDeletionBtn').click()

    // Assert
    await expect(page.getByTestId('role-list')).not.toContainText(
      newOidcRole.name,
    )
  })

  test('Should remove non-OIDC role', { tag: '@e2e' }, async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const newRole = {
      name: faker.string.alpha(10).toLowerCase(),
    }

    // Act
    await page.getByTestId('menuAdministrationBtn').click()
    await page.getByTestId('menuAdministrationRoles').click()
    // Create OIDC role
    await expect(page.getByTestId('role-list')).not.toContainText(newRole.name)
    await page.getByTestId('addRoleBtn').click()
    await expect(page.getByTestId('snackbar')).toContainText('Rôle ajouté')
    await expect(page.getByTestId('saveBtn')).toBeDisabled()
    await expect(page.getByTestId('roleNameInput')).toHaveValue('Nouveau rôle')
    await page.getByTestId('roleNameInput').fill(newRole.name)
    await page.locator('input[name=MANAGE]').check({ force: true })
    await page.getByTestId('saveBtn').click()
    await expect(page.getByTestId('role-list')).toContainText(newRole.name)
    // Delete role
    await page.getByTestId('deleteBtn').click()
    await page.getByTestId('confirmDeletionBtn').click()

    // Assert
    await expect(page.getByTestId('role-list')).not.toContainText(newRole.name)
  })
})
