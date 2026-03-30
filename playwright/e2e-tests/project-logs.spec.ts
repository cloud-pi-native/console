import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'
import {
  clientURL,
  signInCloudPiNative,
  tcolinUser,
  testUser,
} from '../config/console'
import { addProject } from './utils'

test.describe('Project logs page', () => {
  test(
    'Should display project logs as owner',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })

      // Act
      await addProject({ page })

      // Assert
      await page.getByTestId('test-tab-logs').click()
      await expect(page.locator('#panel-logs')).toBeVisible()
      await expect(page.getByTestId('positionInfo')).toContainText(
        '1 - 5 sur 5',
      )
    },
  )

  test(
    'Should display additional logs after reprovisionning a project',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await addProject({ page })

      await page.getByTestId('test-tab-logs').click()
      await expect(page.locator('#panel-logs')).toBeVisible()
      await expect(page.getByTestId('positionInfo')).toContainText(
        '1 - 5 sur 5',
      )

      // Act
      await page.getByTestId('replayHooksBtn').click()

      // Assert
      await expect(page.locator('#panel-logs')).toBeVisible()
      await expect(page.getByTestId('positionInfo')).toContainText(
        '1 - 5 sur 6',
      )
    },
  )

  test(
    'Should create a project role, set permissions and save',
    { tag: '@e2e' },
    async ({ page }) => {
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      const { name: projectName } = await addProject({ page })
      const roleName = `role-${faker.string.alpha(10).toLowerCase()}`
      await page.getByTestId('test-tab-roles').click()
      await page.getByTestId('addRoleBtn').click()
      await expect(page.getByTestId('snackbar')).toContainText('Rôle ajouté')
      await expect(page.getByTestId('roleNameInput')).toHaveValue('Nouveau rôle')
      await page.getByTestId('roleNameInput').fill(roleName)
      await page.getByTestId('saveBtn').click()
      await page
        .locator('[data-testid$=\"-tab\"]')
        .filter({ hasText: roleName })
        .click()
      const roleTypeSelect = page.locator('#roleTypeSelect')
      if (await roleTypeSelect.isVisible()) {
        const currentRoleType = await roleTypeSelect.inputValue()
        if (currentRoleType === 'managed') {
          await roleTypeSelect.selectOption('global')
        }
      }
      for (const key of ['LIST_ENVIRONMENTS', 'LIST_REPOSITORIES']) {
        const input = page.locator(`#${key}-cbx`)
        await expect(input).toBeVisible()
        await expect(input).toBeEnabled()
        if (!(await input.isChecked())) {
          const label = page.locator(`label[for=\"${key}-cbx\"]`)
          if (await label.count()) {
            await label.first().click({ force: true })
          } else {
            await input.check({ force: true })
          }
        }
        await expect(input).toBeChecked()
      }
      await expect(page.getByTestId('saveBtn')).toBeEnabled()
      await page.getByTestId('saveBtn').click()
      await expect(page.getByTestId('snackbar')).toContainText('Rôle mis à jour')
      await expect(page.getByTestId('saveBtn')).toBeDisabled()
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await page.getByTestId('test-tab-logs').click()
      await expect(page.locator('#panel-logs')).toBeVisible()
    },
  )

  test(
    'Should display project logs as project manager as well as a project member',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })

      // Act
      const { name: projectName } = await addProject({
        page,
        members: [tcolinUser],
      })

      // Assert - as Project Owner
      await page.getByTestId('test-tab-logs').click()
      await expect(page.locator('#panel-logs')).toBeVisible()
      await page.getByTestId('replayHooksBtn').click()
      await expect(page.getByTestId('positionInfo')).toContainText(
        '1 - 5 sur 6',
      )

      // Assert - as Project Member
      await page.getByRole('link', { name: 'Se Déconnecter' }).click()
      await signInCloudPiNative({ page, credentials: tcolinUser })
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await page.getByTestId('test-tab-logs').click()
      await expect(page.locator('#panel-logs')).toBeVisible()
      await expect(page.getByTestId('positionInfo')).toContainText(
        '1 - 5 sur 6',
      )
    },
  )
})
