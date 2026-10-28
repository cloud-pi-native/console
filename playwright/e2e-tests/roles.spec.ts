import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'
import { clientURL, cnolletUser, signInCloudPiNative, tcolinUser } from '../config/console'
import { addUserToAdminRole, createAdminRole, deleteAdminRole } from '../helpers/role'

test.describe('Administration Roles', { tag: '@e2e' }, () => {
  test(
    'should list admin roles',
    { tag: ['@need-rework'] },
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

  test('should add a new OIDC role', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const newOidcRole = {
      name: faker.string.alpha(10).toLowerCase(),
      oidcGroupName: `/${faker.string.alpha(10).toLowerCase()}`,
    }

    // Act
    await createAdminRole({ page, role: newOidcRole })
    await addUserToAdminRole({ page, userEmail: cnolletUser.email })

    // Assert
    const membershipCheckbox = page.getByTestId(
      `input-checkbox-${cnolletUser.id}-cbx`,
    )
    await expect(membershipCheckbox).toBeVisible()
    await expect(membershipCheckbox).toBeChecked()
  })

  test('should add a new non-OIDC role', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const newRole = {
      name: faker.string.alpha(10).toLowerCase(),
      managePerm: true,
    }

    // Act
    await createAdminRole({ page, role: newRole })

    // Assert
    await expect(page.getByTestId('role-list')).toContainText(newRole.name)
  })

  test('should add a user to a role', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const newRole = {
      name: faker.string.alpha(10).toLowerCase(),
      managePerm: true,
    }

    // Act
    await createAdminRole({ page, role: newRole })
    await addUserToAdminRole({ page, userEmail: cnolletUser.email })

    // Assert
    const membershipCheckbox = page.getByTestId(
      `input-checkbox-${cnolletUser.id}-cbx`,
    )
    await expect(membershipCheckbox).toBeVisible()
    await expect(membershipCheckbox).toBeChecked()
  })

  test('should remove OIDC role', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const newOidcRole = {
      name: faker.string.alpha(10).toLowerCase(),
      oidcGroupName: `/${faker.string.alpha(10).toLowerCase()}`,
    }
    await createAdminRole({ page, role: newOidcRole })

    // Act
    await deleteAdminRole({ page })

    // Assert
    await expect(page.getByTestId('role-list')).not.toContainText(
      newOidcRole.name,
    )
  })

  test('should remove non-OIDC role', async ({ page }) => {
    // Arrange
    await page.goto(clientURL)
    await signInCloudPiNative({ page, credentials: tcolinUser })
    const newRole = {
      name: faker.string.alpha(10).toLowerCase(),
      managePerm: true,
    }
    await createAdminRole({ page, role: newRole })

    // Act
    await deleteAdminRole({ page })

    // Assert
    await expect(page.getByTestId('role-list')).not.toContainText(newRole.name)
  })
})
