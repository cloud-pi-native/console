import { describe, it, expect, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { RegistryClientService } from './registry-client.service'
import { VaultService } from '../vault/vault.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'

const vaultMock = mockDeep<VaultService>()

function createRegistryServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      RegistryClientService,
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
  let service: RegistryClientService

  beforeEach(async () => {
    mockReset(vaultMock)
    const module: TestingModule = await createRegistryServiceTestingModule().compile()
    service = module.get(RegistryClientService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
