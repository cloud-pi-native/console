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
