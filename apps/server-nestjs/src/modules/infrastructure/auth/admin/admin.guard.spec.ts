import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { AdminPolicyConfig } from './admin-policy.service'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeExecutionContext } from '../auth-testing.utils'
import { AuthService } from '../auth.service'
import { AdminPolicy } from './admin-policy.service'
import { AdminGuard } from './admin.guard'
import { AdminService } from './admin.service'

describe('adminGuard', () => {
  let module: TestingModule
  let guard: AdminGuard
  let authService: DeepMockProxy<AuthService>
  let adminService: DeepMockProxy<AdminService>
  let adminPolicy: DeepMockProxy<AdminPolicy>

  beforeEach(async () => {
    authService = mockDeep<AuthService>()
    adminService = mockDeep<AdminService>()
    adminPolicy = mockDeep<AdminPolicy>()

    module = await Test.createTestingModule({
      providers: [
        AdminGuard,
        { provide: AuthService, useValue: authService },
        { provide: AdminService, useValue: adminService },
        { provide: AdminPolicy, useValue: adminPolicy },
      ],
    }).compile()

    guard = module.get(AdminGuard)
  })

  it('throws 401 when the auth service rejects the request', async () => {
    authService.authenticateHeaders.mockRejectedValue(new UnauthorizedException())
    adminPolicy.build.mockReturnValue({ adminPermissions: [], userTypes: [] })
    const ctx = makeExecutionContext({})

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('authenticates without loading optional auth data when no policy metadata is set', async () => {
    authService.authenticateHeaders.mockResolvedValue({ userId: 'u1' })
    adminPolicy.build.mockReturnValue({ adminPermissions: [], userTypes: [] })
    const ctx = makeExecutionContext({ 'x-dso-token': 'tok' })

    const result = await guard.canActivate(ctx)
    const request = ctx.switchToHttp().getRequest()

    expect(result).toBe(true)
    expect(authService.authenticateHeaders).toHaveBeenCalledWith(
      { 'x-dso-token': 'tok' },
      { includeAdminRoleIds: false, includeUserType: false },
    )
    expect(request.userId).toBe('u1')
  })

  it('validates required admin permissions', async () => {
    authService.authenticateHeaders.mockResolvedValue({ userId: 'u1', adminPermissions: 32768n })
    const policy: AdminPolicyConfig = { adminPermissions: ['ListSystem'], userTypes: [] }
    adminPolicy.build.mockReturnValue(policy)
    const ctx = makeExecutionContext({ 'x-dso-token': 'tok' })

    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(authService.authenticateHeaders).toHaveBeenCalledWith(
      { 'x-dso-token': 'tok' },
      { includeAdminRoleIds: true, includeUserType: false },
    )
    expect(adminService.validate).toHaveBeenCalled()
  })

  it('throws 403 when required admin permissions are missing', async () => {
    authService.authenticateHeaders.mockResolvedValue({ userId: 'u1', adminPermissions: 0n })
    const policy: AdminPolicyConfig = { adminPermissions: ['ManageSystem'], userTypes: [] }
    adminPolicy.build.mockReturnValue(policy)
    adminService.validate.mockImplementation(() => { throw new ForbiddenException() })
    const ctx = makeExecutionContext({ 'x-dso-token': 'tok' })

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException)
  })

  it('validates required user types', async () => {
    authService.authenticateHeaders.mockResolvedValue({ userId: 'u1', userType: 'human' })
    const policy: AdminPolicyConfig = { adminPermissions: [], userTypes: ['human'] }
    adminPolicy.build.mockReturnValue(policy)
    const ctx = makeExecutionContext({ 'x-dso-token': 'tok' })

    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(authService.authenticateHeaders).toHaveBeenCalledWith(
      { 'x-dso-token': 'tok' },
      { includeAdminRoleIds: false, includeUserType: true },
    )
    expect(adminService.validate).toHaveBeenCalled()
  })
})
