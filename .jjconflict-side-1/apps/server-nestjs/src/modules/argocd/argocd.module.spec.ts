import { ConditionalModule, ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { argocdConfigFactory } from '../../config/argocd.config'
import { ArgoCDModule } from './argocd.module'
import { ArgoCDService } from './argocd.service'

describe('argocdModule', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('omits ArgoCDService when USE_GITLAB=false', async () => {
    vi.stubEnv('USE_GITLAB', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(ArgoCDModule.forRoot(argocdConfigFactory.asProvider()), 'USE_GITLAB')],
    }).compile()
    expect(() => module.get(ArgoCDService)).toThrow()
  })

  it('omits ArgoCDService when USE_VAULT=false', async () => {
    vi.stubEnv('USE_VAULT', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(ArgoCDModule.forRoot(argocdConfigFactory.asProvider()), 'USE_VAULT')],
    }).compile()
    expect(() => module.get(ArgoCDService)).toThrow()
  })
})
