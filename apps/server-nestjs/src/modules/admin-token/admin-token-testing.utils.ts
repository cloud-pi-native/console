import type { AdminToken } from './admin-token-queries.utils'
import { faker } from '@faker-js/faker'

export function makeAdminToken(overrides: Partial<Omit<AdminToken, 'owner'>> = {}) {
  const owner: AdminToken['owner'] = {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    type: 'bot',
  }
  const record: AdminToken = {
    id: faker.string.uuid(),
    name: 'my-token',
    permissions: 4n,
    lastUse: null,
    expirationDate: null,
    status: 'active',
    createdAt: faker.date.past(),
    userId: owner.id,
    owner,
  }
  return { ...record, ...overrides }
}

export function makeAdminTokenRow(overrides: Partial<Omit<AdminToken, 'owner'>> = {}) {
  return { ...makeAdminToken(overrides), hash: faker.string.hexadecimal({ length: 64 }) }
}
