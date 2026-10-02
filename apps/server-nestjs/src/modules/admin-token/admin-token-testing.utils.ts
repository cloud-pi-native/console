import type { AdminToken } from './admin-token-queries.utils'
import { faker } from '@faker-js/faker'

export function makeAdminTokenOwner(overrides: Partial<AdminToken['owner']> = {}): AdminToken['owner'] {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    type: 'bot',
    ...overrides,
  }
}

export function makeAdminToken(overrides: Partial<Omit<AdminToken, 'owner'>> & { owner?: AdminToken['owner'] } = {}) {
  const owner = overrides.owner ?? makeAdminTokenOwner()
  return {
    id: faker.string.uuid(),
    name: 'my-token',
    permissions: 4n,
    lastUse: null,
    expirationDate: null,
    status: 'active',
    createdAt: faker.date.past(),
    userId: owner.id,
    owner,
    ...overrides,
  }
}

export type AdminTokenRow = AdminToken & { hash: string }

export function makeAdminTokenRow(overrides: Partial<Omit<AdminToken, 'owner'>> = {}): AdminTokenRow {
  return { ...makeAdminToken(overrides), hash: faker.string.hexadecimal({ length: 64 }) }
}
