import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { ApplicationInitializationService } from './application-initialization.service'
import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'
import { PluginManagementService } from '../plugin-management/plugin-management.service'
import { DatabaseInitializationService } from '../database-initialization/database-initialization.service'
import { DatabaseService } from '@/cpin-module/infrastructure/database/database.service'

describe('applicationInitializationServiceService', () => {
  let service: ApplicationInitializationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [
        ApplicationInitializationService,
        PluginManagementService,
        DatabaseInitializationService,
        DatabaseService,
      ],
    }).compile()

    service = module.get<ApplicationInitializationService>(
      ApplicationInitializationService,
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
