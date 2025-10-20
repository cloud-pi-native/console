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
