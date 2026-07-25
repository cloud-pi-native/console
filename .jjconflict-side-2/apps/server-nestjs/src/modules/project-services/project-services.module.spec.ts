import { ConditionalModule, ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectServicesModule } from './project-services.module'
import { ProjectServicesService } from './project-services.service'

describe('projectServicesModule', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('omits ProjectServicesService when USE_PLUGINS=false', async () => {
    vi.stubEnv('USE_PLUGINS', 'false')
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ConditionalModule.registerWhen(ProjectServicesModule, 'USE_PLUGINS')],
    }).compile()
    expect(() => module.get(ProjectServicesService)).toThrow()
  })
})
