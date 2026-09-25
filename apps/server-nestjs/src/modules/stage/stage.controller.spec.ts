import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import type { Stage } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { ADMIN_PERMISSIONS_KEY } from '../infrastructure/permission/user/user-admin-permission.decorator'
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
  } as Stage

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

  it('exposes GET list without admin permission', () => {
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, StageController.prototype.list)).toBeUndefined()
  })

  it('guards stage environments with ListStages', () => {
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, StageController.prototype.getStageEnvironments)).toEqual(['ListStages'])
  })

  it('guards mutations with ManageStages', () => {
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, StageController.prototype.create)).toEqual(['ManageStages'])
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, StageController.prototype.update)).toEqual(['ManageStages'])
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, StageController.prototype.delete)).toEqual(['ManageStages'])
  })

  it('delegates list to the service', async () => {
    service.listStages.mockResolvedValue([stage])

    expect(await controller.list()).toEqual([stage])
    expect(service.listStages).toHaveBeenCalledTimes(1)
  })

  it('delegates stage environments with stageId', async () => {
    const environments = { environments: [] }
    const stageId = faker.string.uuid()
    service.getStageAssociatedEnvironments.mockResolvedValue(environments as never)

    expect(await controller.getStageEnvironments(stageId)).toBe(environments)
    expect(service.getStageAssociatedEnvironments).toHaveBeenCalledWith(stageId)
  })

  it('delegates create with the validated body', async () => {
    service.createStage.mockResolvedValue(stage)

    expect(await controller.create(stage as never)).toBe(stage)
    expect(service.createStage).toHaveBeenCalledWith(stage)
  })

  it('delegates update with stageId and validated body', async () => {
    const stageId = faker.string.uuid()
    service.updateStage.mockResolvedValue(stage)

    expect(await controller.update(stageId, { name: 'staging' } as never)).toBe(stage)
    expect(service.updateStage).toHaveBeenCalledWith(stageId, { name: 'staging' })
  })

  it('delegates delete with stageId', async () => {
    const stageId = faker.string.uuid()
    service.deleteStage.mockResolvedValue(undefined)

    await controller.delete(stageId)
    expect(service.deleteStage).toHaveBeenCalledWith(stageId)
  })
})
