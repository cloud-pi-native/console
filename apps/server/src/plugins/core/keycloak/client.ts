import KcAdminClient from '@keycloak/keycloak-admin-client'
import {
  keycloakProtocol,
  keycloakDomain,
  keycloakRealm,
} from '@/utils/env.js'
export const keycloakToken = process.env.KEYCLOAK_ADMIN_PASSWORD
export const keycloakUser = process.env.KEYCLOAK_ADMIN

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
