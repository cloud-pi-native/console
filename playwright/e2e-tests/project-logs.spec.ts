import { expect, test } from '@playwright/test'
import {
  clientURL,
  signInCloudPiNative,
  tcolinUser,
  testUser,
} from '../config/console'
import { createProject } from '../helpers/project'

test.describe('Project logs page', () => {
  test(
    'Should display project logs as owner',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })

      // Act
      await createProject({ page })

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
      await createProject({ page })

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
    'Should display project logs as project manager as well as a project member',
    { tag: '@e2e' },
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })

      // Act
      const { name: projectName } = await createProject({
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
