import KcAdminClient from '@keycloak/keycloak-admin-client'
import { requiredEnv } from '@dso-console/shared'
export const keycloakToken = process.env.KEYCLOAK_ADMIN_PASSWORD
export const keycloakUser = process.env.KEYCLOAK_ADMIN

let keycloakDomain: string | undefined
let keycloakProtocol: string | undefined
let keycloakRealm: string | undefined

export const getkcClient = async () => {
  keycloakDomain = keycloakDomain ?? requiredEnv('KEYCLOAK_DOMAIN')
  keycloakProtocol = keycloakProtocol ?? requiredEnv('KEYCLOAK_PROTOCOL')
  keycloakRealm = keycloakRealm ?? requiredEnv('KEYCLOAK_REALM')

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

export const start = () => {
  getkcClient()
}
