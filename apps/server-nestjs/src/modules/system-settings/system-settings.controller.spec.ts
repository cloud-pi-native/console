import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { makeSystemSetting } from './system-settings-testing.utils'
import { SystemSettingsController } from './system-settings.controller'
import { SystemSettingsService } from './system-settings.service'

describe('systemSettingsController', () => {
  let module: TestingModule
  let controller: SystemSettingsController
  let settings: MockProxy<SystemSettingsService>

  beforeEach(async () => {
    settings = mock<SystemSettingsService>()

    module = await Test.createTestingModule({
      controllers: [SystemSettingsController],
      providers: [
        { provide: SystemSettingsService, useValue: settings },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<SystemSettingsController>(SystemSettingsController)
  })

  it('routes an authenticated admin write to the service', async () => {
    const setting = makeSystemSetting()
    settings.upsert.mockResolvedValueOnce(setting)
    expect(await controller.upsert(setting)).toEqual(setting)
    expect(settings.upsert).toHaveBeenCalledWith(setting)
  })
})
