import type { AdminTokenRecord } from './admin-token-queries.utils'
import { faker } from '@faker-js/faker'

export function makeAdminTokenRecord(overrides: Partial<Omit<AdminTokenRecord, 'owner'>> = {}) {
  const owner: AdminTokenRecord['owner'] = {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    type: 'bot',
  }
  const record: AdminTokenRecord = {
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
  // (hash included) while AdminTokenRecord is the selected payload; spread both.
  return { ...record, hash: faker.string.hexadecimal({ length: 64 }), ...overrides }
}

export function makeListedToken(overrides: Partial<AdminTokenRecord> = {}): AdminTokenRecord {
  const { hash: _hash, ...listed } = makeAdminTokenRecord()
  return { ...listed, ...overrides }
}
