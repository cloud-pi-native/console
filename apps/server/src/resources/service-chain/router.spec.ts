import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServiceChain, ServiceChainDetails } from '@cpn-console/shared'
import {
  ServiceChainDetailsSchema,
  ServiceChainListSchema,
  serviceChainContract,
  serviceChainEnvironmentEnum,
  serviceChainLocationEnum,
  serviceChainNetworkEnum,
  serviceChainStateEnum,
} from '@cpn-console/shared'
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
const businessRetryMock = vi.spyOn(business, 'retryServiceChain')
const businessValidateMock = vi.spyOn(business, 'validateServiceChain')

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
      const serviceChainList = faker.helpers.multiple<ServiceChain>(() => ({
        id: faker.string.uuid(),
        state: faker.helpers.arrayElement(serviceChainStateEnum),
        commonName: `${faker.string.alpha(3)}.${faker.string.alpha(3)}.minint.fr`,
        pai: faker.string.alpha(3).toUpperCase(),
        network: faker.helpers.arrayElement(serviceChainNetworkEnum),
        createdAt: faker.date.recent(),
        updatedAt: faker.date.recent(),
      }))

      authUserMock.mockResolvedValueOnce(user)

      businessListMock.mockResolvedValueOnce(serviceChainList)
      const response = await app
        .inject()
        .get(serviceChainContract.listServiceChains.path)
        .end()

      expect(businessListMock).toHaveBeenCalledWith()

      expect(ServiceChainListSchema.parse(response.json())).toStrictEqual(
        serviceChainList,
      )
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('getServiceChainDetails', () => {
    it('should return serviceChain details', async () => {
      const serviceChainDetails: ServiceChainDetails = {
        id: faker.string.uuid(),
        state: faker.helpers.arrayElement(serviceChainStateEnum),
        commonName: `${faker.string.alpha(3)}.${faker.string.alpha(3)}.minint.fr`,
        pai: faker.string.alpha(3).toUpperCase(),
        network: faker.helpers.arrayElement(serviceChainNetworkEnum),
        createdAt: faker.date.recent(),
        updatedAt: faker.date.recent(),
        validationId: faker.string.uuid(),
        validatedBy: faker.string.uuid(),
        ref: faker.string.uuid(),
        location: faker.helpers.arrayElement(serviceChainLocationEnum),
        targetAddress: faker.internet.ipv4(),
        projectId: faker.string.uuid(),
        env: faker.helpers.arrayElement(serviceChainEnvironmentEnum),
        subjectAlternativeName: faker.helpers.uniqueArray(
          faker.internet.domainName,
          3,
        ),
        redirect: faker.datatype.boolean(),
        antivirus:
          faker.helpers.maybe(() => ({
            maxFileSize: faker.number.int(),
          })) || null, // undefined is not wanted here
        websocket: faker.datatype.boolean(),
        ipWhiteList: faker.helpers
          .uniqueArray(faker.internet.ipv4, 5)
          .map(e => `${e}/32`), // We want a CIDR here
        sslOutgoing: faker.datatype.boolean(),
      }
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessGetDetailsMock.mockResolvedValueOnce(serviceChainDetails)
      const response = await app
        .inject()
        .get(
          serviceChainContract.getServiceChainDetails.path.replace(
            ':serviceChainId',
            serviceChainDetails.id,
          ),
        )
        .end()

      expect(ServiceChainDetailsSchema.parse(response.json())).toEqual(
        serviceChainDetails,
      )
      expect(response.statusCode).toEqual(200)
      expect(businessGetDetailsMock).toHaveBeenCalledTimes(1)
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

      expect(response.statusCode).toEqual(403)
      expect(businessGetDetailsMock).toHaveBeenCalledTimes(0)
    })
  })

  describe('retryServiceChain', () => {
    it('should return 204', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessRetryMock.mockResolvedValueOnce({
        status: 204,
        body: undefined,
      })
      const response = await app
        .inject()
        .post(
          serviceChainContract.retryServiceChain.path.replace(
            ':serviceChainId',
            faker.string.uuid(),
          ),
        )
        .end()

      expect(response.body).toEqual('')
      expect(businessRetryMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(204)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app
        .inject()
        .post(
          serviceChainContract.retryServiceChain.path.replace(
            ':serviceChainId',
            faker.string.uuid(),
          ),
        )
        .end()

      expect(response.statusCode).toEqual(403)
      expect(businessRetryMock).toHaveBeenCalledTimes(0)
    })
  })

  describe('validateServiceChain', () => {
    it('should return 204', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessValidateMock.mockResolvedValueOnce({
        status: 204,
        body: undefined,
      })
      const response = await app
        .inject()
        .post(
          serviceChainContract.validateServiceChain.path.replace(
            ':validationId',
            faker.string.uuid(),
          ),
        )
        .end()

      expect(businessValidateMock).toHaveBeenCalledTimes(1)
      expect(response.body).toEqual('')
      expect(response.statusCode).toEqual(204)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app
        .inject()
        .post(
          serviceChainContract.validateServiceChain.path.replace(
            ':validationId',
            faker.string.uuid(),
          ),
        )
        .end()

      expect(businessValidateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })
})
