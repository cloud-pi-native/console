import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation'
import type { ProjectWithDetails } from './keycloak-datastore.service'
import { ENABLED } from '@cpn-console/shared'
import { CONSOLE_GROUP_NAME, PLUGIN_NAME, SUSPENDED_PLUGIN_KEY } from './keycloak.constants'

type With<T, K extends keyof T> = T & Required<Pick<T, K>>
export type GroupRepresentationWith<T extends keyof GroupRepresentation> = With<GroupRepresentation, T>

export function isSuspended(project: ProjectWithDetails): boolean {
  return project.plugins?.some(p => p.pluginName === PLUGIN_NAME && p.key === SUSPENDED_PLUGIN_KEY && p.value === ENABLED) ?? false
}

export function isMember(project: ProjectWithDetails, member: UserRepresentation): boolean {
  return project.members.some(m => m.user.id === member.id) || project.ownerId === member.id
}

export function isNonEmptyGroupPath(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function normalizeGroupPath(value: unknown): string | undefined {
  if (!isNonEmptyGroupPath(value)) return undefined
  const trimmed = value.trim()
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function isOwnedProjectGroup(group: GroupRepresentationWith<'subGroups'>): boolean {
  return !!group.subGroups.some(sg => sg.name === CONSOLE_GROUP_NAME)
}
