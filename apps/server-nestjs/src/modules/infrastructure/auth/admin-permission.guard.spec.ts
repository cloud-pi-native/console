import type { ExecutionContext } from '@nestjs/common'
import type { HttpArgumentsHost } from '@nestjs/common/interfaces'
import type { TestingModule } from '@nestjs/testing'
import type { FastifyRequest } from 'fastify'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { AuthenticatedContext } from './authenticated.guard'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AdminPermissionGuard } from './admin-permission.guard'

function makeContext(): DeepMockProxy<ExecutionContext> {
  const context = mockDeep<ExecutionContext>()
  const httpArgumentsHost = mockDeep<HttpArgumentsHost>()
  const request = mockDeep<AuthenticatedContext & FastifyRequest>()

  httpArgumentsHost.getRequest.mockReturnValue(request)
  context.switchToHttp.mockReturnValue(httpArgumentsHost)
  context.getHandler.mockReturnValue(vi.fn())

  return context
}

describe('adminPermissionGuard', () => {
  let module: TestingModule
  let guard: AdminPermissionGuard
  let reflector: Reflector

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AdminPermissionGuard,
        Reflector,
      ],
    }).compile()

    guard = module.get<AdminPermissionGuard>(AdminPermissionGuard)
    reflector = module.get<Reflector>(Reflector)
  })

  it('should throw 401 when adminPermissions is missing on request', async () => {
    const ctx = makeContext()
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('should pass when no permission metadata is set', async () => {
    vi.spyOn(reflector, 'get').mockReturnValue(undefined)
    const ctx = makeContext()
    ctx.switchToHttp().getRequest<AuthenticatedContext & FastifyRequest>().adminPermissions = 0n

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
  })

  it('should pass when user has required permission (ListSystem)', async () => {
    // LIST_SYSTEM = bit(15) = 32768n
    vi.spyOn(reflector, 'get').mockReturnValue(['ListSystem'])
    const ctx = makeContext()
    ctx.switchToHttp().getRequest<AuthenticatedContext & FastifyRequest>().adminPermissions = 32768n

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
  })

  it('should throw 403 when user lacks required permission', async () => {
    vi.spyOn(reflector, 'get').mockReturnValue(['ManageSystem'])
    const ctx = makeContext()
    ctx.switchToHttp().getRequest<AuthenticatedContext & FastifyRequest>().adminPermissions = 0n

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException)
  })

  it('should pass when user has MANAGE (superadmin override)', async () => {
    // MANAGE = bit(1) = 2n — overrides all permissions
    vi.spyOn(reflector, 'get').mockReturnValue(['ManageSystem'])
    const ctx = makeContext()
    ctx.switchToHttp().getRequest<AuthenticatedContext & FastifyRequest>().adminPermissions = 2n

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
  })
})
