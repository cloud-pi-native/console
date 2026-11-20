import type { AdminRoleEventPayload, ZoneEventPayload } from './app-events.service'
import { faker } from '@faker-js/faker'

export function makeZoneEventPayload(overrides: { id?: string } = {}): ZoneEventPayload {
  return {
    id: overrides.id ?? faker.string.uuid(),
  }
}

export function makeAdminRoleEventPayload(overrides: { id?: string } = {}): AdminRoleEventPayload {
  return {
    id: overrides.id ?? faker.string.uuid(),
  }
}
