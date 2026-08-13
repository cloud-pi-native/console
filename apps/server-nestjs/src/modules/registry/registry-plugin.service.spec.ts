import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { harborConfigFactory } from '../../config/harbor.config'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { makeProjectWithDetails } from '../project/project-testing.utils'
import { VaultClientService } from '../vault/vault-client.service'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { RegistryPluginService } from './registry-plugin.service'

describe('registryPluginService', () => {
  let service: RegistryPluginService
  let datastore: DeepMockProxy<RegistryDatastoreService>
  let registryClient: DeepMockProxy<RegistryClientService>
  let vault: DeepMockProxy<VaultClientService>
  let harborConfig: DeepMockProxy<ConfigType<typeof harborConfigFactory>>
  let cache: { get: ReturnType<typeof vi.fn>, set: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    harborConfig = mockDeep<ConfigType<typeof harborConfigFactory>>({
      url: 'https://harbor.example',
      internalUrl: undefined,
      admin: 'admin',
      adminPassword: 'password',
      ruleTemplate: undefined,
      ruleCount: undefined,
      retentionCron: '0 22 2 * * *',
      robotRotationThresholdDays: 90,
      projectSlugCacheTtlMs: 300000,
    })
    datastore = mockDeep<RegistryDatastoreService>({
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
    })
    registryClient = mockDeep<RegistryClientService>({
      getProjectByName: vi.fn().mockResolvedValue({ status: 200, data: { project_id: 123 } }),
    })
    vault = mockDeep<VaultClientService>({
      readRegistrySecrets: vi.fn().mockResolvedValue({}),
    })
    cache = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        RegistryPluginService,
        { provide: VaultClientService, useValue: vault },
        { provide: RegistryDatastoreService, useValue: datastore },
        { provide: RegistryClientService, useValue: registryClient },
        { provide: harborConfigFactory.KEY, useValue: harborConfig },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile()

    service = moduleRef.get(RegistryPluginService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('secrets', () => {
    const baseProject = makeProjectWithDetails({ slug: 'test-project' })

    it('returns the raw group unchanged when it is empty', async () => {
      datastore.getProject.mockResolvedValue(baseProject)

      const result = await service.secrets('test-project-id')

      expect(result).toEqual({})
    })
  })

  describe('infos', () => {
    const baseProject = makeProjectWithDetails({ slug: 'dulei' })

    it('should expose the legacy project url', async () => {
      datastore.getProject.mockResolvedValue(baseProject)

      const infos = await service.infos('test-project-id')
      const params = makeToUrlParams({ project: { id: '', name: '', slug: 'dulei' }, store: {}, clusters: [], zones: [], environments: [] })
      const url = infos.to(params)

      expect(url).toBe('https://harbor.example/harbor/projects/123/')
    })
  })
})
