import { ConditionalModule, ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArgoCDModule } from './argocd.module'
import { ArgoCDService } from './argocd.service'

describe('argocdModule', () => {
  beforeEach(() => {
    vi.stubEnv('PROJECTS_ROOT_DIR', 'tmp/projects')
    vi.stubEnv('VAULT_URL', 'https://vault.example')
    vi.stubEnv('VAULT_INTERNAL_URL', 'https://vault.internal')
    vi.stubEnv('VAULT_TOKEN', 'token')
    vi.stubEnv('ARGOCD_URL', 'https://argocd.example')
    vi.stubEnv('ARGOCD_INTERNAL_URL', 'https://argocd.internal')
    vi.stubEnv('ARGOCD_EXTRA_REPOSITORIES', 'repo')
    vi.stubEnv('GITLAB_URL', 'https://gitlab.example')
    vi.stubEnv('GITLAB_INTERNAL_URL', 'https://gitlab.internal')
    vi.stubEnv('GITLAB_TOKEN', 'token')
  })

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
