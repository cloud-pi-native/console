import { quotaContract } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../../app.js'
import * as utilsController from '../../utils/controller.js'
import { BadRequest400, NotFound404 } from '../../utils/errors.js'
import { getUserMockInfos } from '../../utils/mocks.js'
import * as business from './business.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessListMock = vi.spyOn(business, 'listQuotas')
const businessGetEnvironmentsMock = vi.spyOn(business, 'getQuotaAssociatedEnvironments')
const businessCreateMock = vi.spyOn(business, 'createQuota')
const businessUpdateMock = vi.spyOn(business, 'updateQuota')
const businessDeleteMock = vi.spyOn(business, 'deleteQuota')

describe('test quotaContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('listQuotas', () => {
    it('as non admin', async () => {
      const user = getUserMockInfos(false)

      authUserMock.mockResolvedValueOnce(user)

      businessListMock.mockResolvedValueOnce([])
      const response = await app.inject()
        .get(quotaContract.listQuotas.path)
        .end()

      expect(businessListMock).toHaveBeenCalledWith(user.user.id)

      expect(response.json()).toStrictEqual([])
      expect(response.statusCode).toEqual(200)
    })
    it('as admin', async () => {
      const user = getUserMockInfos(true)

      authUserMock.mockResolvedValueOnce(user)

      businessListMock.mockResolvedValueOnce([])
      const response = await app.inject()
        .get(quotaContract.listQuotas.path)
        .end()

      expect(businessListMock).toHaveBeenCalledWith()

      expect(response.json()).toStrictEqual([])
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('listQuotaEnvironments', () => {
    it('should return quota environments', async () => {
      const envs = []
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessGetEnvironmentsMock.mockResolvedValueOnce(envs)
      const response = await app.inject()
        .get(quotaContract.listQuotaEnvironments.path.replace(':quotaId', faker.string.uuid()))
        .end()

      expect(businessGetEnvironmentsMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual([])
      expect(response.statusCode).toEqual(200)
    })
    it('should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessGetEnvironmentsMock.mockResolvedValueOnce(new NotFound404())
      const response = await app.inject()
        .get(quotaContract.listQuotaEnvironments.path.replace(':quotaId', faker.string.uuid()))
        .end()

      expect(response.statusCode).toEqual(404)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(quotaContract.listQuotaEnvironments.path.replace(':quotaId', faker.string.uuid()))
        .end()

      expect(businessGetEnvironmentsMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('createQuota', () => {
    const quota = { id: faker.string.uuid(), name: faker.company.name(), cpu: 10, memory: '1Gi', isPrivate: false, stageIds: [] }

    it('should return created quota', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(quota)
      const response = await app.inject()
        .post(quotaContract.createQuota.path)
        .body(quota)
        .end()

      expect(response.json()).toEqual(quota)
      expect(response.statusCode).toEqual(201)
    })
    it('should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .post(quotaContract.createQuota.path)
        .body(quota)
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(quotaContract.createQuota.path)
        .body(quota)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('updateQuota', () => {
    const quotaId = faker.string.uuid()
    const quota = { name: faker.company.name(), cpu: 10, memory: '1Gi', isPrivate: false, stageIds: [] }

    it('should return updated quota', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce({ id: quotaId, ...quota })
      const response = await app.inject()
        .put(quotaContract.updateQuota.path.replace(':quotaId', quotaId))
        .body(quota)
        .end()

      expect(response.json()).toEqual({ id: quotaId, ...quota })
      expect(response.statusCode).toEqual(200)
    })
    it('should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .put(quotaContract.updateQuota.path.replace(':quotaId', quotaId))
        .body(quota)
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(quotaContract.updateQuota.path.replace(':quotaId', quotaId))
        .body(quota)
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })

  describe('deleteQuota', () => {
    it('should return empty when delete', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(null)
      const response = await app.inject()
        .delete(quotaContract.deleteQuota.path.replace(':quotaId', faker.string.uuid()))
        .end()

      expect(response.body).toBeFalsy()
      expect(response.statusCode).toEqual(204)
    })
    it('should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(new BadRequest400('une erreur'))
      const response = await app.inject()
        .delete(quotaContract.deleteQuota.path.replace(':quotaId', faker.string.uuid()))
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('should return 403 if not admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(quotaContract.deleteQuota.path.replace(':quotaId', faker.string.uuid()))
        .end()

      expect(response.statusCode).toEqual(403)
    })
  })
})
