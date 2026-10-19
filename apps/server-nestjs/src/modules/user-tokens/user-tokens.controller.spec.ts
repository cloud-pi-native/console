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
      token: {
        id: faker.string.uuid(),
        name: 'my-token',
        lastUse: null,
        expirationDate,
        status: 'active' as const,
        createdAt: new Date(),
        userId: user.userId,
        owner: { id: user.userId, email: faker.internet.email(), firstName: 'a', lastName: 'b', type: 'human' as const },
      },
      password: faker.string.alphanumeric(48),
    })

    await controller.create({ name: 'my-token', expirationDate }, user)

    expect(service.create).toHaveBeenCalledWith({ name: 'my-token', expirationDate }, user.userId)
  })

  it('maps creation result to the exposed contract shape', async () => {
    const expirationDate = faker.date.soon({ days: 1, refDate: endOfToday().getTime() })
    const createdAt = faker.date.past()
    const password = faker.string.alphanumeric(48)
    service.create.mockResolvedValueOnce({
      token: {
        id: faker.string.uuid(),
        name: 'my-token',
        lastUse: null,
        expirationDate,
        status: 'active' as const,
        createdAt,
        userId: user.userId,
        owner: { id: user.userId, email: faker.internet.email(), firstName: 'a', lastName: 'b', type: 'human' as const },
      },
      password,
    })

    const result = await controller.create({ name: 'my-token', expirationDate }, user)

    expect(result).toEqual({
      id: expect.any(String),
      name: 'my-token',
      lastUse: null,
      expirationDate: expirationDate.toISOString(),
      status: 'active',
      createdAt: createdAt.toISOString(),
      owner: expect.any(Object),
      password,
    })
    expect('userId' in result).toBe(false)
  })

  it('maps listed records to the contract shape', async () => {
    const record = {
      id: faker.string.uuid(),
      name: 'my-token',
      lastUse: null,
      expirationDate: faker.date.soon({ days: 1, refDate: endOfToday().getTime() }),
      status: 'active' as const,
      createdAt: faker.date.past(),
      userId: user.userId,
      owner: { id: user.userId, email: faker.internet.email(), firstName: 'a', lastName: 'b', type: 'human' as const },
    }
    service.list.mockResolvedValueOnce([record])

    const result = await controller.list(user)

    expect(result).toEqual([{
      id: record.id,
      name: record.name,
      lastUse: null,
      expirationDate: record.expirationDate.toISOString(),
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      owner: record.owner,
    }])
  })
})
