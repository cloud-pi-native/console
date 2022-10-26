export const keycloakHost = process.env.KEYCLOAK_HOST
export const keycloakPort = process.env.KEYCLOAK_PORT

export const ssoConf = {
  url: `http://${keycloakHost}:${keycloakPort}`,
  realm: process.env.KEYCLOAK_REALM,
  clientId: process.env.KEYCLOAK_CLIENTID,
  onLoad: 'check-sso',
  flow: 'hybrid',
  redirectUri: process.env.BASE_FULL_URL || 'http://localhost:8080',
}
