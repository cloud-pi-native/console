import type { TestingModule } from '@nestjs/testing'
import type { PrismaClient } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { makeSystemSetting } from './system-settings-testing.utils'
import { SystemSettingsService } from './system-settings.service'

describe('systemSettingsService', () => {
  let module: TestingModule
  let service: SystemSettingsService
  let prisma: DeepMockProxy<PrismaClient>

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>()

    module = await Test.createTestingModule({
      providers: [
        SystemSettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get<SystemSettingsService>(SystemSettingsService)
  })

  describe('list', () => {
    it('should call GET /requests and parse response', async () => {
      const mockSystemSetting = makeSystemSetting()
      prisma.systemSetting.findMany.mockResolvedValue([mockSystemSetting])

      const result = await service.list()

      expect(prisma.systemSetting.findMany).toHaveBeenCalledWith({ where: { key: undefined } })
      expect(result).toHaveLength(1)
      expect(result[0].key).toBe(mockSystemSetting.key)
    })
  })

  describe('upsert', () => {
    it('should call POST /requests/:id and parse response', async () => {
      const mockSystemSetting = makeSystemSetting()
      prisma.systemSetting.upsert.mockResolvedValue(mockSystemSetting)

      const result = await service.upsert(mockSystemSetting)

      expect(result.key).toBe(mockSystemSetting.key)
      expect(result.value).toBe(mockSystemSetting.value)
    })
  })
})
