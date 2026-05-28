import type { ExecutionContext } from '@nestjs/common'
import type { HttpArgumentsHost } from '@nestjs/common/interfaces'
import type { TestingModule } from '@nestjs/testing'
import type { FastifyRequest } from 'fastify'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { AuthenticatedContext } from './authenticated.guard'
import { faker } from '@faker-js/faker'
import { UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../database/prisma.service'
import { UserTypeGuard } from './user-type.guard'

function makeContext(request: Partial<AuthenticatedContext & FastifyRequest>): DeepMockProxy<ExecutionContext> {
  const context = mockDeep<ExecutionContext>()
  const httpArgumentsHost = mockDeep<HttpArgumentsHost>()
  const req = mockDeep<AuthenticatedContext & FastifyRequest>()

  Object.assign(req, request)
  httpArgumentsHost.getRequest.mockReturnValue(req)
  context.switchToHttp.mockReturnValue(httpArgumentsHost)
  context.getHandler.mockReturnValue(() => undefined)
  context.getClass.mockReturnValue(function TestController() { } as any)

  return context
}

describe('userTypeGuard', () => {
  let module: TestingModule
  let guard: UserTypeGuard
  let prisma: DeepMockProxy<PrismaService>
  let reflector: Reflector

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    module = await Test.createTestingModule({
      providers: [
        UserTypeGuard,
        Reflector,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    guard = module.get(UserTypeGuard)
    reflector = module.get(Reflector)
  })

  it('passes when no metadata is set', async () => {
    const ctx = makeContext({ userId: 'u1', adminPermissions: 0n })
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
  })

  it('throws 401 when userId is missing', async () => {
    const ctx = makeContext({ adminPermissions: 0n })
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['human'])
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('throws 401 when user type is not allowed', async () => {
    const ctx = makeContext({ userId: 'u1', adminPermissions: 0n })
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['human'])
    prisma.user.findUnique.mockResolvedValue({
      id: faker.string.uuid(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.past(),
      lastLogin: faker.date.past(),
      adminRoleIds: [],
      type: 'bot',
    })
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('passes when user type is allowed', async () => {
    const ctx = makeContext({ userId: 'u1', adminPermissions: 0n })
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['human', 'bot'])
    prisma.user.findUnique.mockResolvedValue({
      id: faker.string.uuid(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.past(),
      lastLogin: faker.date.past(),
      adminRoleIds: [],
      type: 'bot',
    })
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
  })
})
