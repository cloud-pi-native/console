import { faker } from '@faker-js/faker'
import type { ProjectWithDetails } from './nexus-datastore.service'

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  return {
    slug: faker.internet.domainWord(),
    owner: {
      email: faker.internet.email(),
    },
    plugins: [],
    ...overrides,
  } satisfies ProjectWithDetails
}
