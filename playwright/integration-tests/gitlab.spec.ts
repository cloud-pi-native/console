import { expect, test } from '@playwright/test'
import { clientURL, currentUser, secondTestUser, signInCloudPiNative } from '../config/console'
import { addProject, deleteProject } from '../helpers/project'

const membersLinkRegexp = /^(members|membres)$/i
const manageLinkRegexp = /^(manage|gérer)$/i
const developerRoleRegexp = /developer/i

test.describe('GitLab', () => {
  test(
    'Should create project and have infra-apps + mirror repos in GitLab',
    { tag: ['@integ', '@replayable'] },
    async ({ page }) => {
      test.setTimeout(10 * 60 * 1000)

      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: currentUser })

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

        const currentUserGitlabUsername = currentUser.email.replace('@', '.')
        const userRow = gitlabPage.getByRole('row').filter({ hasText: `@${currentUserGitlabUsername}` }).first()
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
      test.setTimeout(90_000)
      await page.goto(clientURL)
      await signInCloudPiNative({ page, credentials: currentUser })

      const { name: projectName } = await addProject({ page })

      try {
        await page.getByTestId('test-tab-team').click()
        await page.locator('input[data-testid="addUserSuggestionInput"]').fill(secondTestUser.email)
        await page.getByTestId('addUserBtn').click()
        const teamMemberRow = page.getByTestId('teamTable').getByRole('row').filter({ hasText: secondTestUser.email }).first()
        await expect(teamMemberRow).toBeVisible({ timeout: 300_000 })
        const teamMemberUserId = ((await teamMemberRow.locator('code').first().textContent()) ?? '').trim()
        expect(teamMemberUserId).not.toEqual('')

        await page.reload()
        await expect(page.getByTestId('project-slug')).toBeVisible({ timeout: 300_000 })

        await page.getByTestId('test-tab-roles').click()
        await page
          .locator('[data-testid$="-tab"]')
          .filter({ hasText: 'DevOps' })
          .click()
        await page.getByRole('tab', { name: 'Membres' }).click()
        const roleMemberCheckbox = page.getByTestId(`input-checkbox-${teamMemberUserId}-cbx`)
        await expect(roleMemberCheckbox).toBeVisible({ timeout: 300_000 })
        await roleMemberCheckbox.check({ force: true })

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

        const secondTestUserGitlabUsername = secondTestUser.email.replace('@', '.')
        const memberRow = gitlabPage.getByRole('row').filter({ hasText: `@${secondTestUserGitlabUsername}` }).first()
        await expect(memberRow).toContainText(developerRoleRegexp, { timeout: 300_000 })
      } finally {
        await deleteProject(page, projectName).catch(() => {})
      }
    },
  )
})
