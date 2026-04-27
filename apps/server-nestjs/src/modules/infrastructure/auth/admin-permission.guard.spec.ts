import type { ExecutionContext } from '@nestjs/common'
import type { HttpArgumentsHost } from '@nestjs/common/interfaces'
import type { TestingModule } from '@nestjs/testing'
import type { FastifyRequest } from 'fastify'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AdminPermissionGuard } from './admin-permission.guard'
import { AuthService } from './auth.service'

function makeContext(headers: FastifyRequest['headers'] = {}): DeepMockProxy<ExecutionContext> {
  const context = mockDeep<ExecutionContext>()
  const httpArgumentsHost = mockDeep<HttpArgumentsHost>()
  const request = mockDeep<FastifyRequest>()

  request.headers = headers
  httpArgumentsHost.getRequest.mockReturnValue(request)
  context.switchToHttp.mockReturnValue(httpArgumentsHost)
  context.getHandler.mockReturnValue(vi.fn())

  return context
}

describe('adminPermissionGuard', () => {
  let module: TestingModule
  let guard: AdminPermissionGuard
  let authService: DeepMockProxy<AuthService>
  let reflector: Reflector

  beforeEach(async () => {
    authService = mockDeep<AuthService>()

    module = await Test.createTestingModule({
      providers: [
        AdminPermissionGuard,
        Reflector,
        { provide: AuthService, useValue: authService },
      ],
    }).compile()

    guard = module.get<AdminPermissionGuard>(AdminPermissionGuard)
    reflector = module.get<Reflector>(Reflector)
  })

  it('should throw 401 when x-dso-token header is missing', async () => {
    const ctx = makeContext({})

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('should throw 401 when token validation fails', async () => {
    authService.validateToken.mockRejectedValue(new UnauthorizedException('Not authenticated'))
    const ctx = makeContext({ 'x-dso-token': 'bad-token' })

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('should pass when no permission metadata is set', async () => {
    authService.validateToken.mockResolvedValue({ userId: 'u1', adminPermissions: 0n })
    vi.spyOn(reflector, 'get').mockReturnValue(undefined)
    const ctx = makeContext({ 'x-dso-token': 'tok' })

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
  })

  it('should pass when user has required permission (ListSystem)', async () => {
    // LIST_SYSTEM = bit(15) = 32768n
    authService.validateToken.mockResolvedValue({ userId: 'u1', adminPermissions: 32768n })
    vi.spyOn(reflector, 'get').mockReturnValue(['ListSystem'])
    const ctx = makeContext({ 'x-dso-token': 'tok' })

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
  })

  it('should throw 403 when user lacks required permission', async () => {
    authService.validateToken.mockResolvedValue({ userId: 'u1', adminPermissions: 0n })
    vi.spyOn(reflector, 'get').mockReturnValue(['ManageSystem'])
    const ctx = makeContext({ 'x-dso-token': 'tok' })

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException)
  })

  it('should pass when user has MANAGE (superadmin override)', async () => {
    // MANAGE = bit(1) = 2n — overrides all permissions
    authService.validateToken.mockResolvedValue({ userId: 'u1', adminPermissions: 2n })
    vi.spyOn(reflector, 'get').mockReturnValue(['ManageSystem'])
    const ctx = makeContext({ 'x-dso-token': 'tok' })

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
  })
})
