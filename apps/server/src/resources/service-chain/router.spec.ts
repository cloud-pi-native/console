import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServiceChain, ServiceChainDetails, ServiceChainFlows } from '@cpn-console/shared'
import {
  ADMIN_PERMS,
  ServiceChainDetailsSchema,
  ServiceChainFlowsSchema,
  ServiceChainListSchema,
  serviceChainContract,
  serviceChainEnvironmentEnum,
  serviceChainFlowStateEnum,
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
const businessListServiceChainsMock = vi.spyOn(business, 'listServiceChains')
const businessGetServiceChainDetailsMock = vi.spyOn(business, 'getServiceChainDetails')
const businessRetryServiceChainMock = vi.spyOn(business, 'retryServiceChain')
const businessValidateServiceChainMock = vi.spyOn(business, 'validateServiceChain')
const businessGetServiceChainsFlowsMock = vi.spyOn(business, 'getServiceChainFlows')

describe('test ServiceChainContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })
  describe('listServiceChains', () => {
    it('as non admin', async () => {
      const user = getUserMockInfos(0n)

      authUserMock.mockResolvedValueOnce(user)

      businessListServiceChainsMock.mockResolvedValueOnce([])
      const response = await app
        .inject()
        .get(serviceChainContract.listServiceChains.path)
        .end()

      expect(response.json()).toStrictEqual([])
      expect(response.statusCode).toEqual(200)
    })
    it('as admin', async () => {
      const user = getUserMockInfos(ADMIN_PERMS.LIST_SYSTEM)
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

      businessListServiceChainsMock.mockResolvedValueOnce(serviceChainList)
      const response = await app
        .inject()
        .get(serviceChainContract.listServiceChains.path)
        .end()

      expect(businessListServiceChainsMock).toHaveBeenCalledWith()

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
      const user = getUserMockInfos(ADMIN_PERMS.LIST_SYSTEM)
      authUserMock.mockResolvedValueOnce(user)

      businessGetServiceChainDetailsMock.mockResolvedValueOnce(serviceChainDetails)
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
      expect(businessGetServiceChainDetailsMock).toHaveBeenCalledTimes(1)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(0n)
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
      expect(businessGetServiceChainDetailsMock).toHaveBeenCalledTimes(0)
    })
  })

  describe('retryServiceChain', () => {
    it('should return 204', async () => {
      const user = getUserMockInfos(ADMIN_PERMS.MANAGE_SYSTEM)
      authUserMock.mockResolvedValueOnce(user)

      businessRetryServiceChainMock.mockResolvedValueOnce({
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
      expect(businessRetryServiceChainMock).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toEqual(204)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(0n)
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
      expect(businessRetryServiceChainMock).toHaveBeenCalledTimes(0)
    })
  })

  describe('validateServiceChain', () => {
    it('should return 204', async () => {
      const user = getUserMockInfos(ADMIN_PERMS.MANAGE_SYSTEM)
      authUserMock.mockResolvedValueOnce(user)

      businessValidateServiceChainMock.mockResolvedValueOnce({
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

      expect(businessValidateServiceChainMock).toHaveBeenCalledTimes(1)
      expect(response.body).toEqual('')
      expect(response.statusCode).toEqual(204)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(0n)
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

      expect(businessValidateServiceChainMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('getServiceChainFlows', () => {
    it('should return serviceChain flows', async () => {
      const serviceChainFlows: ServiceChainFlows = {
        reserve_ip: {
          state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
          input: '{ "foo": 0, "bar": true, "qux": "test" }',
          output: '{ "foo": 0, "bar": true, "qux": "test" }',
          updatedAt: faker.date.recent(),
        },
        create_cert: {
          state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
          input: '{ "foo": 0, "bar": true, "qux": "test" }',
          output: '{ "foo": 0, "bar": true, "qux": "test" }',
          updatedAt: faker.date.recent(),
        },
        call_exec: {
          state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
          input: '{ "foo": 0, "bar": true, "qux": "test" }',
          output: '{ "foo": 0, "bar": true, "qux": "test" }',
          updatedAt: faker.date.recent(),
        },
        activate_ip: {
          state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
          input: '{ "foo": 0, "bar": true, "qux": "test" }',
          output: '{ "foo": 0, "bar": true, "qux": "test" }',
          updatedAt: faker.date.recent(),
        },
        dns_request: {
          state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
          input: '{ "foo": 0, "bar": true, "qux": "test" }',
          output: '{ "foo": 0, "bar": true, "qux": "test" }',
          updatedAt: faker.date.recent(),
        },
      }
      const user = getUserMockInfos(ADMIN_PERMS.LIST_SYSTEM)
      authUserMock.mockResolvedValueOnce(user)

      businessGetServiceChainsFlowsMock.mockResolvedValueOnce(serviceChainFlows)
      const response = await app
        .inject()
        .get(
          serviceChainContract.getServiceChainFlows.path.replace(
            ':serviceChainId',
            faker.string.uuid(),
          ),
        )
        .end()

      expect(ServiceChainFlowsSchema.parse(response.json())).toEqual(
        serviceChainFlows,
      )
      expect(response.statusCode).toEqual(200)
      expect(businessGetServiceChainsFlowsMock).toHaveBeenCalledTimes(1)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(0n)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app
        .inject()
        .get(
          serviceChainContract.getServiceChainFlows.path.replace(
            ':serviceChainId',
            faker.string.uuid(),
          ),
        )
        .end()

      expect(response.statusCode).toEqual(403)
      expect(businessGetServiceChainsFlowsMock).toHaveBeenCalledTimes(0)
    })
  })
})
