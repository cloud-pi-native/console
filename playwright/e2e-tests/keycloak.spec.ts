import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'
import { faker } from '@faker-js/faker'
import { loadKeycloakConfig } from '../config/keycloak'

const keycloakConfig = loadKeycloakConfig()
const usersToDelete: string[] = []
const groupsToDelete: string[] = []

export async function createUser(page: Page, usersToDelete: string[]) {
  await page.getByRole('link', { name: 'Users' }).click()
  await page.getByTestId('add-user').click()
  const username = faker.internet.username()
  usersToDelete.push(username)
  await page
    .getByRole('textbox', { name: 'Username' })
    .fill(username)
  await page.getByTestId('email').fill(faker.internet.email())
  await page.getByTestId('user-creation-save').click()
  await expect(page.getByLabel('The user has been created')).toBeVisible()
  return username
}

export async function createGroup(page: Page, groupsToDelete: string[]) {
  await page.getByRole('link', { name: 'Groups' }).click()
  await page.getByRole('button', { name: 'Create group' }).click()
  const groupName = faker.string.alpha(10)
  groupsToDelete.push(groupName)
  await page.getByTestId('name').fill(groupName)
  await page.getByTestId('createGroup').click()
  await expect(page.getByLabel('Group created')).toBeVisible()
  return groupName
}

test.describe('Keycloak', () => {
  test.beforeEach({ tag: ['@e2e', '@integ'] }, async ({ page }) => {
    await page.goto(keycloakConfig.url)
    await page.locator('#username').fill(keycloakConfig.adminUser)
    await page.locator('#password').fill(keycloakConfig.adminPass)
    await page.locator('#kc-login').click()
    await expect(page.getByRole('link', { name: 'Logo' })).toBeVisible()
  })

  test('should sign in to master realm', { tag: ['@e2e', '@integ'] }, async ({ page }) => {
    // expect also exists in sign in fuction but we check it explicitely here
    // for documentation purposes
    await expect(page.getByRole('link', { name: 'Logo' })).toBeVisible()
    await page.getByTestId('realmSelector').click()
    await expect(page.getByRole('menuitem', { name: keycloakConfig.realm })).toBeVisible()
  })

  test('should have a CπN realm', { tag: ['@e2e', '@integ'] }, async ({ page }) => {
    await page.getByTestId('realmSelector').click()
    await expect(
      page.getByRole('menuitem', { name: keycloakConfig.realm }),
    ).toBeVisible()
  })

  test.describe('CπN realm', () => {
    test.beforeEach({ tag: ['@e2e', '@integ'] }, async ({ page }) => {
      await page.getByTestId('realmSelector').click()
      await page.getByRole('menuitem', { name: keycloakConfig.realm }).click()
    })

    test('should have required Clients', { tag: ['@e2e', '@integ'] }, async ({ page }) => {
      await page.getByTestId('realmSelector').click()
      await page.getByRole('menuitem', { name: keycloakConfig.realm }).click()
      await page.getByRole('link', { name: 'Clients' }).click()
      await expect(page.getByRole('link', { name: keycloakConfig.clientFrontend })).toBeVisible()
      await expect(page.getByRole('link', { name: keycloakConfig.clientBackend })).toBeVisible()
      await page.getByRole('link', { name: 'Client scopes' }).click()
      await expect(page.getByRole('link', { name: 'generic' })).toBeVisible()
    })

    test('should have required Clients scopes', { tag: ['@e2e', '@integ'] }, async ({ page }) => {
      await page.getByRole('link', { name: 'Client scopes' }).click()
      await expect(page.getByRole('link', { name: 'generic' })).toBeVisible()
    })

    test('should create a user', { tag: '@e2e' }, async ({ page }) => {
      await createUser(page, usersToDelete)
    })

    test('should create a group', { tag: '@e2e' }, async ({ page }) => {
      await createGroup(page, groupsToDelete)
    })

    test('should link a user to a group', { tag: ['@e2e', '@integ'] }, async ({ page }) => {
      const username = await createUser(page, usersToDelete)
      const groupName = await createGroup(page, groupsToDelete)
      await page
        .getByTestId('searchForGroups')
        .getByRole('textbox', { name: 'Search' })
        .fill(groupName)
      await page
        .getByTestId('searchForGroups')
        .getByRole('textbox', { name: 'Search' })
        .press('Enter')
      await page.getByRole('button', { name: groupName }).click()
      await page.getByTestId('members').click()
      await page.getByRole('button', { name: 'Add member' }).click()
      await page
        .getByTestId('titleUsersinput')
        .getByRole('textbox', { name: 'Search' })
        .fill(username)
      await page
        .getByTestId('titleUsersinput')
        .getByRole('textbox', { name: 'Search' })
        .press('Enter')
      await page.getByRole('checkbox', { name: 'Select row 0' }).check()
      await page.getByTestId('add').click()
      await expect(page.getByText('user added to the group')).toBeVisible()
    })

    test('should delete a group', { tag: '@e2e' }, async ({ page }) => {
      const groupName = await createGroup(page, groupsToDelete)
      await page
        .getByTestId('searchForGroups')
        .getByRole('textbox', { name: 'Search' })
        .fill(groupName)
      await page
        .getByTestId('searchForGroups')
        .getByRole('textbox', { name: 'Search' })
        .press('Enter')
      await page
        .getByRole('treeitem', { name: `${groupName} Actions` })
        .getByLabel('Actions')
        .click()
      await page.getByRole('menuitem', { name: 'Delete' }).click()
      await page.getByTestId('confirm').click()
    })

    test('should delete a user', { tag: '@e2e' }, async ({ page }) => {
      await createUser(page, usersToDelete)
      await page.getByTestId('action-dropdown').click()
      await page.getByRole('menuitem', { name: 'Delete' }).click()
      await page.getByTestId('confirm').click()
    })

    test('cleanup Keycloak test data', { tag: '@integ' }, async ({ request }) => {
      const params = new URLSearchParams()
      params.append('grant_type', 'password')
      params.append('client_id', 'admin-cli')
      params.append('username', keycloakConfig.adminUser)
      params.append('password', keycloakConfig.adminPass)

      const tokenRes = await request.post(
        `${keycloakConfig.url}/realms/master/protocol/openid-connect/token`,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: params.toString(),
        },
      )

      if (!tokenRes.ok) {
        throw new Error(`Failed to get token: ${tokenRes.statusText}`)
      }

      const tokenData = await tokenRes.json()
      const authHeader = { Authorization: `Bearer ${tokenData.access_token}` }

      for (const username of usersToDelete) {
        const usersRes = await request.get(
          `${keycloakConfig.url}/admin/realms/${keycloakConfig.realm}/users?username=${username}`,
          { headers: authHeader },
        )
        const users = await usersRes.json()
        for (const user of users) {
          await request.delete(`${keycloakConfig.url}/admin/realms/${keycloakConfig.realm}/users/${user.id}`, {
            headers: authHeader,
          })
        }
      }

      for (const groupName of groupsToDelete) {
        const groupsRes = await request.get(
          `${keycloakConfig.url}/admin/realms/${keycloakConfig.realm}/groups?search=${groupName}`,
          { headers: authHeader },
        )
        const groups = await groupsRes.json()
        for (const group of groups) {
          await request.delete(`${keycloakConfig.url}/admin/realms/${keycloakConfig.realm}/groups/${group.id}`, {
            headers: authHeader,
          })
        }
      }
    })
  })
})
