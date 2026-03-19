import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { NexusService } from './nexus.service'

function createNexusServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      NexusService,
      {
        provide: ConfigurationService,
        useValue: {
          nexusSecretExposedUrl: 'https://nexus.example',
          projectRootPath: 'forge',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('nexusService', () => {
  let service: NexusService

  beforeEach(async () => {
    const module: TestingModule = await createNexusServiceTestingModule().compile()
    service = module.get(NexusService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
