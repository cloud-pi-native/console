
export const keycloakHost = process.env.KEYCLOAK_HOST || 'localhost'
export const keycloakPort = process.env.KEYCLOAK_PORT || '8090'

export const ssoConf = {
  url: `http://${keycloakHost}:${keycloakPort}`,
  realm: process.env.KEYCLOAK_REALM || 'TEST',
  clientId: process.env.KEYCLOAK_CLIENTID || 'TEST',
  onLoad: 'login-required',
  redirectUri: process.env.BASE_URL || 'http://localhost:8080/',
}
