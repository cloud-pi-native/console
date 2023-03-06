import KcAdminClient from '@keycloak/keycloak-admin-client'

import {
  keycloakProtocol,
  keycloakDomain,
  keycloakRealm,
  keycloakUser,
  keycloakToken,
} from './env.js'

const kcAdminClient = new KcAdminClient({
  baseUrl: `${keycloakProtocol}://${keycloakDomain}`,
  realmName: keycloakRealm,
})

await kcAdminClient.auth({
  username: keycloakUser,
  password: keycloakToken,
  grantType: 'password',
  clientId: 'admin-cli',
})

module.exports = { kcAdminClient }
