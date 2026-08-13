import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { nexusConfigFactory } from '../../config/nexus.config'
import { makeProjectWithDetails } from '../project/project-testing.utils'
import { VaultClientService } from '../vault/vault-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { NexusPluginService } from './nexus-plugin.service'

describe('nexusPluginService', () => {
  let service: DeepMockProxy<NexusPluginService>
  let config: DeepMockProxy<ConfigType<typeof nexusConfigFactory>>
  let datastore: DeepMockProxy<NexusDatastoreService>
  let vault: DeepMockProxy<VaultClientService>

  beforeEach(async () => {
    config = mockDeep<ConfigType<typeof nexusConfigFactory>>({
      url: 'https://nexus.example.com',
      internalUrl: 'https://nexus.internal',
      admin: 'admin',
      adminPassword: 'password',
      secretExposeInternalUrl: false,
    })
    datastore = mockDeep<NexusDatastoreService>({
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
      getProject: vi.fn().mockResolvedValue(makeProjectWithDetails({ id: 'test-project-id', name: 'test-project', slug: 'test-project', description: 'Test' })),
    })
    vault = mockDeep<VaultClientService>()

    const moduleRef = await Test.createTestingModule({
      providers: [
        NexusPluginService,
        { provide: VaultClientService, useValue: vault },
        { provide: NexusDatastoreService, useValue: datastore },
        { provide: nexusConfigFactory.KEY, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(NexusPluginService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('secrets', () => {
    it('returns an empty object when the secret group is empty', async () => {
      const result = await service.secrets('test-project-id')
      expect(result).toEqual({})
    })
  })

  describe('infos', () => {
    it('uses the admin config keys', async () => {
      datastore.getAdminPluginConfig.mockResolvedValue('global-value')
      datastore.getProject.mockResolvedValue(makeProjectWithDetails({ id: 'test-project-id', name: 'test-project', slug: 'test-project', description: 'Test' }))

      const result = await service.secrets('test-project-id')

      expect(result).toEqual({})
    })

    it('should expose the nexus config url', () => {
      const infos = service.infos()
      const url = infos.to({ project: { id: '', name: '', slug: '' }, store: {}, clusters: [], zones: [], environments: [] })

      expect(url).toBe('https://nexus.example.com')
    })
  })
})
