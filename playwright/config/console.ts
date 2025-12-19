import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

// Retrieve frontend URL from environment variables (see playwright.config.ts)
export const clientURL
  = process.env.KEYCLOAK_REDIRECT_URI || 'http://change-me'

export interface Credentials {
  id: string
  username: string
  password: string
  firstName: string
  lastName: string
  email: string
}

// Users referenced in Keycloak dev realm (../keycloak/realms/realm-dev.json)
export const adminUser: Credentials = {
  id: '387216f1-3b87-4211-9cac-4371125e1175',
  username: process.env.CONSOLE_ADMIN_USERNAME?.trim() || 'admin',
  password: process.env.CONSOLE_ADMIN_PASSWORD?.trim() || 'admin',
  firstName: 'Admin',
  lastName: 'ADMIN',
  email: process.env.CONSOLE_ADMIN_EMAIL?.trim() || 'admin@test.com',
}
export const testUser: Credentials = {
  id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
  username: process.env.CONSOLE_TEST_USERNAME?.trim() || 'test',
  password: process.env.CONSOLE_TEST_PASSWORD?.trim() || 'test',
  firstName: 'Jean',
  lastName: 'DUPOND',
  email: process.env.CONSOLE_TEST_EMAIL?.trim() || 'test@test.com',
}
export const cnolletUser: Credentials = {
  id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
  username: 'cnollet',
  password: 'test',
  firstName: 'Claire',
  lastName: 'NOLLET',
  email: 'claire.nollet@test.com',
}
export const tcolinUser: Credentials = {
  id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
  username: 'tcolin',
  password: 'test',
  firstName: 'Thibault',
  lastName: 'COLIN',
  email: 'thibault.colin@test.com',
}

// User for integration test
export const secondTestUser: Credentials = {
  id: 'test',
  username: process.env.CONSOLE_SECOND_TEST_USERNAME?.trim() || 'anothertest',
  password: process.env.CONSOLE_SECOND_TEST_PASSWORD?.trim() || 'anothertest',
  firstName: 'test',
  lastName: 'test',
  email: process.env.CONSOLE_SECOND_TEST_EMAIL?.trim() || 'anothertest@test.com',
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
