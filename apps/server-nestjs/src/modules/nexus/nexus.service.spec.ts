import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { describe, it, expect, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { NexusService } from './nexus.service'
import { NexusClientService } from './nexus-client.service'
import { VaultService } from '../vault/vault.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'

const nexusClientMock = mockDeep<NexusClientService>()
const vaultMock = mockDeep<VaultService>()

function createNexusServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      NexusService,
      {
        provide: NexusClientService,
        useValue: nexusClientMock,
      },
      {
        provide: VaultService,
        useValue: vaultMock,
      },
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
    mockReset(nexusClientMock)
    mockReset(vaultMock)
    const module: TestingModule = await createNexusServiceTestingModule().compile()
    service = module.get(NexusService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
