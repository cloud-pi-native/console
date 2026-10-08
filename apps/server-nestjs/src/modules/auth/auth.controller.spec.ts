import type { TestingModule } from '@nestjs/testing'
import type { User } from '@prisma/client'
import type { MockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { makeUser } from '../user/user-testing.utils'
import { toContractUser } from '../user/user.utils'
import { AuthController } from './auth.controller'
import { AuthUserService } from './auth.service'

describe('authController', () => {
  let module: TestingModule
  let controller: AuthController
  let service: MockProxy<AuthUserService>

  beforeEach(async () => {
    service = mock<AuthUserService>()

    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthUserService, useValue: service },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<AuthController>(AuthController)
  })

  it('routes an authenticated session to the service', async () => {
    const user: User = makeUser()
    service.getUser.mockResolvedValue(user)

    expect(await controller.auth({ userId: user.id })).toEqual(toContractUser(user))
    expect(service.getUser).toHaveBeenCalledWith(user.id)
  })

  it('merges the oidc-resolved admin role ids into the session payload', async () => {
    const user: User = makeUser({ adminRoleIds: ['persisted-role'] })
    service.getUser.mockResolvedValue(user)

    const payload = await controller.auth({ userId: user.id, adminRoleIds: ['persisted-role', 'oidc-role'] })

    expect(payload).toEqual({ ...toContractUser(user), adminRoleIds: ['persisted-role', 'oidc-role'] })
  })
})
