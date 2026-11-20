import type { ConfigType } from '@nestjs/config'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { baseConfigFactory } from '../../../config/base.config'
import { DatabaseService } from './database.service'
import { PrismaService } from './prisma.service'

describe('databaseService', () => {
  let service: DatabaseService

  beforeEach(async () => {
    const baseConfig = mockDeep<ConfigType<typeof baseConfigFactory>>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        { provide: baseConfigFactory.KEY, useValue: baseConfig },
      ],
    }).compile()

    service = module.get<DatabaseService>(DatabaseService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
