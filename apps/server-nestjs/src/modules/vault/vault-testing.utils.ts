import type { VaultSecret } from './vault-client.service.js'
import type { ProjectWithDetails } from './vault-datastore.service'
import { faker } from '@faker-js/faker'

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(`test-project-${faker.string.uuid()}`),
    name: faker.company.name(),
    description: faker.company.buzzPhrase(),
    environments: [],
    plugins: [],
    ...overrides,
  } satisfies ProjectWithDetails
}

export function makeVaultSecret(overrides: Partial<VaultSecret> = {}): VaultSecret {
  return {
    data: {},
    metadata: makeVaultSecretMetadata(),
    ...overrides,
  } satisfies VaultSecret
}

export function makeVaultSecretMetadata(overrides: Partial<VaultSecret['metadata']> = {}): VaultSecret['metadata'] {
  return {
    created_time: faker.date.past().toISOString(),
    custom_metadata: null,
    deletion_time: '',
    destroyed: false,
    version: 1,
    ...overrides,
  }
}
