import type { VaultMetadata, VaultSecret } from '../../plugins/vault/vault-client.service'
import { faker } from '@faker-js/faker'

export function makeVaultSecret<T extends Record<string, unknown> = Record<string, unknown>>(overrides: Partial<VaultSecret<T>> = {}): VaultSecret<T> {
  return {
    data: {} as T,
    metadata: makeVaultMetadata(),
    ...overrides,
  } satisfies VaultSecret<T>
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
