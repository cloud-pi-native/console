import type { ProjectWithDetails } from './registry-datastore.service'
import type { RegistryResponse } from './registry-http-client.service.js'
import { faker } from '@faker-js/faker'

export function makeOkResponse<T>(data: T): RegistryResponse<T> {
  return { status: 200, data }
}

export function makeCreatedResponse<T>(data: T): RegistryResponse<T> {
  return { status: 201, data }
}

export function makeNoContent(): RegistryResponse<null> {
  return { status: 204, data: null }
}

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}) {
  return {
    slug: faker.helpers.slugify(`test-project-${faker.string.uuid()}`),
    plugins: [],
    ...overrides,
  } satisfies ProjectWithDetails
}
