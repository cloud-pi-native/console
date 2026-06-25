import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PluginModule } from './plugin.module'
import { PluginService } from './plugin.service'

describe('pluginModule', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('resolves PluginService with all plugins enabled', async () => {
    vi.stubEnv('USE_ARGOCD', 'true')
    vi.stubEnv('USE_GITLAB', 'true')
    vi.stubEnv('USE_HARBOR', 'true')
    vi.stubEnv('USE_NEXUS', 'true')
    vi.stubEnv('USE_SONARQUBE', 'true')
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        PluginModule,
      ],
    }).compile()
    const service = module.get(PluginService)
    expect(service).toBeInstanceOf(PluginService)
  })
})
