import type { DeepMockProxy } from 'vitest-mock-extended'
import { HealthIndicatorService } from '@nestjs/terminus'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { DatabaseHealthService } from './database-health.service'
import { PrismaService } from './prisma.service'

describe('databaseHealthService', () => {
  let service: DatabaseHealthService
  let prisma: DeepMockProxy<PrismaService>
  let indicatorSession: { up: ReturnType<typeof vi.fn>, down: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    const healthIndicatorMock = mockDeep<HealthIndicatorService>()
    indicatorSession = {
      up: vi.fn().mockReturnValue({ status: 'up' }),
      down: vi.fn().mockReturnValue({ status: 'down' }),
    }
    vi.mocked(healthIndicatorMock.check).mockReturnValue(indicatorSession as any)

    const module = await Test.createTestingModule({
      providers: [
        DatabaseHealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: HealthIndicatorService, useValue: healthIndicatorMock },
      ],
    }).compile()

    service = module.get(DatabaseHealthService)
  })

  it('reports up when the query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValueOnce(undefined as any)

    const result = await service.check('database')

    expect(prisma.$queryRaw).toHaveBeenCalled()
    expect(indicatorSession.up).toHaveBeenCalled()
    expect(result).toEqual({ status: 'up' })
  })

  it('reports down when the query throws', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('boom'))

    const result = await service.check('database')

    expect(indicatorSession.down).toHaveBeenCalledWith({ message: 'boom' })
    expect(result).toEqual({ status: 'down' })
  })
})
