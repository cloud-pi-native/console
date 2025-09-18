import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'
import { faker } from '@faker-js/faker'

const keycloakURL = `${process.env.KEYCLOAK_PROTOCOL}://${process.env.KEYCLOAK_DOMAIN}${process.env.KEYCLOAK_PORT ? `:${process.env.KEYCLOAK_PORT}` : ''}/`

async function signInMasterRealm({ page }: { page: Page }) {
  // Ouverture de Keycloak
  await page.goto(keycloakURL)

  // Connexion à la console d'administration de l'instance Keycloak
  await page.locator('#username').fill('admin')
  await page.locator('#password').fill('admin')
  await page.locator('#kc-login').click()
  await expect(page.getByRole('link', { name: 'Logo' })).toBeVisible()
}

test.describe('Keycloak', () => {
  test.beforeEach(async ({ page }) => {
    await signInMasterRealm({ page })
  })

  test('should sign in to master realm', async ({ page }) => {
    // expect also exists in sign in fuction but we check it explicitely here
    // for documentation purposes
    await expect(page.getByRole('link', { name: 'Logo' })).toBeVisible()
  })

  test('should have a CπN realm', async ({ page }) => {
    await page.getByTestId('realmSelector').click()
    await expect(
      page.getByRole('menuitem', { name: 'cloud-pi-native' }),
    ).toBeVisible()
  })

  test.describe('CπN realm', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByTestId('realmSelector').click()
      await page.getByRole('menuitem', { name: 'cloud-pi-native' }).click()
    })

    test('should have required Clients', async ({ page }) => {
      await page.getByRole('link', { name: 'Clients' }).click()
      await expect(
        page.getByRole('link', { name: 'dso-console-frontend' }),
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'dso-console-backend' }),
      ).toBeVisible()
    })

    test('should have required Clients scopes', async ({ page }) => {
      await page.getByRole('link', { name: 'Client scopes' }).click()
      await expect(page.getByRole('link', { name: 'generic' })).toBeVisible()
    })

    test('should create a user', async ({ page }) => {
      await page.getByRole('link', { name: 'Users' }).click()
      await page.getByTestId('add-user').click()
      await page
        .getByRole('textbox', { name: 'Username' })
        .fill(faker.internet.username())
      await page.getByTestId('email').fill(faker.internet.email())
      await page.getByTestId('user-creation-save').click()
      await expect(page.getByLabel('The user has been created')).toBeVisible()
    })

    test('should create a group', async ({ page }) => {
      await page.getByRole('link', { name: 'Groups' }).click()
      await page.getByRole('button', { name: 'Create group' }).click()
      await page.getByTestId('name').fill(faker.string.alpha(10))
      await page.getByTestId('createGroup').click()
      await expect(page.getByLabel('Group created')).toBeVisible()
    })

    test('should link a user to a group', async ({ page }) => {
      // Create user
      await page.getByRole('link', { name: 'Users' }).click()
      await page.getByTestId('add-user').click()
      const username = faker.internet.username()
      await page.getByRole('textbox', { name: 'Username' }).fill(username)
      await page.getByTestId('email').fill(faker.internet.email())
      await page.getByTestId('user-creation-save').click()
      await expect(page.getByLabel('The user has been created')).toBeVisible()

      // Create group
      await page.getByRole('link', { name: 'Groups' }).click()
      await page.getByRole('button', { name: 'Create group' }).click()
      const groupName = faker.string.alpha(10)
      await page.getByTestId('name').fill(groupName)
      await page.getByTestId('createGroup').click()
      await expect(page.getByLabel('Group created')).toBeVisible()

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
      await page.getByRole('checkbox', { name: 'Select row 1' }).check()
      await page.getByTestId('add').click()
      await expect(page.getByText('user added to the group')).toBeVisible()
    })

    test('should delete a group', async ({ page }) => {
      await page.getByRole('link', { name: 'Groups' }).click()
      await page.getByRole('button', { name: 'Create group' }).click()
      const groupName = faker.string.alpha(10)
      await page.getByTestId('name').fill(groupName)
      await page.getByTestId('createGroup').click()
      await expect(page.getByLabel('Group created')).toBeVisible()
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

    test('should delete a user', async ({ page }) => {
      await page.getByRole('link', { name: 'Users' }).click()
      await page.getByTestId('add-user').click()
      const username = faker.internet.username()
      await page.getByRole('textbox', { name: 'Username' }).fill(username)
      await page.getByTestId('email').fill(faker.internet.email())
      await page.getByTestId('user-creation-save').click()
      await expect(page.getByLabel('The user has been created')).toBeVisible()
      await page.getByTestId('action-dropdown').click()
      await page.getByRole('menuitem', { name: 'Delete' }).click()
      await page.getByTestId('confirm').click()
    })
  })
})
