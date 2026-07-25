import type { DeepMockProxy } from 'vitest-mock-extended'
import type { VaultConfig } from './vault.module-definition'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { VaultPluginService } from './vault-plugin.service'
import { VAULT_CONFIG } from './vault.module-definition'

describe('vaultPluginService', () => {
  let service: VaultPluginService
  let config: DeepMockProxy<VaultConfig>

  beforeEach(async () => {
    config = mockDeep<VaultConfig>({
      url: 'https://vault.public/',
      internalUrl: 'https://vault.internal/',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        VaultPluginService,
        { provide: VAULT_CONFIG, useValue: config },
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
