import { describe, it, expect, beforeEach } from 'vitest'
import { RegistryService } from './registry.service'
import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { RegistryClientService } from './registry-client.service'
import { VaultService } from '../vault/vault.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'

const registryClientMock = mockDeep<RegistryClientService>()
const vaultMock = mockDeep<VaultService>()

function createRegistryServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      RegistryService,
      {
        provide: RegistryClientService,
        useValue: registryClientMock,
      },
      {
        provide: VaultService,
        useValue: vaultMock,
      },
      {
        provide: ConfigurationService,
        useValue: {
          harborUrl: 'https://harbor.example',
          harborInternalUrl: 'https://harbor.example',
          harborAdmin: 'admin',
          harborAdminPassword: 'password',
          harborRuleTemplate: 'latestPushedK',
          harborRuleCount: '10',
          harborRetentionCron: '0 22 2 * * *',
          projectRootPath: 'forge',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('registryService', () => {
  let service: RegistryService

  beforeEach(async () => {
    mockReset(registryClientMock)
    mockReset(vaultMock)
    const module: TestingModule = await createRegistryServiceTestingModule().compile()
    service = module.get(RegistryService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
