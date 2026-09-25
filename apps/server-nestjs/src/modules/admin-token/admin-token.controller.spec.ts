import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { ADMIN_PERMISSIONS_KEY } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { AdminTokenController } from './admin-token.controller'
import { AdminTokenService } from './admin-token.service'

describe('adminTokenController', () => {
  let module: TestingModule
  let controller: AdminTokenController
  let service: MockProxy<AdminTokenService>

  const token = {
    id: faker.string.uuid(),
    name: 'ci',
    permissions: '0',
    ownerId: faker.string.uuid(),
    createdAt: new Date(),
    revokedAt: null,
  } as Awaited<ReturnType<AdminTokenService['list']>>[number]

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

  it('guards list with ListAdminToken', () => {
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, AdminTokenController.prototype.list)).toEqual(['ListAdminToken'])
  })

  it('guards mutations with ManageAdminToken', () => {
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, AdminTokenController.prototype.create)).toEqual(['ManageAdminToken'])
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, AdminTokenController.prototype.revoke)).toEqual(['ManageAdminToken'])
  })

  it('delegates list with withRevoked coerced to boolean', async () => {
    service.list.mockResolvedValue([token])

    expect(await controller.list(true)).toEqual([token])
    expect(service.list).toHaveBeenCalledWith(true)

    expect(await controller.list(false)).toEqual([token])
    expect(service.list).toHaveBeenLastCalledWith(false)
  })

  it('delegates create with the validated body', async () => {
    const created = { ...token, password: 'pwd' }
    service.create.mockResolvedValue(created)

    expect(await controller.create({ name: 'ci', permissions: '0' } as never)).toBe(created)
    expect(service.create).toHaveBeenCalledWith({ name: 'ci', permissions: '0' })
  })

  it('delegates revoke with tokenId', async () => {
    const tokenId = faker.string.uuid()
    service.revoke.mockResolvedValue(undefined)

    await controller.revoke(tokenId)
    expect(service.revoke).toHaveBeenCalledWith(tokenId)
  })
})
