export const keycloakDomain = process.env.KEYCLOAK_DOMAIN || 'localhost:8090'

export const keycloakConf = {
  url: `http://${keycloakDomain}`,
  realm: process.env.KEYCLOAK_REALM,
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  onLoad: 'check-sso',
  flow: 'hybrid',
  silentCheckSsoRedirectUri: '/silent-check-sso.html',
  redirectUri: process.env.KEYCLOAK_REDIRECT_URI || 'http://localhost:8080',
}
