import { ConditionalModule, ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectSecretsModule } from './project-secrets.module'
import { ProjectSecretsService } from './project-secrets.service'

describe('projectSecretsModule', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('omits ProjectSecretsService when USE_VAULT=false', async () => {
    vi.stubEnv('USE_VAULT', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(ProjectSecretsModule, 'USE_VAULT')],
    }).compile()
    expect(() => module.get(ProjectSecretsService)).toThrow()
  })
})
