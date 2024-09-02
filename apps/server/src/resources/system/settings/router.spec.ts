import { beforeEach, describe, expect, it, vi } from 'vitest'
import { systemSettingsContract, systemSettingsDefaultSchema } from '@cpn-console/shared'
import app from '../../../app.js'
import * as utilsController from '../../../utils/controller.js'
import { getUserMockInfos } from '../../../utils/mocks.js'
import * as business from './business.js'

vi.mock('fastify-keycloak-adapter', (await import('../../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessGetSystemSettingsMock = vi.spyOn(business, 'getSystemSettings')
const businessUpsertSystemSettingMock = vi.spyOn(business, 'upsertSystemSettings')

describe('test systemSettingsContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('listSystemSettings', () => {
    it('should return system settings for authorized users', async () => {
      const user = getUserMockInfos(true)
      const systemSettings = systemSettingsDefaultSchema.parse({})

      authUserMock.mockResolvedValueOnce(user)
      businessGetSystemSettingsMock.mockResolvedValueOnce(systemSettings)

      const response = await app.inject()
        .get(systemSettingsContract.listSystemSettings.path)
        .end()

      expect(businessGetSystemSettingsMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(systemSettings)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('upsertSystemSettings', () => {
    const newConfig = { appName: 'key1' }
    it('should update system setting, authorized users', async () => {
      const defaultSystemSettings = systemSettingsDefaultSchema.parse({})
      const user = getUserMockInfos(true)

      authUserMock.mockResolvedValueOnce(user)
      businessUpsertSystemSettingMock.mockResolvedValueOnce({ ...defaultSystemSettings, ...newConfig })
      const response = await app.inject()
        .post(systemSettingsContract.upsertSystemSettings.path)
        .body(newConfig)
        .end()

      expect(businessUpsertSystemSettingMock).toHaveBeenCalledWith(newConfig)
      expect(response.json()).toEqual({ ...defaultSystemSettings, ...newConfig })
      expect(response.statusCode).toEqual(201)
    })

    it('should return 403 for unauthorized users', async () => {
      const user = getUserMockInfos(false)

      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(systemSettingsContract.upsertSystemSettings.path)
        .body(newConfig)
        .end()

      expect(businessUpsertSystemSettingMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })
})
