import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logContract } from '@cpn-console/shared'
import app from '../../app.js'
import * as utilsController from '../../utils/controller.js'
import { getUserMockInfos } from '../../utils/mocks.js'
import * as business from './business.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessGetLogsMock = vi.spyOn(business, 'getLogs')

describe('test logContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getLogs', () => {
    it('should return logs for admin', async () => {
      const user = getUserMockInfos(true)
      const logs = []
      const total = 1

      authUserMock.mockResolvedValueOnce(user)
      businessGetLogsMock.mockResolvedValueOnce([total, logs])

      const response = await app.inject()
        .get(logContract.getLogs.path)
        .query({ limit: 10, offset: 0 })
        .end()

      expect(authUserMock).toHaveBeenCalledTimes(1)
      expect(businessGetLogsMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual({ total, logs })
      expect(response.statusCode).toEqual(200)
    })

    it('should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)

      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(logContract.getLogs.path)
        .query({ limit: 10, offset: 0 })
        .end()

      expect(authUserMock).toHaveBeenCalledTimes(1)
      expect(businessGetLogsMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })
})
