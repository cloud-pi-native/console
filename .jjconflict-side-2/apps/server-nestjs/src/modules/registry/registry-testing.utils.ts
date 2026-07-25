import type { ProjectWithDetails } from './registry-datastore.service'
import type { RegistryResponse } from './registry-http-client.service'
import { faker } from '@faker-js/faker'
import { HttpStatus } from '@nestjs/common'

export function makeOkResponse<T>(data: T): RegistryResponse<T> {
  return { status: HttpStatus.OK, data }
}

export function makeCreatedResponse<T>(data: T): RegistryResponse<T> {
  return { status: HttpStatus.CREATED, data }
}

export function makeNoContent(): RegistryResponse<null> {
  return { status: HttpStatus.NO_CONTENT, data: null }
}

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}) {
  return {
    slug: faker.helpers.slugify(`test-project-${faker.string.uuid()}`),
    plugins: [],
    ...overrides,
  } satisfies ProjectWithDetails
}
