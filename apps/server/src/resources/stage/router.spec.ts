import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Stage, stageContract } from '@cpn-console/shared'
import app from '../../app.js'
import * as business from './business.js'
import * as utilsController from '../../utils/controller.js'
import { faker } from '@faker-js/faker'
import { getUserMockInfos } from '../../utils/mocks.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessListMock = vi.spyOn(business, 'listStages')
const businessGetEnvironmentsMock = vi.spyOn(business, 'getStageAssociatedEnvironments')
const businessCreateMock = vi.spyOn(business, 'createStage')
const businessUpdateMock = vi.spyOn(business, 'updateStage')
const businessDeleteMock = vi.spyOn(business, 'deleteStage')

describe('Test stageContract', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('listStages', () => {
    it('Should return list of stages', async () => {
      const stages = []
      businessListMock.mockResolvedValueOnce(stages)

      const response = await app.inject()
        .get(stageContract.listStages.path)
        .end()

      expect(businessListMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(stages)
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('getStageEnvironments', () => {
    it('Should return stage environments for admin', async () => {
      const environments = []
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessGetEnvironmentsMock.mockResolvedValueOnce(environments)
      const response = await app.inject()
        .get(stageContract.getStageEnvironments.path.replace(':stageId', faker.string.uuid()))
        .end()

      expect(businessGetEnvironmentsMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(environments)
      expect(response.statusCode).toEqual(200)
    })
    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessGetEnvironmentsMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .get(stageContract.getStageEnvironments.path.replace(':stageId', faker.string.uuid()))
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(stageContract.getStageEnvironments.path.replace(':stageId', faker.string.uuid()))
        .end()

      expect(businessGetEnvironmentsMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('createStage', () => {
    const stage: Stage = { id: faker.string.uuid(), name: faker.string.alpha({ length: 5 }), clusterIds: [], quotaIds: [] }

    it('Should create and return stage for admin', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(stage)
      const response = await app.inject()
        .post(stageContract.createStage.path)
        .body(stage)
        .end()

      expect(businessCreateMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual(stage)
      expect(response.statusCode).toEqual(201)
    })
    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessCreateMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .post(stageContract.createStage.path)
        .body(stage)
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(stageContract.createStage.path)
        .body(stage)
        .end()

      expect(businessCreateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('updateStage', () => {
    const stageId = faker.string.uuid()
    const stage = { name: faker.string.alpha({ length: 5 }), clusterIds: [], quotaIds: [] }

    it('Should update and return stage for admin', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce({ id: stageId, ...stage })
      const response = await app.inject()
        .put(stageContract.updateStage.path.replace(':stageId', stageId))
        .body(stage)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(1)
      expect(response.json()).toEqual({ id: stageId, ...stage })
      expect(response.statusCode).toEqual(200)
    })
    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessUpdateMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .put(stageContract.updateStage.path.replace(':stageId', stageId))
        .body(stage)
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .put(stageContract.updateStage.path.replace(':stageId', stageId))
        .body(stage)
        .end()

      expect(businessUpdateMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })

  describe('deleteStage', () => {
    it('Should delete stage for admin', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(null)
      const response = await app.inject()
        .delete(stageContract.deleteStage.path.replace(':stageId', faker.string.uuid()))
        .end()

      expect(businessDeleteMock).toHaveBeenCalledTimes(1)
      expect(response.body).toBeFalsy()
      expect(response.statusCode).toEqual(204)
    })
    it('Should pass business error', async () => {
      const user = getUserMockInfos(true)
      authUserMock.mockResolvedValueOnce(user)

      businessDeleteMock.mockResolvedValueOnce(new utilsController.BadRequest400('une erreur'))
      const response = await app.inject()
        .delete(stageContract.deleteStage.path.replace(':stageId', faker.string.uuid()))
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return 403 for non-admin', async () => {
      const user = getUserMockInfos(false)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(stageContract.deleteStage.path.replace(':stageId', faker.string.uuid()))
        .end()

      expect(businessDeleteMock).toHaveBeenCalledTimes(0)
      expect(response.statusCode).toEqual(403)
    })
  })
})
