import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { vaultConfigFactory } from '../../config/vault.config'
import { VaultClientService } from '../vault/vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { VaultPluginService } from './vault-plugin.service'

describe('vaultPluginService', () => {
  let service: DeepMockProxy<VaultPluginService>
  let config: DeepMockProxy<ConfigType<typeof vaultConfigFactory>>
  let datastore: DeepMockProxy<VaultDatastoreService>
  let vault: DeepMockProxy<VaultClientService>

  beforeEach(async () => {
    config = mockDeep<ConfigType<typeof vaultConfigFactory>>({
      url: 'https://vault.example.com',
      token: 'test-token',
      internalUrl: undefined,
      kvName: 'forge-dso',
    })
    datastore = mockDeep<VaultDatastoreService>({
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
    })
    vault = mockDeep<VaultClientService>()

    const moduleRef = await Test.createTestingModule({
      providers: [
        VaultPluginService,
        { provide: VaultClientService, useValue: vault },
        { provide: VaultDatastoreService, useValue: datastore },
        { provide: vaultConfigFactory.KEY, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(VaultPluginService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('infos', () => {
    it('should expose the vault secrets url', () => {
      const infos = service.infos()
      const url = infos.to({ project: { id: '', name: '', slug: 'test-project' }, store: {}, clusters: [], zones: [], environments: [] })

      expect(url).toBe('https://vault.example.com/ui/vault/secrets/test-project')
    })
  })
})
