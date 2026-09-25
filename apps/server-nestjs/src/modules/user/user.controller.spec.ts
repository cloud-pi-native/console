import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { ADMIN_PERMISSIONS_KEY } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { makeUser } from './user-testing.utils'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { toContractUser } from './user.utils'

describe('userController', () => {
  let module: TestingModule
  let controller: UserController
  let service: MockProxy<UserService>

  beforeEach(async () => {
    service = mock<UserService>()

    module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: service },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<UserController>(UserController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('guards list and patch with ManageUsers, leaves matching open to logged-in users', () => {
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, UserController.prototype.getAllUsers)).toEqual(['ManageUsers'])
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, UserController.prototype.patchUsers)).toEqual(['ManageUsers'])
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, UserController.prototype.getMatchingUsers)).toBeUndefined()
  })

  it('delegates list with relationType defaulted to AND and stripped from the query', async () => {
    const users = [makeUser()]
    service.getAllUsers.mockResolvedValue(users)

    const result = await controller.getAllUsers({ adminRoleIds: ['r1'], relationType: 'OR' } as never)

    expect(result).toEqual(users.map(toContractUser))
    expect(service.getAllUsers).toHaveBeenCalledWith({ adminRoleIds: ['r1'] }, 'OR')
  })

  it('delegates matching query to the service', async () => {
    const users = [makeUser()]
    service.getMatchingUsers.mockResolvedValue(users)
    const query = { letters: 'ab' }

    expect(await controller.getMatchingUsers(query)).toEqual(users.map(toContractUser))
    expect(service.getMatchingUsers).toHaveBeenCalledWith(query)
  })

  it('delegates patch body to the service', async () => {
    const users = [makeUser()]
    service.patchUsers.mockResolvedValue(users)
    const body = [{ id: users[0].id, adminRoleIds: ['r1'] }]

    expect(await controller.patchUsers(body as never)).toEqual(users.map(toContractUser))
    expect(service.patchUsers).toHaveBeenCalledWith(body)
  })
})
