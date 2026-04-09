import { expect, test } from '@playwright/test'
import { clientURL, secondTestUser, signInCloudPiNative } from '../config/console'
import { addProject, deleteProject } from '../helpers/project'

test.describe('GitLab repositories', () => {
  test(
    'Should create project and have infra-apps + mirror repos in GitLab',
    { tag: ['@e2e', '@integ', '@replayable'] },
    async ({ page }) => {
      test.setTimeout(300_000)

      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: secondTestUser })

      const { name: projectName } = await addProject({ page })

      try {
        await page.getByTestId('test-tab-services').click()

        const gitlabPopup = page.waitForEvent('popup')
        await page.getByRole('link', { name: 'Gitlab' }).click()
        const gitlabPage = await gitlabPopup

        await gitlabPage.waitForLoadState('domcontentloaded')

        await expect(
          gitlabPage.getByTestId('group-name').filter({ hasText: 'infra-apps' }),
        ).toBeVisible({ timeout: 120_000 })
        await expect(
          gitlabPage.getByTestId('group-name').filter({ hasText: 'mirror' }),
        ).toBeVisible({ timeout: 120_000 })
      } finally {
        await deleteProject(page, projectName)
      }
    },
  )
})
