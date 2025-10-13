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
  username: process.env.CONSOLE_ADMIN_USERNAME?.trim() || 'admin',
  password: process.env.CONSOLE_ADMIN_PASSWORD?.trim() || 'admin',
  email: process.env.CONSOLE_ADMIN_EMAIL?.trim() || 'admin@test.com',
}
export const testUser: Credentials = {
  username: process.env.CONSOLE_TEST_USERNAME?.trim() || 'test',
  password: process.env.CONSOLE_TEST_PASSWORD?.trim() || 'test',
  email: process.env.CONSOLE_TEST_EMAIL?.trim() || 'test@test.com',
}
export const cnolletUser: Credentials = {
  username: process.env.CONSOLE_OTHER_USERNAME?.trim() || 'cnollet',
  password: process.env.CONSOLE_OTHER_PASSWORD?.trim() || 'test',
  email: process.env.CONSOLE_OTHER_EMAIL?.trim() || 'claire.nollet@test.com',
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
  await page.getByRole('textbox', { name: 'Username or email' }).fill(username)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.locator('#top')).toContainText('Cloud π Native')
}
