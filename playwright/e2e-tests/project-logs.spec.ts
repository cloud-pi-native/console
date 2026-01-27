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
        '1 - 1 sur 1',
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
        '1 - 1 sur 1',
      )

      // Act
      await page.getByTestId('replayHooksBtn').click()

      // Assert
      await expect(page.locator('#panel-logs')).toBeVisible()
      await expect(page.getByTestId('positionInfo')).toContainText(
        '1 - 2 sur 2',
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
      const { name: projectName } = await addProject({
        page,
        members: [tcolinUser],
      })

      // Assert - as Project Owner
      await page.getByTestId('test-tab-logs').click()
      await expect(page.locator('#panel-logs')).toBeVisible()
      await page.getByTestId('replayHooksBtn').click()
      await expect(page.getByTestId('positionInfo')).toContainText(
        '1 - 2 sur 2',
      )

      // Assert - as Project Member
      await page.getByRole('link', { name: 'Se Déconnecter' }).click()
      await signInCloudPiNative({ page, credentials: tcolinUser })
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await page.getByTestId('test-tab-logs').click()
      await expect(page.locator('#panel-logs')).toBeVisible()
      await expect(page.getByTestId('positionInfo')).toContainText(
        '1 - 2 sur 2',
      )
    },
  )
})
