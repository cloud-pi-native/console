import type KeycloakAdminClient from '@keycloak/keycloak-admin-client'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'
import type { Resource as AlchemyResource, Context } from 'alchemy'
import { Resource } from 'alchemy'
import { getKeycloakClient } from '../keycloak-client.js'
import { ensureGroupByPath, findGroupByName, findGroupByPath } from '../utils/groups.js'

export interface KeycloakGroupPathProps {
  path: string
  present?: boolean
}

export interface KeycloakGroupPathResource extends AlchemyResource<'cpn::keycloack::GroupPath'>, Pick<GroupRepresentation, 'id' | 'name' | 'path'> {}

export const KeycloakGroupPath = Resource(
  'cpn::keycloack::GroupPath',
  async function (this: Context<KeycloakGroupPathResource>, _id: string, props: KeycloakGroupPathProps) {
    if (this.phase === 'delete') {
      const kcClient = await getKeycloakClient()
      await safeDeleteGroupByPath(kcClient, props.path)
      return this.destroy()
    }

    if (props.present === false) {
      const kcClient = await getKeycloakClient()
      await safeDeleteGroupByPath(kcClient, props.path)
      return this.destroy()
    }

    if (this.phase === 'update' && this.output?.path !== props.path) {
      this.replace()
    }

    const kcClient = await getKeycloakClient()
    const group = await ensureGroupByPath(kcClient, props.path)
    if (!group.id || !group.name || !group.path) {
      throw new Error(`Invalid Keycloak group returned for path: ${props.path}`)
    }
    return {
      id: group.id,
      name: group.name,
      path: group.path,
    }
  },
)

async function safeDeleteGroupByPath(kcClient: KeycloakAdminClient, groupPath: string) {
  const group = groupPath.startsWith('/')
    ? await findGroupByPath(kcClient, groupPath)
    : await findGroupByName(kcClient, groupPath)
  if (!group?.id) return
  await kcClient.groups.del({ id: group.id }).catch((error: any) => {
    if (isNotFoundError(error)) return
    throw error
  })
}

function isNotFoundError(error: unknown): boolean {
  const anyError = error as any
  return anyError?.response?.status === 404 || anyError?.status === 404 || anyError?.statusCode === 404
}
