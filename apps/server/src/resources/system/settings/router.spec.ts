import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_PERMS, systemSettingsContract } from '@cpn-console/shared'
import app from '../../../app.js'
import * as utilsController from '../../../utils/controller.js'
import { getUserMockInfos } from '../../../utils/mocks.js'
import * as business from './business.js'

vi.mock('fastify-keycloak-adapter', (await import('../../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessGetSystemSettingsMock = vi.spyOn(business, 'getSystemSettings')
const businessUpsertSystemSettingMock = vi.spyOn(business, 'upsertSystemSetting')

describe('test systemSettingsContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('listSystemSettings', () => {
    it('should return plugin configurations for authorized users', async () => {
      const user = getUserMockInfos(ADMIN_PERMS.LIST_SYSTEM)
      const systemSettings: any[] = []

      authUserMock.mockResolvedValueOnce(user)
      businessGetSystemSettingsMock.mockResolvedValueOnce(systemSettings)

      const response = await app.inject()
        .get(systemSettingsContract.listSystemSettings.path)
        .end()

      expect(businessGetSystemSettingsMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(systemSettings)
      expect(response.statusCode).toEqual(200)
    })

    it('should return 200 for unauthorized users', async () => {
      const user = getUserMockInfos(0n)
      const systemSettings: any[] = []

      authUserMock.mockResolvedValueOnce(user)
      businessGetSystemSettingsMock.mockResolvedValueOnce(systemSettings)

      const response = await app.inject()
        .get(systemSettingsContract.listSystemSettings.path)
        .end()

      expect(businessGetSystemSettingsMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('upsertSystemSetting', () => {
    const newConfig = { key: 'key1', value: 'value1' }
    it('should update system setting, authorized users', async () => {
      const user = getUserMockInfos(ADMIN_PERMS.MANAGE_SYSTEM)

      authUserMock.mockResolvedValueOnce(user)
      businessUpsertSystemSettingMock.mockResolvedValueOnce(newConfig)

      const response = await app.inject()
        .post(systemSettingsContract.upsertSystemSetting.path)
        .body(newConfig)
        .end()

      expect(businessUpsertSystemSettingMock).toHaveBeenCalledWith(newConfig)
      expect(response.statusCode).toEqual(201)
    })

    it('should return 403 for unauthorized users', async () => {
      const user = getUserMockInfos(0n)

      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(systemSettingsContract.upsertSystemSetting.path)
        .body(newConfig)
        .end()

      expect(businessUpsertSystemSettingMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })
})
