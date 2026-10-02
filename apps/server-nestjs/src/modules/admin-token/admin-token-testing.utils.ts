import type { AdminTokenRecord } from './admin-token-queries.utils'
import { faker } from '@faker-js/faker'

export function makeAdminTokenOwner(overrides: Partial<AdminTokenRecord['owner']> = {}): AdminTokenRecord['owner'] {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    type: 'bot',
    ...overrides,
  }
}

export function makeAdminTokenRecord(overrides: Partial<Omit<AdminTokenRecord, 'owner'>> & { owner?: AdminTokenRecord['owner'] } = {}): AdminTokenRecord {
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

export type AdminTokenRow = AdminTokenRecord & { hash: string }

export function makeAdminTokenRow(overrides: Partial<Omit<AdminTokenRecord, 'owner'>> = {}): AdminTokenRow {
  return { ...makeAdminTokenRecord(overrides), hash: faker.string.hexadecimal({ length: 64 }) }
}
