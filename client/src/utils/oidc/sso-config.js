// TODO: A comprendre process.env créer une exception
export const keycloakHost = import.meta.env?.KEYCLOAK_HOST || 'localhost'
export const keycloakPort = import.meta.env?.KEYCLOAK_PORT || '8090'

export const ssoConf = {
  url: `http://${keycloakHost}:${keycloakPort}`,
  realm: import.meta.env?.KEYCLOAK_REALM || 'TEST',
  clientId: import.meta.env?.KEYCLOAK_CLIENTID || 'TEST',
  onLoad: 'login-required',
  redirectUri: import.meta.env?.BASE_FULL_URL || 'http://localhost:8080',
}
