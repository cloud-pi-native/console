import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { NexusClientService } from './nexus-client.service'

function createNexusServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      NexusClientService,
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

describe('nexusClientService', () => {
  let service: NexusClientService

  beforeEach(async () => {
    const module: TestingModule = await createNexusServiceTestingModule().compile()
    service = module.get(NexusClientService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
