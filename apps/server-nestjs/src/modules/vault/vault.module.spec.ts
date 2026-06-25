import { ConditionalModule, ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { baseConfigFactory } from '../../config/base'
import { vaultConfigFactory } from '../../config/vault'
import { VaultPluginService } from './vault-plugin.service'
import { VaultModule } from './vault.module'

describe('vaultModule (conditional registration)', () => {
  const originalUseVault = process.env.USE_VAULT

  afterEach(() => {
    if (originalUseVault === undefined) delete process.env.USE_VAULT
    else process.env.USE_VAULT = originalUseVault
  })

  it('omits VaultPluginService when USE_VAULT=false', async () => {
    process.env.USE_VAULT = 'false'
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [baseConfigFactory, vaultConfigFactory] }),
        ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
      ],
    }).compile()
    expect(() => module.get(VaultPluginService)).toThrow()
  })
})
