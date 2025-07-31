import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServiceChainDetails } from '@cpn-console/shared'
import { serviceChainContract } from '@cpn-console/shared'
import app from '../../app.js'
import * as utilsController from '../../utils/controller.js'
import { getUserMockInfos } from '../../utils/mocks.js'
import * as business from './business.js'

vi.mock(
  'fastify-keycloak-adapter',
  (await import('../../utils/mocks.js')).mockSessionPlugin,
)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessListMock = vi.spyOn(business, 'listServiceChains')
const businessGetDetailsMock = vi.spyOn(business, 'getServiceChainDetails')

describe('test ServiceChainContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })
  describe('listServiceChains', () => {
    it('as non admin', async () => {
      const user = getUserMockInfos(false)

      authUserMock.mockResolvedValueOnce(user)

      businessListMock.mockResolvedValueOnce([])
      const response = await app
        .inject()
        .get(serviceChainContract.listServiceChains.path)
        .end()

      expect(response.json()).toStrictEqual([])
      expect(response.statusCode).toEqual(200)
    })
    it('as admin', async () => {
      const user = getUserMockInfos(true)

      authUserMock.mockResolvedValueOnce(user)

      businessListMock.mockResolvedValueOnce([])
      const response = await app
        .inject()
        .get(serviceChainContract.listServiceChains.path)
        .end()

      expect(businessListMock).toHaveBeenCalledWith()

      expect(response.json()).toStrictEqual([])
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('getServiceChainDetails', () => {
    it('should return serviceChain details', async () => {
      const serviceChain: ServiceChainDetails = {
        id: faker.string.uuid(),
        state: faker.string.alpha(),
        success: faker.datatype.boolean(),
        validation_id: faker.string.uuid(),
        validated_by: faker.string.uuid(),
        version: faker.string.alpha(),
        pai: faker.string.alpha(),
        ref: faker.string.alpha(),
        location: faker.string.alpha(),
        targetAddress: faker.internet.ipv4(),
        PAI: faker.string.alpha(),
        projectId: faker.string.uuid(),
        env: faker.string.alpha(),
        network: faker.string.alpha(),
        commonName: faker.string.alpha(),
        subjectAlternativeName: faker.helpers.uniqueArray(
          faker.internet.domainName,
          3,
        ),
        redirect: faker.datatype.boolean(),
        antivirus: faker.datatype.boolean(),
        maxFileSize: faker.number.int(),
        websocket: faker.datatype.boolean(),
        ipWhiteList: faker.helpers.uniqueArray(faker.internet.ipv4, 5),
        sslOutgoing: faker.datatype.boolean(),
        createat: faker.date.recent().toString(),
        updateat: faker.date.recent().toString(),
      }
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessGetDetailsMock.mockResolvedValueOnce(serviceChain)
      const response = await app
        .inject()
        .get(
          serviceChainContract.getServiceChainDetails.path.replace(
            ':serviceChainId',
            serviceChain.id,
          ),
        )
        .end()

      expect(businessGetDetailsMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(serviceChain)
      expect(response.statusCode).toEqual(200)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app
        .inject()
        .get(
          serviceChainContract.getServiceChainDetails.path.replace(
            ':serviceChainId',
            faker.string.uuid(),
          ),
        )
        .end()

      expect(businessGetDetailsMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })
})
