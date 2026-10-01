import type { TestingModule } from '@nestjs/testing'
import type { MockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { AdminTokenController } from './admin-token.controller'
import { AdminTokenService } from './admin-token.service'

type ListedAdminToken = Awaited<ReturnType<AdminTokenService['list']>>[number]

function makeListedToken(): ListedAdminToken {
  const ownerId = faker.string.uuid()
  return {
    id: faker.string.uuid(),
    name: 'ci',
    permissions: 0n,
    lastUse: null,
    expirationDate: null,
    status: 'active',
    createdAt: faker.date.past(),
    userId: ownerId,
    owner: {
      id: ownerId,
      email: faker.internet.email().toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      type: 'bot',
    },
  }
}

describe('adminTokenController', () => {
  let module: TestingModule
  let controller: AdminTokenController
  let service: MockProxy<AdminTokenService>

  const token = makeListedToken()

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
})
