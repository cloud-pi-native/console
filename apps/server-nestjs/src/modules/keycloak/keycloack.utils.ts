import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation'
import type { ProjectWithDetails } from './keycloak-datastore.service'

export function getPluginConfig(project: ProjectWithDetails, pluginName: string, key: string) {
  return project.plugins?.find(p => p.pluginName === pluginName && p.key === key)?.value
}

export function isMember(project: ProjectWithDetails, member: UserRepresentation) {
  return project.members.some(m => m.user.id === member.id) || project.ownerId === member.id
}
