import type { TestingModule } from '@nestjs/testing'
import type { BaseConfig } from '../config/base.config'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { BASE_CONFIG } from '../../infrastructure/config/base.config'
import { DatabaseService } from './database.service'
import { PrismaService } from './prisma.service'

describe('databaseService', () => {
  let service: DatabaseService

  beforeEach(async () => {
    const baseConfig = mockDeep<BaseConfig>()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        { provide: BASE_CONFIG, useValue: baseConfig },
      ],
    }).compile()

    service = module.get<DatabaseService>(DatabaseService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
