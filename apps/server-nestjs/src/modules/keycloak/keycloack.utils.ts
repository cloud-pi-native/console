import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation'
import type { ProjectWithDetails } from './keycloak-datastore.service'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'

export type GroupRepresentationWith<T extends keyof GroupRepresentation> = GroupRepresentation & Required<Pick<GroupRepresentation, T>>

export function isMember(project: ProjectWithDetails, member: UserRepresentation) {
  return project.members.some(m => m.user.id === member.id) || project.ownerId === member.id
}

export async function* map<T, U>(
  iterable: AsyncIterable<T>,
  mapper: (value: T, index: number) => U | Promise<U>,
): AsyncIterable<U> {
  let index = 0
  for await (const value of iterable) {
    yield await mapper(value, index++)
  }
}

export async function getAll<T>(
  iterable: AsyncIterable<T>,
): Promise<T[]> {
  const items: T[] = []
  for await (const item of iterable) {
    items.push(item)
  }
  return items
}
