import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { RegistryClientService } from './registry-client.service'
import { RegistryHttpClientService } from './registry-http-client.service'

const vaultMock = mockDeep<VaultClientService>()

function createRegistryServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      RegistryClientService,
      RegistryHttpClientService,
      {
        provide: VaultClientService,
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
