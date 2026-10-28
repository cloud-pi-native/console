import { expect, test } from '@playwright/test'
import {
  clientURL,
  signInCloudPiNative,
  tcolinUser,
  testUser,
} from '../config/console'
import { createProject } from '../helpers/project'

test.describe('Project logs page', { tag: '@e2e' }, () => {
  test(
    'should display project logs as owner',
    async ({ page }) => {
      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })

      // Act
      await createProject({ page })

      // Assert
      await page.getByTestId('test-tab-logs').click()
      await expect(page.locator('#panel-logs')).toBeVisible()
      await expect(page.locator('#panel-logs [data-testid$="-json"]').first()).toBeVisible()
    },
  )

  test(
    'should display additional logs after reprovisionning a project',
    async ({ page }) => {
      const readLogsTotal = async () => {
        const text = await page.getByTestId('positionInfo').first().textContent()
        return Number(text?.match(/sur\s+(\d+)/)?.[1] ?? 0)
      }

      // Arrange
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: testUser })
      await createProject({ page })

      await page.getByTestId('test-tab-logs').click()
      await expect(page.locator('#panel-logs')).toBeVisible()
      const logsTotalBefore = await readLogsTotal()

      // Act
      await page.getByTestId('replayHooksBtn').click()

      // Assert
      await expect(page.getByTestId('snackbar')).toContainText(
        'Le projet a été reprovisionné avec succès',
      )
      await page.getByTestId('refreshBtn').click()
      await expect.poll(readLogsTotal, { timeout: 30_000 }).toBeGreaterThan(
        logsTotalBefore,
      )
      await expect(page.locator('#panel-logs')).toBeVisible()
    },
  )

  test(
    'should display project logs as project manager as well as a project member',
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
      await expect(page.locator('#panel-logs [data-testid$="-json"]').first()).toBeVisible()
      await page.getByTestId('replayHooksBtn').click()

      // Assert - as Project Member
      await page.getByRole('link', { name: 'Se Déconnecter' }).click()
      await signInCloudPiNative({ page, credentials: tcolinUser })
      await page.getByTestId('menuMyProjects').click()
      await page.getByRole('link', { name: projectName }).click()
      await page.getByTestId('test-tab-logs').click()
      await expect(page.locator('#panel-logs')).toBeVisible()
      await expect(page.locator('#panel-logs [data-testid$="-json"]').first()).toBeVisible()
    },
  )
})
