import type { Stage, UpdateStageBody } from '@cpn-console/shared'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { makeStageEnvironmentRecord, makeStageWithClusters } from './stage-testing.utils'
import { StageController } from './stage.controller'
import { StageService } from './stage.service'
import { toStage, toStageAssociatedEnvironments, toStages } from './stage.utils'

describe('stageController', () => {
  let module: TestingModule
  let controller: StageController
  let service: MockProxy<StageService>

  const stage: Stage = {
    id: faker.string.uuid(),
    name: 'dev',
    clusterIds: [],
  }

  beforeEach(async () => {
    service = mock<StageService>()

    module = await Test.createTestingModule({
      controllers: [StageController],
      providers: [
        { provide: StageService, useValue: service },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<StageController>(StageController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('maps raw stage records to the contract shape', async () => {
    const records = [makeStageWithClusters()]
    service.listStages.mockResolvedValue(records)

    expect(await controller.list()).toEqual(toStages(records))
    expect(service.listStages).toHaveBeenCalledTimes(1)
  })

  it('maps stage environments for the contract response', async () => {
    const records = [makeStageEnvironmentRecord()]
    const stageId = faker.string.uuid()
    service.getStageAssociatedEnvironments.mockResolvedValue(records)

    expect(await controller.getStageEnvironments(stageId)).toEqual(toStageAssociatedEnvironments(records))
    expect(service.getStageAssociatedEnvironments).toHaveBeenCalledWith(stageId)
  })

  it('delegates create with the validated body', async () => {
    const record = makeStageWithClusters()
    service.createStage.mockResolvedValue(record)

    expect(await controller.create(stage)).toEqual(toStage(record))
    expect(service.createStage).toHaveBeenCalledWith(stage)
  })

  it('delegates update with stageId and validated body', async () => {
    const stageId = faker.string.uuid()
    const updateBody: UpdateStageBody = { name: 'staging', clusterIds: [] }
    const record = makeStageWithClusters()
    service.updateStage.mockResolvedValue(record)

    expect(await controller.update(stageId, updateBody)).toEqual(toStage(record))
    expect(service.updateStage).toHaveBeenCalledWith(stageId, updateBody)
  })

  it('delegates delete with stageId', async () => {
    const stageId = faker.string.uuid()
    service.deleteStage.mockResolvedValue(undefined)

    await controller.delete(stageId)
    expect(service.deleteStage).toHaveBeenCalledWith(stageId)
  })
})

describe('stageController http pipeline', () => {
  it('serves an anonymous GET /api/v1/stages with 200', async () => {
    const service = mock<StageService>()
    service.listStages.mockResolvedValue([])

    const testingModule = await Test.createTestingModule({
      controllers: [StageController],
      providers: [
        { provide: StageService, useValue: service },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: vi.fn(() => { throw new Error('UserGuard must not run on the public list route') }) })
      .compile()

    const app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    const response = await app.inject({ method: 'GET', url: '/api/v1/stages' })

    expect(response.statusCode).toBe(200)

    await app.close()
  })

  it.each([
    ['GET', '/api/v1/stages/not-an-uuid/environments'],
    ['PUT', '/api/v1/stages/not-an-uuid'],
    ['DELETE', '/api/v1/stages/not-an-uuid'],
  ])('rejects non-UUID stage params with 400 on %s %s', async (method, url) => {
    const service = mock<StageService>()

    const testingModule = await Test.createTestingModule({
      controllers: [StageController],
      providers: [
        { provide: StageService, useValue: service },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    const app = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    const response = await app.inject({ method, url, payload: method === 'PUT' ? {} : undefined })

    expect(response.statusCode).toBe(400)
    expect(service.getStageAssociatedEnvironments).not.toHaveBeenCalled()
    expect(service.updateStage).not.toHaveBeenCalled()
    expect(service.deleteStage).not.toHaveBeenCalled()

    await app.close()
  })
})
