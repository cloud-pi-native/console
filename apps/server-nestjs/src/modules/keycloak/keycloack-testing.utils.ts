import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation'
import type { ProjectWithDetails } from './keycloak-datastore.service'

import { faker } from '@faker-js/faker'

export function makeUserRepresentation(
  overrides: Partial<UserRepresentation> = {},
) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    username: faker.internet.username(),
    enabled: true,
    ...overrides,
  } satisfies UserRepresentation
}

export function makeGroupRepresentation(
  overrides: Partial<GroupRepresentation> = {},
) {
  return {
    id: faker.string.uuid(),
    name: faker.word.noun(),
    path: `/${faker.word.noun()}`,
    subGroups: [],
    ...overrides,
  } satisfies GroupRepresentation
}

export function makeProjectUser(
  overrides: Partial<ProjectWithDetails['members'][number]['user']> = {},
) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    ...overrides,
  } satisfies ProjectWithDetails['members'][number]['user']
}

export function makeProjectMember(
  overrides: Partial<ProjectWithDetails['members'][number]> = {},
) {
  return {
    roleIds: [],
    user: makeProjectUser(),
    ...overrides,
  } satisfies ProjectWithDetails['members'][number]
}

export function makeProjectRole(
  overrides: Partial<ProjectWithDetails['roles'][number]> = {},
) {
  return {
    id: faker.string.uuid(),
    permissions: 0n,
    oidcGroup: '',
    type: 'managed',
    ...overrides,
  } satisfies ProjectWithDetails['roles'][number]
}

export function makeProjectEnvironment(
  overrides: Partial<ProjectWithDetails['environments'][number]> = {},
) {
  return {
    id: faker.string.uuid(),
    name: faker.word.noun(),
    ...overrides,
  } satisfies ProjectWithDetails['environments'][number]
}

export function makeProjectWithDetails(
  overrides: Partial<ProjectWithDetails> = {},
) {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(faker.word.words({ count: 2 })).toLowerCase(),
    ownerId: faker.string.uuid(),
    everyonePerms: 0n,
    members: [],
    roles: [],
    environments: [],
    ...overrides,
  } satisfies ProjectWithDetails
}
