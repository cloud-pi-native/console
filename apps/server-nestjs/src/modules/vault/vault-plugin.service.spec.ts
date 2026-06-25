import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { vaultConfigFactory } from '../../config/vault.config'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { VaultPluginService } from './vault-plugin.service'

describe('vaultPluginService', () => {
  let service: VaultPluginService
  let config: DeepMockProxy<ConfigType<typeof vaultConfigFactory>>

  beforeEach(async () => {
    config = mockDeep<ConfigType<typeof vaultConfigFactory>>({
      url: 'https://vault.public/',
      internalUrl: 'https://vault.internal/',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        VaultPluginService,
        { provide: vaultConfigFactory.KEY, useValue: config },
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
