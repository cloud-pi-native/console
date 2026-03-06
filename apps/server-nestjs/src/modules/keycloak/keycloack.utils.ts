import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation'
import type { ProjectWithDetails } from './keycloak-datastore.service'

export function isMember(project: ProjectWithDetails, member: UserRepresentation) {
  return project.members.some(m => m.user.id === member.id) || project.ownerId === member.id
}
