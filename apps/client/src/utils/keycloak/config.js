import { keycloakDomain, keycloakClientId, keycloakRealm, keycloakRedirectUri } from '../env.js'

export const keycloakConf = {
  url: `https://${keycloakDomain}`,
  realm: keycloakRealm,
  clientId: keycloakClientId,
  onLoad: 'check-sso',
  flow: 'hybrid',
  redirectUri: keycloakRedirectUri,
}
