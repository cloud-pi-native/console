import type { SystemSettings } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { SystemSettingsService } from './system-settings.service'
import { PrismaClient } from '@prisma/client'

describe('systemSettingsService', () => {
  let module: TestingModule
  let service: SystemSettingsService
  let prisma: DeepMockProxy<PrismaClient>

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>()

    module = await Test.createTestingModule({
      providers: [
        SystemSettingsService,
        { provide: PrismaClient, useValue: prisma },
      ],
    }).compile()

    service = module.get<SystemSettingsService>(SystemSettingsService)
  })

  const uuid = '550e8400-e29b-41d4-a716-446655440000'

  const mockSystemSettings: SystemSettings[number] = {
    key: uuid,
    value: 'test-value',
  }

  describe('list', () => {
    it('should call GET /requests and parse response', async () => {
      prisma.systemSetting.findMany.mockResolvedValue([mockSystemSettings])

      const result = await service.list()

      expect(prisma.systemSetting.findMany).toHaveBeenCalledWith({})
      expect(result).toHaveLength(1)
      expect(result[0].key).toBe(uuid)
    })
  })

  describe('upsert', () => {
    it('should call POST /requests/:id and parse response', async () => {
      prisma.systemSetting.upsert.mockResolvedValue(mockSystemSettings)

      const result = await service.upsert(mockSystemSettings)

      expect(result.key).toBe(uuid)
      expect(result.value).toBe('test-value')
    })
  })
})
