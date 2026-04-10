import { expect, test } from '@playwright/test'
import { clientURL, secondTestUser, signInCloudPiNative } from '../config/console'
import { addProject, deleteProject } from '../helpers/project'

const membersLinkRegexp = /^(members|membres)$/i
const manageLinkRegexp = /^(manage|gérer)$/i
const developerRoleRegexp = /developer/i

test.describe('GitLab', () => {
  test(
    'Should create project and have infra-apps + mirror repos in GitLab',
    { tag: ['@e2e', '@integ', '@replayable'] },
    async ({ page }) => {
      test.setTimeout(900_000)

      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: secondTestUser })

      const { name: projectName, slug: projectSlug } = await addProject({ page })

      try {
        await page.getByTestId('test-tab-services').click()

        const gitlabPopup = page.waitForEvent('popup')
        await page.getByRole('link', { name: 'Gitlab' }).click()
        const gitlabPage = await gitlabPopup

        await gitlabPage.locator('.gl-spinner').first().waitFor({ state: 'hidden', timeout: 300_000 })

        await expect(
          gitlabPage.getByTestId('group-name').filter({ hasText: 'infra-apps' }),
        ).toBeVisible({ timeout: 300_000 })
        await expect(
          gitlabPage.getByTestId('group-name').filter({ hasText: 'mirror' }),
        ).toBeVisible({ timeout: 300_000 })

        await gitlabPage.locator('.gl-spinner').first().waitFor({ state: 'hidden', timeout: 300_000 })

        const manageLink = gitlabPage
          .getByRole('button', { name: manageLinkRegexp })
          .or(gitlabPage.getByRole('link', { name: manageLinkRegexp }))
          .first()
        await manageLink.click({ timeout: 300_000 })
        await gitlabPage.locator('.gl-spinner').first().waitFor({ state: 'hidden', timeout: 300_000 })

        const membersLink = gitlabPage.getByRole('link', { name: membersLinkRegexp }).first()
        await membersLink.click({ timeout: 300_000 })
        await gitlabPage.locator('.gl-spinner').first().waitFor({ state: 'hidden', timeout: 300_000 })

        const userRow = gitlabPage.getByRole('row').filter({ hasText: `@${secondTestUser.username}` }).first()
        await userRow.scrollIntoViewIfNeeded()
        await expect(userRow).toBeVisible({
          timeout: 300_000,
        })

        const botRow = gitlabPage.getByRole('row').filter({ hasText: `${projectSlug}-bot` }).first()
        await botRow.scrollIntoViewIfNeeded()
        await expect(botRow).toBeVisible({
          timeout: 300_000,
        })
      } finally {
        await deleteProject(page, projectName).catch(() => {})
      }
    },
  )

  test(
    'Should reflect console role assignment in GitLab builtin role',
    { tag: ['@e2e', '@integ', '@replayable'] },
    async ({ page }) => {
      test.setTimeout(900_000)

      const roleMemberEmail = process.env.CONSOLE_GITLAB_ROLE_MEMBER_EMAIL?.trim()
      test.skip(!roleMemberEmail, 'CONSOLE_GITLAB_ROLE_MEMBER_EMAIL is required')
      const memberEmail = roleMemberEmail ?? ''

      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: secondTestUser })

      const { name: projectName } = await addProject({ page })

      try {
        await page.getByTestId('test-tab-team').click()
        await page
          .getByRole('combobox', { name: 'Ajouter un utilisateur' })
          .fill(memberEmail)
        await page.getByTestId('addUserBtn').click()
        await expect(page.getByTestId('teamTable').getByText(memberEmail)).toBeVisible({ timeout: 300_000 })

        await page.getByTestId('test-tab-roles').click()
        await page
          .locator('[data-testid$="-tab"]')
          .filter({ hasText: 'DevOps' })
          .click()
        await page.getByRole('tab', { name: 'Membres' }).click()
        const roleMemberRow = page.getByRole('row').filter({ hasText: memberEmail }).first()
        await roleMemberRow.getByRole('checkbox').check({ force: true })

        await expect(page.getByTestId('snackbar')).toContainText('Rôle mis à jour', { timeout: 300_000 })

        await page.getByTestId('test-tab-services').click()

        const gitlabPopup = page.waitForEvent('popup')
        await page.getByRole('link', { name: 'Gitlab' }).click()
        const gitlabPage = await gitlabPopup

        await gitlabPage.locator('.gl-spinner').first().waitFor({ state: 'hidden', timeout: 300_000 })

        const manageLink = gitlabPage
          .getByRole('button', { name: manageLinkRegexp })
          .or(gitlabPage.getByRole('link', { name: manageLinkRegexp }))
          .first()
        await manageLink.click({ timeout: 300_000 })

        const membersLink = gitlabPage.getByRole('link', { name: membersLinkRegexp }).first()
        await membersLink.click({ timeout: 300_000 })

        const roleMemberGitlabUsername = memberEmail.replace('@', '.')
        const memberRow = gitlabPage.getByRole('row').filter({ hasText: `@${roleMemberGitlabUsername}` }).first()
        await expect(memberRow).toContainText(developerRoleRegexp, { timeout: 300_000 })
      } finally {
        await deleteProject(page, projectName).catch(() => {})
      }
    },
  )
})
