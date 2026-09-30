import type { Stage, UpdateStageBody } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { makeStageEnvironmentRecord, makeStageWithClusters } from './stage-testing.utils'
import { StageController } from './stage.controller'
import { StageService } from './stage.service'
import { toStageAssociatedEnvironments, toStages } from './stage.utils'

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
