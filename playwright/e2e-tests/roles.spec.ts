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

  test(
    'Should add a new OIDC role',
    { tag: ['@e2e', '@need-rework'] },
    async ({ page }) => {
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

      // Assert
      await expect(page.getByTestId('role-list')).not.toContainText(
        newOidcRole.name,
      )
      await page.getByTestId('addRoleBtn').click()
      await expect(page.getByTestId('snackbar')).toContainText('Rôle ajouté')
      await expect(page.getByTestId('saveBtn')).toBeDisabled()
      await expect(page.getByTestId('roleNameInput')).toHaveValue(
        'Nouveau rôle',
      )
      await page.getByTestId('roleNameInput').fill(newOidcRole.name)
      await page.getByTestId('oidcGroupInput').fill(newOidcRole.oidcGroupName)
      await page.getByTestId('saveBtn').click()
      await expect(page.getByTestId('role-list')).toContainText(
        newOidcRole.name,
      )
      await page.getByTestId('test-members').click()
      await expect(
        page.getByTestId('addUserSuggestionInput'),
      ).not.toBeVisible()
      await expect(page.locator('div#members')).toContainText(
        'Les groupes ayant une liaison OIDC ne peuvent pas gérer leurs membres.',
      )
    },
  )
})
