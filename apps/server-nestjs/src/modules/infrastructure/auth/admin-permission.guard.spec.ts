import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AdminPermissionGuard } from './admin-permission.guard'
import { makeContext } from './auth-testing.utils'
import { AuthService } from './auth.service'

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

    guard = module.get(AdminPermissionGuard)
    reflector = module.get(Reflector)
  })

  it('should throw 401 when x-dso-token header is missing', async () => {
    const ctx = makeContext({})

    authService.authenticateHeaders.mockRejectedValue(new UnauthorizedException())
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('should pass when no permission metadata is set', async () => {
    authService.authenticateHeaders.mockResolvedValue({ userId: 'u1', adminPermissions: 0n })
    vi.spyOn(reflector, 'get').mockReturnValue(undefined)
    const ctx = makeContext({ 'x-dso-token': 'tok' })

    const result = await guard.canActivate(ctx)
    const request = ctx.switchToHttp().getRequest()

    expect(result).toBe(true)
    expect(request.userId).toBe('u1')
    expect(request.adminPermissions).toBe(0n)
  })

  it('should pass when user has required permission', async () => {
    authService.authenticateHeaders.mockResolvedValue({ userId: 'u1', adminPermissions: 32768n })
    vi.spyOn(reflector, 'get').mockReturnValue(['ListSystem'])
    const ctx = makeContext({ 'x-dso-token': 'tok' })

    const result = await guard.canActivate(ctx)
    const request = ctx.switchToHttp().getRequest()

    expect(result).toBe(true)
    expect(request.userId).toBe('u1')
    expect(request.adminPermissions).toBe(32768n)
  })

  it('should throw 403 when user lacks required permission', async () => {
    authService.authenticateHeaders.mockResolvedValue({ userId: 'u1', adminPermissions: 0n })
    vi.spyOn(reflector, 'get').mockReturnValue(['ManageSystem'])
    const ctx = makeContext({ 'x-dso-token': 'tok' })

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException)
  })

  it('should treat missing permissions as forbidden when metadata exists', async () => {
    authService.authenticateHeaders.mockResolvedValue({ userId: 'u1', adminPermissions: 0n })
    vi.spyOn(reflector, 'get').mockReturnValue(['ManageSystem'])
    const ctx = makeContext({ 'x-dso-token': 'tok' })

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException)
  })
})
