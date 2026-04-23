import type { ProjectWithDetails } from './vault-datastore.service'
import { faker } from '@faker-js/faker'

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(`test-project-${faker.string.uuid()}`),
    name: faker.company.name(),
    description: '',
    environments: [],
    ...overrides,
  } satisfies ProjectWithDetails
}
