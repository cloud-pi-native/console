import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { ConfigurationModule } from '../../infrastructure/configuration/configuration.module'
import { DatabaseService } from '../../infrastructure/database/database.service'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { DatabaseInitializationService } from '../database-initialization/database-initialization.service'
import { PluginManagementService } from '../plugin-management/plugin-management.service'
import { ApplicationInitializationService } from './application-initialization.service'

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
