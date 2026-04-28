import type { TestingModule } from '@nestjs/testing'
import type { PrismaClient } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { makeSystemSetting, makeSystemSettings } from './system-settings-testing.utils'
import { SystemSettingsService } from './system-settings.service'
import { faker } from '@faker-js/faker'

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
    it('should return all settings', async () => {
      const systemSettings = makeSystemSettings()

      prisma.systemSetting.findMany.mockResolvedValue(systemSettings)

      const result = await service.list()

      expect(prisma.systemSetting.findMany).toHaveBeenCalledWith({ where: { key: undefined } })
      expect(result).toEqual(systemSettings)
    })

    it('should return empty array if no settings are found', async () => {
      prisma.systemSetting.findMany.mockResolvedValue([])

      const result = await service.list()

      expect(prisma.systemSetting.findMany).toHaveBeenCalledWith({ where: { key: undefined } })
      expect(result).toEqual([])
    })

    it('should return setting by key', async () => {
      const systemSettings = makeSystemSettings()
      const systemSetting = faker.helpers.arrayElement(systemSettings)
      prisma.systemSetting.findMany.mockResolvedValue([systemSetting])

      const result = await service.list(systemSetting.key)

      expect(prisma.systemSetting.findMany).toHaveBeenCalledWith({ where: { key: systemSetting.key } })
      expect(result).toEqual([systemSetting])
    })

    it("should return empty array if key is not found", async () => {
      const key = faker.string.alphanumeric(10)
      prisma.systemSetting.findMany.mockResolvedValue([])

      const result = await service.list(key)

      expect(prisma.systemSetting.findMany).toHaveBeenCalledWith({ where: { key } })
      expect(result).toEqual([])
    })
  })

  describe('upsert', () => {
    it('should update setting if it exists', async () => {
      const systemSetting = makeSystemSetting()
      prisma.systemSetting.upsert.mockResolvedValue(systemSetting)

      const result = await service.upsert(systemSetting)

      expect(result.key).toBe(systemSetting.key)
      expect(result.value).toBe(systemSetting.value)
    })
  })
})
