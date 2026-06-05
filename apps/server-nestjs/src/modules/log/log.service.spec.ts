import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { LogService } from './log.service'
import { makeLog } from './log.testing.utils'

describe('logService', () => {
  let module: TestingModule
  let service: LogService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    module = await Test.createTestingModule({
      providers: [
        LogService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(LogService)
  })

  it('should map clean logs', async () => {
    const dbLogs = [makeLog({
      data: { args: {} },
      action: 'Action',
    })]

    prisma.$transaction.mockResolvedValueOnce([dbLogs.length, dbLogs])

    const { logs } = await service.getLogs({
      limit: 10,
      offset: 10,
      clean: true,
      projectId: undefined,
    })

    expect(logs[0]).not.toHaveProperty('requestId')
    expect(logs[0].data).not.toHaveProperty('results')
    expect(logs[0].data).not.toHaveProperty('args')
    expect(logs[0].data).not.toHaveProperty('config')
  })

  it('should not filter admin logs', async () => {
    const dbLogs = [makeLog({
      data: { args: {} },
      action: 'Action',
    })]

    prisma.$transaction.mockResolvedValueOnce([dbLogs.length, dbLogs])

    const { logs } = await service.getLogs({
      limit: 10,
      offset: 10,
      clean: false,
      projectId: undefined,
    })

    expect(logs[0].data).toHaveProperty('args')
    expect(logs[0].data).not.toHaveProperty('config')
  })
})
