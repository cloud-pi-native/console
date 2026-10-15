import type { AdminRoleEventMember, AdminRoleEventPayload, ZoneEventPayload } from './app-events.service'
import { faker } from '@faker-js/faker'

export function makeZoneEventPayload(overrides: { id?: string, slug?: string } = {}): ZoneEventPayload {
  return {
    id: overrides.id ?? faker.string.uuid(),
    slug: overrides.slug ?? faker.helpers.slugify(faker.string.alphanumeric(10)),
  }
}

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
