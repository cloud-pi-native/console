import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { DatabaseInitializationService } from './database-initialization.service'

describe('databaseInitializationService', () => {
  let service: DatabaseInitializationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseInitializationService,
        PrismaService,
      ],
    }).compile()

    service = module.get<DatabaseInitializationService>(
      DatabaseInitializationService,
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
