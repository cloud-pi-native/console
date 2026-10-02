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
  // DeepMockProxy resolves mockResolvedValue against the FULL prisma row
  // (hash included) while AdminToken is the selected payload; spread both.
  return { ...record, hash: faker.string.hexadecimal({ length: 64 }), ...overrides }
}

export function makeListedToken(overrides: Partial<AdminToken> = {}): AdminToken {
  const { hash: _hash, ...listed } = makeAdminToken()
  return { ...listed, ...overrides }
}
