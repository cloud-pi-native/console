import { faker } from '@faker-js/faker'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

// Retrieve frontend URL from environment variables (see playwright.config.ts)
export const clientURL = process.env.KEYCLOAK_REDIRECT_URI || 'http://change-me'

export interface Credentials {
  username: string
  password: string
  email: string
}

// Users referenced in Keycloak dev realm (../keycloak/realms/realm-dev.json)
export const adminUser: Credentials = {
  username: 'admin',
  password: 'admin',
  email: 'admin@test.com',
}
export const testUser: Credentials = {
  username: 'test',
  password: 'test',
  email: 'test@test.com',
}
export const cnolletUser: Credentials = {
  username: 'cnollet',
  password: 'test',
  email: 'claire.nollet@test.com',
}

export async function signInCloudPiNative({
  page,
  credentials,
}: {
  page: Page
  credentials: Credentials
}) {
  const { username, password } = credentials
  await page.getByRole('link', { name: 'Se connecter' }).click()
  await page.locator('#username').fill(username)
  await page.locator('#password').fill(password)
  await page.locator('#kc-login').click()
  await expect(page.locator('#top')).toContainText('Cloud π Native')
}

// Assuming we are on the Home page, create a random project with given name, or a generated one
export async function addProject({
  page,
  projectName,
  members,
}: {
  page: Page
  projectName?: string
  members?: Credentials[]
}) {
  projectName = projectName ?? faker.string.alpha(10).toLowerCase()
  await page.getByTestId('menuMyProjects').click()
  await page.getByTestId('createProjectLink').click()
  await page.getByTestId('nameInput').click()
  await page.getByTestId('nameInput').fill(projectName)
  await page.getByTestId('createProjectBtn').click()
  await expect(page.locator('h1')).toContainText(projectName)
  if (members) {
    await page.getByTestId('test-tab-team').click()
    for (const member of members) {
      await page.getByRole('combobox', { name: 'Ajouter un utilisateur' }).fill(member.email)
      await page.getByTestId('addUserBtn').click()
      await expect(page.getByRole('cell', { name: member.email })).toBeVisible()
    }
    await page.getByTestId('test-tab-resources').click()
  }
  return projectName
}
