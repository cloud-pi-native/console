import type { Resource as AlchemyResource, Context } from 'alchemy'
import { Resource } from 'alchemy'
import { getKeycloakClient } from '../keycloak-client.js'

export interface KeycloakUserGroupMembershipProps {
  userId: string
  groupId: string
  present?: boolean
}

export interface KeycloakUserGroupMembershipResource extends AlchemyResource<'cpn::keycloack::UserGroupMembership'> {
  userId: string
  groupId: string
}

export const KeycloakUserGroupMembership = Resource(
  'cpn::keycloack::UserGroupMembership',
  async function (this: Context<KeycloakUserGroupMembershipResource>, _id: string, props: KeycloakUserGroupMembershipProps) {
    const kcClient = await getKeycloakClient()

    if (this.phase === 'delete' || props.present === false) {
      await kcClient.users.delFromGroup({ id: props.userId, groupId: props.groupId }).catch((error: any) => {
        if (isNotFoundError(error) || isConflictOrNoOpError(error)) return
        throw error
      })
      return this.destroy()
    }

    await kcClient.users.addToGroup({ id: props.userId, groupId: props.groupId }).catch((error: any) => {
      if (isConflictOrNoOpError(error)) return
      throw error
    })

    return {
      userId: props.userId,
      groupId: props.groupId,
    }
  },
)

function isNotFoundError(error: unknown): boolean {
  const anyError = error as any
  return anyError?.response?.status === 404 || anyError?.status === 404 || anyError?.statusCode === 404
}

function isConflictOrNoOpError(error: unknown): boolean {
  const anyError = error as any
  return anyError?.response?.status === 409 || anyError?.status === 409 || anyError?.statusCode === 409
}
