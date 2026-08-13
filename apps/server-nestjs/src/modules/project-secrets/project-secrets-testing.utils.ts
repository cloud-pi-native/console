import type { Project } from '@prisma/client'
import type { VaultMetadata, VaultSecret } from '../vault/vault-client.service'
import type { AdminPlugin, ProjectPlugins } from './project-secrets-queries.utils'
import { faker } from '@faker-js/faker'

export function makeVaultSecret<T extends Record<string, unknown> = Record<string, unknown>>(overrides: Partial<VaultSecret<T>> = {}): VaultSecret<T> {
  return {
    data: {} as T,
    metadata: makeVaultMetadata(),
    ...overrides,
  } satisfies VaultSecret<T>
}

export function makeProject(overrides: Partial<Project> & Partial<ProjectPlugins> = {}): Project & Partial<ProjectPlugins> {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: '',
    status: 'initializing',
    locked: false,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    everyonePerms: 896n,
    ownerId: faker.string.uuid(),
    slug: faker.helpers.slugify(faker.company.name()),
    limitless: true,
    hprodCpu: 0,
    hprodGpu: 0,
    hprodMemory: 0,
    prodCpu: 0,
    prodGpu: 0,
    prodMemory: 0,
    lastSuccessProvisionningVersion: null,
    ...overrides,
  }
}

export function makeAdminPlugin(overrides: Partial<AdminPlugin> = {}): AdminPlugin {
  return {
    pluginName: faker.lorem.word(),
    key: faker.lorem.word(),
    value: 'enabled',
    ...overrides,
  } satisfies AdminPlugin
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
