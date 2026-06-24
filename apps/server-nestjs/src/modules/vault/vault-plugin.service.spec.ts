import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { VaultPluginService } from './vault-plugin.service'

describe('vaultPluginService', () => {
  let service: VaultPluginService
  let config: DeepMockProxy<ConfigurationService>

  beforeEach(async () => {
    config = mockDeep<ConfigurationService>({
      vaultUrl: 'https://vault.public/',
      vaultInternalUrl: 'https://vault.internal/',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        VaultPluginService,
        { provide: ConfigurationService, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(VaultPluginService)
  })

  it('returns the public Vault url', () => {
    const infos = service.infos()
    const url = infos.to?.(makeToUrlParams())

    expect(url).toBe('https://vault.public/ui/vault/secrets/dulei')
  })
})
