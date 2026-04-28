import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { AdminPermissionGuard } from '../infrastructure/auth/admin-permission.guard'
import { makeSystemSetting } from './system-settings-testing.utils'
import { SystemSettingsController } from './system-settings.controller'
import { SystemSettingsService } from './system-settings.service'

describe('systemSettingsController', () => {
  let module: TestingModule
  let controller: SystemSettingsController
  let service: MockProxy<SystemSettingsService>

  beforeEach(async () => {
    service = mock<SystemSettingsService>()

    module = await Test.createTestingModule({
      controllers: [SystemSettingsController],
      providers: [
        { provide: SystemSettingsService, useValue: service },
      ],
    })
      .overrideGuard(AdminPermissionGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<SystemSettingsController>(SystemSettingsController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('list', () => {
    it('should call service.list() with id', async () => {
      const systemSetting = makeSystemSetting()

      service.list.mockResolvedValue([systemSetting])

      const result = await controller.list(systemSetting.key)

      expect(service.list).toHaveBeenCalledWith(systemSetting.key)
      expect(result).toEqual([systemSetting])
    })
  })

  describe('upsert', () => {
    it('should call service.upsert() with id', async () => {
      const systemSetting = makeSystemSetting()

      service.upsert.mockResolvedValue(systemSetting)

      const result = await controller.upsert(systemSetting)

      expect(service.upsert).toHaveBeenCalledWith(systemSetting)
      expect(result).toEqual(systemSetting)
    })
  })
})
