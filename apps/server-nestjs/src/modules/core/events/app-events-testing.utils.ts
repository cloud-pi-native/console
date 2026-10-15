import type { AdminRoleEventMember, AdminRoleEventPayload } from './app-events.service'
import { faker } from '@faker-js/faker'

export function makeAdminRoleEventMember(overrides: { id?: string, email?: string, firstName?: string, lastName?: string } = {}): AdminRoleEventMember {
  return {
    id: overrides.id ?? faker.string.uuid(),
    email: overrides.email ?? faker.internet.email(),
    firstName: overrides.firstName ?? faker.person.firstName(),
    lastName: overrides.lastName ?? faker.person.lastName(),
  }
}

export function makeAdminRoleEventPayload(overrides: { id?: string, oidcGroup?: string | null, members?: AdminRoleEventMember[] } = {}): AdminRoleEventPayload {
  return {
    id: overrides.id ?? faker.string.uuid(),
    oidcGroup: overrides.oidcGroup ?? null,
    members: overrides.members ?? [makeAdminRoleEventMember()],
  }
}
