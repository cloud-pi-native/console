import type { ProjectWithDetails } from './nexus-datastore.service'
import { faker } from '@faker-js/faker'

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  return {
    slug: faker.internet.domainWord(),
    owner: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
    },
    plugins: [],
    ...overrides,
  } satisfies ProjectWithDetails
}

export function makeRepoName() {
  return faker.string.alphanumeric(8).toLowerCase()
}

export function makeRoleId() {
  return faker.string.alphanumeric(12).toLowerCase()
}

export function makeUserId() {
  return faker.string.alphanumeric(10).toLowerCase()
}

export function makePrivilegeName() {
  return faker.string.alphanumeric(12).toLowerCase()
}

export function makeNexusUser() {
  return {
    userId: faker.internet.username(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    emailAddress: faker.internet.email(),
    password: faker.internet.password(),
    status: 'active',
    roles: [],
  }
}
