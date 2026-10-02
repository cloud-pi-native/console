import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { makeAdminTokenRecord } from './admin-token-testing.utils'
import { AdminTokenController } from './admin-token.controller'
import { AdminTokenService } from './admin-token.service'

describe('adminTokenController', () => {
  let module: TestingModule
  let controller: AdminTokenController
  let service: MockProxy<AdminTokenService>

  const token = makeAdminTokenRecord({ permissions: 0n })

  beforeEach(async () => {
    service = mock<AdminTokenService>()

    module = await Test.createTestingModule({
      controllers: [AdminTokenController],
      providers: [
        { provide: AdminTokenService, useValue: service },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<AdminTokenController>(AdminTokenController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('delegates list with withRevoked coerced to boolean and serializes permissions', async () => {
    service.list.mockResolvedValue([token])

    const [listed] = await controller.list(true)
    expect(listed.permissions).toBe('0')
    expect(service.list).toHaveBeenCalledWith(true)

    await controller.list(false)
    expect(service.list).toHaveBeenLastCalledWith(false)
  })

  it('delegates create and assembles the exposed token', async () => {
    service.create.mockResolvedValue({ token, password: 'plain-password' })

    const result = await controller.create({ name: token.name, permissions: '0', expirationDate: null })

    expect(service.create).toHaveBeenCalledWith({ name: token.name, permissions: '0', expirationDate: null })
    expect(result.permissions).toBe('0')
    expect(result.password).toBe('plain-password')
  })
})
