import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfigurationModule } from '../configuration/configuration.module'
import { DatabaseService } from './database.service'
import { PrismaService } from './prisma.service'

describe('databaseService', () => {
  let service: DatabaseService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [
        DatabaseService,
        {
          provide: PrismaService,
          useValue: {
            $connect: vi.fn().mockResolvedValue(undefined),
            $disconnect: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile()

    service = module.get<DatabaseService>(DatabaseService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
