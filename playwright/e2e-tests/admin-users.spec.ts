import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { clientURL, signInCloudPiNative, tcolinUser } from '../config/console'

interface ApiUser {
  id: string
  email: string
  firstName: string
  lastName: string
  type?: string
}

const adminUsersUrlRe = /\/admin\/users/
const listUsersUrlRe = /\/api\/v1\/users(?:\?|$)/

async function goToAdminUsers(page: Page) {
  await page.goto(clientURL)
  await signInCloudPiNative({ page, credentials: tcolinUser })
  await page.getByTestId('menuAdministrationBtn').click()
  await page.getByTestId('menuAdministrationUsers').click()
  await expect(page).toHaveURL(adminUsersUrlRe)
  await expect(page.getByTestId('tableAdministrationUsers')).toBeVisible()
}

test.describe('Administration users', { tag: '@e2e' }, () => {
  test('Should display admin users, logged in as admin', async ({ page }) => {
    const usersResponse = page.waitForResponse((res) => {
      return (
        res.request().method() === 'GET'
        && listUsersUrlRe.test(res.url())
        && res.status() >= 200
        && res.status() < 300
      )
    })

    await goToAdminUsers(page)

    const users = (await (await usersResponse).json()) as ApiUser[]
    expect(users.length).toBeGreaterThan(0)

    for (const user of users) {
      const row = page.getByTestId(`user-${user.id}`)
      await expect(row).toContainText(user.email)
      await expect(row).toContainText(user.lastName)
      await expect(row).toContainText(user.firstName)
      await expect(row).toContainText('202')
    }

    const displayIdCheckbox = page.getByTestId('input-checkbox-tableAdministrationUsersDisplayId')
    await displayIdCheckbox.check({ force: true })
    for (const user of users) {
      await expect(page.getByTestId(`user-${user.id}`)).toContainText(user.id)
    }

    const botUser = users.find(u => u.email.includes('anon@user')) ?? users.find(u => u.type && u.type !== 'human')
    if (botUser) {
      await expect(page.getByTestId(`user-${botUser.id}`)).toBeVisible()
      const hideBotsCheckbox = page.getByTestId('input-checkbox-tableAdministrationUsersHideBots')
      await hideBotsCheckbox.check({ force: true })
      await expect(page.getByTestId(`user-${botUser.id}`)).toHaveCount(0)
      await hideBotsCheckbox.uncheck({ force: true })
    }

    const rows = page.getByTestId('tableAdministrationUsers').locator('tbody tr')
    expect(await rows.count()).toBeGreaterThanOrEqual(users.length)

    const search = page.getByTestId('tableAdministrationUsersSearch')
    await expect(search).toBeVisible()
    await search.fill(botUser?.email ?? users[0].email)
    await expect(page.getByTestId('tableAdministrationUsers').locator('tbody tr')).toHaveCount(1)
  })
})
