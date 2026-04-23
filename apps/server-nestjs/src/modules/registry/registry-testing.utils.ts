import type { VaultMetadata, VaultSecret } from '../vault/vault-client.service.js'
import type { ProjectWithDetails } from './registry-datastore.service'
import type { RegistryResponse } from './registry-http-client.service.js'

export function makeOkResponse<T>(data: T): RegistryResponse<T> {
  return { status: 200, data }
}

export function makeCreatedResponse<T>(data: T): RegistryResponse<T> {
  return { status: 201, data }
}

export function makeNoContent(): RegistryResponse<null> {
  return { status: 204, data: null }
}

export function makeVaultSecret<T>(data: T): VaultSecret<T> {
  const metadata: VaultMetadata = {
    created_time: new Date().toISOString(),
    custom_metadata: null,
    deletion_time: '',
    destroyed: false,
    version: 1,
  }
  return { data, metadata }
}

export function makeProjectWithDetails(input: { slug: string, plugins?: Array<{ key: string, value: string }> }) {
  return {
    slug: input.slug,
    plugins: input.plugins ?? [],
  } as unknown as ProjectWithDetails
}
