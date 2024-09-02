import { describe, expect, it } from 'vitest'
import prisma from '../../../__mocks__/prisma.js'
import { getFileConfig } from '../../../utils/config.ts'
import { getSystemSettings, upsertSystemSettings } from './business.ts'

describe('test system settings business logic', () => {
  const systemSettings = [
    {
      key: 'maintenance',
      value: 'true',
    },
    {
      key: 'appName',
      value: 'candilib',
    },
    {
      key: 'appSubTitle',
      value: 'Direction, de la Sécurité, Routière',
    },
  ]
  describe('getSystemSettings', () => {
    it('should get one setting', async () => {
      prisma.systemSetting.findMany.mockResolvedValue(systemSettings)
      const response = await getSystemSettings('maintenance')
      expect(prisma.systemSetting.findMany).toHaveBeenCalledTimes(1)
      expect(response).toMatchObject({ maintenance: 'true' })
    })
    it('should get all settings', async () => {
      prisma.systemSetting.findMany.mockResolvedValue(systemSettings)
      const response = await getSystemSettings()
      expect(prisma.systemSetting.findMany).toHaveBeenCalledTimes(1)
      expect(response).toMatchObject({
        ...await getFileConfig(),
        maintenance: 'true',
        appName: 'candilib',
        appSubTitle: 'Direction, de la Sécurité, Routière',
      })
    })
  })

  describe('upsertSystemSettings', () => {
    it('should upsert 2 settings', async () => {
      prisma.systemSetting.findMany.mockResolvedValue([
        {
          key: 'maintenance',
          value: 'true',
        },
        {
          key: 'appName',
          value: 'PSIJ',
        },
        {
          key: 'appSubTitle',
          value: 'SNPS',
        },
      ])
      prisma.systemSetting.upsert.mockResolvedValue({ key: '', value: '' })
      const response = await upsertSystemSettings({
        appName: 'PSIJ',
        appSubTitle: 'SNPS',
      })
      expect(prisma.systemSetting.upsert).toHaveBeenCalledTimes(2)
      expect(prisma.systemSetting.findMany).toHaveBeenCalledTimes(1)
      expect(response).toMatchObject({
        ...await getFileConfig(),
        maintenance: 'true',
        appName: 'PSIJ',
        appSubTitle: 'SNPS',
      })
    })
  })
})
