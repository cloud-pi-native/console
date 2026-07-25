import { ConditionalModule, ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArgoCDModule } from './argocd.module'
import { ArgoCDService } from './argocd.service'

describe('argocdModule', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('registers ArgoCDService when USE_ARGOCD=true', async () => {
    vi.stubEnv('USE_ARGOCD', 'true')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(ArgoCDModule, 'USE_ARGOCD')],
    }).compile()
    expect(module.get(ArgoCDService)).toBeInstanceOf(ArgoCDService)
  })

  it('omits ArgoCDService when USE_ARGOCD=false', async () => {
    vi.stubEnv('USE_ARGOCD', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(ArgoCDModule, 'USE_ARGOCD')],
    }).compile()
    expect(() => module.get(ArgoCDService)).toThrow()
  })
})
