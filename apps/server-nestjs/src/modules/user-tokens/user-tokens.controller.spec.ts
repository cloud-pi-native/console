import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import { endOfToday } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { UserTokensController } from './user-tokens.controller'
import { UserTokensService } from './user-tokens.service'

describe('userTokensController', () => {
  let module: TestingModule
  let controller: UserTokensController
  let service: DeepMockProxy<UserTokensService>

  const user: UserContext = { userId: faker.string.uuid() }

  beforeEach(async () => {
    service = mockDeep<UserTokensService>()

    module = await Test.createTestingModule({
      controllers: [UserTokensController],
      providers: [{ provide: UserTokensService, useValue: service }],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<UserTokensController>(UserTokensController)
  })

  it('delegates creation to the service with the body and the caller id', async () => {
    const expirationDate = faker.date.soon({ days: 1, refDate: endOfToday().getTime() })
    service.create.mockResolvedValueOnce({
      id: faker.string.uuid(),
      name: 'my-token',
      lastUse: null,
      expirationDate,
      status: 'active',
      createdAt: new Date(),
      userId: user.userId,
      owner: { id: user.userId, email: faker.internet.email(), firstName: 'a', lastName: 'b', type: 'human' },
      password: faker.string.alphanumeric(48),
    })

    await controller.create({ name: 'my-token', expirationDate }, user)

    expect(service.create).toHaveBeenCalledWith({ name: 'my-token', expirationDate }, user.userId)
  })
})
