import { faker } from '@faker-js/faker'

export function makeMockUser(overrides: Partial<{
  id: string
  firstName: string
  lastName: string
  email: string
  createdAt: Date
  updatedAt: Date
  lastLogin: Date | null
  adminRoleIds: string[]
  type: 'human' | 'bot' | 'ghost'
}> = {}) {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null,
    adminRoleIds: [],
    type: 'human' as const,
    ...overrides,
  }
}

export function makeMockAdminRole(overrides: Partial<{
  id: string
  name: string
  permissions: bigint
  position: number
  oidcGroup: string
  type: string
}> = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(2),
    permissions: 1n,
    position: 0,
    oidcGroup: '',
    type: 'managed',
    ...overrides,
  }
}
