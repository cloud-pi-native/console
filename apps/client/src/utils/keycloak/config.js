import { keycloakDomain, keycloakClientId, keycloakRealm, keycloakRedirectUri } from '../env.js'

export const keycloakConf = {
  url: `http://${keycloakDomain}`,
  realm: keycloakRealm,
  clientId: keycloakClientId,
  onLoad: 'check-sso',
  flow: 'hybrid',
  redirectUri: keycloakRedirectUri,
}
