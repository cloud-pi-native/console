import { expect } from '@playwright/test'

export interface KeycloakConfig {
  url: string
  realm: string
  adminUser: string
  adminPass: string
  clientFrontend: string
  clientBackend: string
}

export function loadKeycloakConfig(): KeycloakConfig {
  const protocol = process.env.KEYCLOAK_PROTOCOL || 'http'
  const domain = process.env.KEYCLOAK_DOMAIN || 'localhost'
  const port = process.env.KEYCLOAK_PORT ? `:${process.env.KEYCLOAK_PORT}` : ''
  const url = `${protocol}://${domain}${port}`

  return {
    url,
    realm: process.env.KEYCLOAK_REALM?.trim() || 'cloud-pi-native',
    adminUser: process.env.KEYCLOAK_ADMIN_USERNAME?.trim() || 'admin',
    adminPass: process.env.KEYCLOAK_ADMIN_PASSWORD?.trim() || 'admin',
    clientFrontend: process.env.KEYCLOAK_CLIENT_FRONTEND || 'dso-console-frontend',
    clientBackend: process.env.KEYCLOAK_CLIENT_BACKEND || 'dso-console-backend',
  }
}

export async function signInKeycloak(
  page: Page,
) {
  const keycloakConfig = loadKeycloakConfig()
  await page.goto(keycloakConfig.url)
  await page.locator('#username').fill(keycloakConfig.adminUser)
  await page.locator('#password').fill(keycloakConfig.adminPass)
  await page.locator('#kc-login').click()
  await expect(page.getByRole('link', { name: 'Logo' })).toBeVisible()
}
