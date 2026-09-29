import type { Stage, StageAssociatedEnvironments, UpdateStageBody } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { StageController } from './stage.controller'
import { StageService } from './stage.service'

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

  it('delegates list to the service', async () => {
    service.listStages.mockResolvedValue([stage])

    expect(await controller.list()).toEqual([stage])
    expect(service.listStages).toHaveBeenCalledTimes(1)
  })

  it('delegates stage environments with stageId', async () => {
    const environments: StageAssociatedEnvironments = []
    const stageId = faker.string.uuid()
    service.getStageAssociatedEnvironments.mockResolvedValue(environments)

    expect(await controller.getStageEnvironments(stageId)).toBe(environments)
    expect(service.getStageAssociatedEnvironments).toHaveBeenCalledWith(stageId)
  })

  it('delegates create with the validated body', async () => {
    service.createStage.mockResolvedValue(stage)

    expect(await controller.create(stage)).toBe(stage)
    expect(service.createStage).toHaveBeenCalledWith(stage)
  })

  it('delegates update with stageId and validated body', async () => {
    const stageId = faker.string.uuid()
    const updateBody: UpdateStageBody = { name: 'staging', clusterIds: [] }
    service.updateStage.mockResolvedValue(stage)

    expect(await controller.update(stageId, updateBody)).toBe(stage)
    expect(service.updateStage).toHaveBeenCalledWith(stageId, updateBody)
  })

  it('delegates delete with stageId', async () => {
    const stageId = faker.string.uuid()
    service.deleteStage.mockResolvedValue(undefined)

    await controller.delete(stageId)
    expect(service.deleteStage).toHaveBeenCalledWith(stageId)
  })
})
