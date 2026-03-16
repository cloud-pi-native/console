import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { describe, beforeEach, it, expect } from 'vitest'

import { ApplicationInitializationService } from './application-initialization.service'
import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'
import { PluginManagementService } from '../plugin-management/plugin-management.service'
import { DatabaseInitializationService } from '../database-initialization/database-initialization.service'
import { DatabaseService } from '@/cpin-module/infrastructure/database/database.service'
import { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'

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
        {
          provide: PrismaService,
          useValue: {},
        },
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
