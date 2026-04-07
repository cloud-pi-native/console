import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation.js'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation.js'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { findGroupByName, findGroupByPath, listAllSubgroups } from './utils/groups.js'

let kcClient: KcAdminClient | undefined

function getKeycloakBaseUrl(): string {
  return process.env.KEYCLOAK_INTERNAL_URL
    ? removeTrailingSlash(process.env.KEYCLOAK_INTERNAL_URL)
    : `${requiredEnv('KEYCLOAK_PROTOCOL')}://${requiredEnv('KEYCLOAK_DOMAIN')}`
}

function getKeycloakRealm(): string {
  return requiredEnv('KEYCLOAK_REALM')
}

export async function getKeycloakClient(): Promise<KcAdminClient> {
  if (kcClient) return kcClient
  const client = new KcAdminClient({
    baseUrl: getKeycloakBaseUrl(),
  })

  await client.auth({
    clientId: 'admin-cli',
    grantType: 'password',
    username: process.env.KEYCLOAK_ADMIN,
    password: process.env.KEYCLOAK_ADMIN_PASSWORD,
  })
  client.setConfig({ realmName: getKeycloakRealm() })
  kcClient = client
  return client
}

export async function findUserByEmail(email: string): Promise<UserRepresentation | undefined> {
  const client = await getKeycloakClient()
  const user = (await client.users.find({ email }))[0]
  return user
}

export async function listGroupMembers(groupId: string): Promise<UserRepresentation[]> {
  const client = await getKeycloakClient()
  return client.groups.listMembers({ id: groupId })
}

export async function listUserGroups(userId: string): Promise<GroupRepresentation[]> {
  const client = await getKeycloakClient()
  return client.users.listGroups({ id: userId })
}

export async function findClientByClientId(clientId: string): Promise<ClientRepresentation | undefined> {
  const client = await getKeycloakClient()
  const result: ClientRepresentation[] = await client.clients.find({ clientId, max: 1 })
  return result[0]
}

export async function lookupGroupByPathOrName(pathOrName: string): Promise<GroupRepresentation | undefined> {
  const client = await getKeycloakClient()
  if (pathOrName.startsWith('/')) {
    return findGroupByPath(client, pathOrName)
  }
  return findGroupByName(client, pathOrName)
}

export async function listAllSubgroupsByParentId(parentId: string): Promise<GroupRepresentation[]> {
  const client = await getKeycloakClient()
  return listAllSubgroups(client, parentId, 0)
}
