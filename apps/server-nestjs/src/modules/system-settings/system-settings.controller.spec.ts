import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { ADMIN_PERMISSIONS_KEY } from '../infrastructure/permission/user/user-admin-permission.decorator'
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

  it('guards upsert behind UserGuard + ManageSystem (parity with legacy)', () => {
    const guards = Reflect.getMetadata('__guards__', controller.upsert) ?? []
    expect(guards).toContain(UserGuard)
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, controller.upsert)).toEqual(['ManageSystem'])
  })

  it('keeps list public (legacy GET has no admin guard)', () => {
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, controller.list)).toBeUndefined()
    expect(Reflect.getMetadata('__guards__', controller.list) ?? []).not.toContain(UserGuard)
  })

  it('routes an authenticated admin write to the service', async () => {
    const setting = makeSystemSetting()
    settings.upsert.mockResolvedValueOnce(setting)
    expect(await controller.upsert(setting)).toEqual(setting)
    expect(settings.upsert).toHaveBeenCalledWith(setting)
  })
})
