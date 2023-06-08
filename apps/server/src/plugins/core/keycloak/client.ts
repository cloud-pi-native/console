import KcAdminClient from '@keycloak/keycloak-admin-client'

import {
  keycloakProtocol,
  keycloakDomain,
  keycloakRealm,
  keycloakUser,
  keycloakToken,
} from '../../../utils/env.js'

export const getkcClient = async () => {
  const kcClient = new KcAdminClient({
    baseUrl: `${keycloakProtocol}://${keycloakDomain}`,
  })

  await kcClient.auth({
    clientId: 'admin-cli',
    grantType: 'password',
    username: keycloakUser,
    password: keycloakToken,
  })
  kcClient.setConfig({ realmName: keycloakRealm })
  return kcClient
}
