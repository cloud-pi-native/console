import type { AdminRole, User } from '@prisma/client'
import { faker } from '@faker-js/faker'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    type: 'human',
    adminRoleIds: [],
    lastLogin: faker.date.past(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  } satisfies User
}

export function makeAdminRole(overrides: Partial<AdminRole> = {}): AdminRole {
  return {
    id: faker.string.uuid(),
    name: faker.helpers.slugify(faker.word.sample(3)).toLowerCase(),
    permissions: 0n,
    position: faker.number.int({ min: 0, max: 100 }),
    oidcGroup: '',
    type: 'managed',
    ...overrides,
  } satisfies AdminRole
}
