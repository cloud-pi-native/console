import type { VaultMetadata, VaultSecret } from '../vault/vault-client.service'
import type { ProjectSlug } from './project-secrets-queries.utils'
import { faker } from '@faker-js/faker'

export function makeVaultSecret<T extends Record<string, unknown> = Record<string, unknown>>(overrides: Partial<VaultSecret<T>> = {}): VaultSecret<T> {
  return {
    data: {} as T,
    metadata: makeVaultMetadata(),
    ...overrides,
  } satisfies VaultSecret<T>
}

export function makeProjectSlug(overrides: Partial<{ slug: string }> = {}): ProjectSlug {
  const slug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)
  return {
    slug,
    ...overrides,
  } satisfies ProjectSlug
}

export interface AdminPluginConfig {
  pluginName: string
  key: string
  value: string
}

export function makeAdminPlugin(overrides: Partial<AdminPluginConfig> = {}): AdminPluginConfig {
  return {
    pluginName: faker.lorem.word(),
    key: faker.lorem.word(),
    value: 'enabled',
    ...overrides,
  }
}

function makeVaultMetadata(overrides: Partial<VaultMetadata> = {}): VaultMetadata {
  return {
    created_time: faker.date.past().toISOString(),
    custom_metadata: null,
    deletion_time: '',
    destroyed: false,
    version: 1,
    ...overrides,
  } satisfies VaultMetadata
}
