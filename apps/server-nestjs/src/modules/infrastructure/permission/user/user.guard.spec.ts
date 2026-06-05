import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { UserPolicyConfig } from './user-policy.service'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeExecutionContext } from '../../auth/auth-testing.utils'
import { AuthService } from '../../auth/auth.service'
import { UserPolicy } from './user-policy.service'
import { UserGuard } from './user.guard'
import { UserService } from './user.service'

describe('userGuard', () => {
  let module: TestingModule
  let guard: UserGuard
  let authService: DeepMockProxy<AuthService>
  let userService: DeepMockProxy<UserService>
  let userPolicy: DeepMockProxy<UserPolicy>

  beforeEach(async () => {
    authService = mockDeep<AuthService>()
    userService = mockDeep<UserService>()
    userPolicy = mockDeep<UserPolicy>()

    module = await Test.createTestingModule({
      providers: [
        UserGuard,
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
        { provide: UserPolicy, useValue: userPolicy },
      ],
    }).compile()

    guard = module.get(UserGuard)
  })

  it('throws 401 when the auth service rejects the request', async () => {
    authService.authenticate.mockRejectedValue(new UnauthorizedException())
    userPolicy.build.mockReturnValue({ adminPermissions: [], userTypes: [] })
    const ctx = makeExecutionContext({})

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('authenticates without loading optional auth data when no policy metadata is set', async () => {
    authService.authenticate.mockResolvedValue({ userId: 'u1' })
    userPolicy.build.mockReturnValue({ adminPermissions: [], userTypes: [] })
    const httpRequest = { headers: { 'x-dso-token': 'tok' } }
    const ctx = makeExecutionContext(httpRequest.headers)

    const result = await guard.canActivate(ctx)
    const request = ctx.switchToHttp().getRequest()

    expect(result).toBe(true)
    expect(authService.authenticate).toHaveBeenCalledWith(
      expect.anything(),
      { includeAdminRoleIds: false, includeUserType: false },
    )
    expect(authService.authenticate.mock.calls[0]?.[0]?.headers).toEqual(httpRequest.headers)
    expect(request.userId).toBe('u1')
  })

  it('validates required admin permissions', async () => {
    authService.authenticate.mockResolvedValue({ userId: 'u1', adminPermissions: 32768n })
    const policy: UserPolicyConfig = { adminPermissions: ['ListSystem'], userTypes: [] }
    userPolicy.build.mockReturnValue(policy)
    const httpRequest = { headers: { 'x-dso-token': 'tok' } }
    const ctx = makeExecutionContext(httpRequest.headers)

    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(authService.authenticate).toHaveBeenCalledWith(
      expect.anything(),
      { includeAdminRoleIds: true, includeUserType: false },
    )
    expect(authService.authenticate.mock.calls[0]?.[0]?.headers).toEqual(httpRequest.headers)
    expect(userService.validate).toHaveBeenCalled()
  })

  it('throws 403 when required admin permissions are missing', async () => {
    authService.authenticate.mockResolvedValue({ userId: 'u1', adminPermissions: 0n })
    const policy: UserPolicyConfig = { adminPermissions: ['ManageSystem'], userTypes: [] }
    userPolicy.build.mockReturnValue(policy)
    userService.validate.mockImplementation(() => { throw new ForbiddenException() })
    const ctx = makeExecutionContext({ headers: { 'x-dso-token': 'tok' } })

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException)
  })

  it('validates required user types', async () => {
    authService.authenticate.mockResolvedValue({ userId: 'u1', userType: 'human' })
    const policy: UserPolicyConfig = { adminPermissions: [], userTypes: ['human'] }
    userPolicy.build.mockReturnValue(policy)
    const httpRequest = { headers: { 'x-dso-token': 'tok' } }
    const ctx = makeExecutionContext(httpRequest.headers)

    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(authService.authenticate).toHaveBeenCalledWith(
      expect.anything(),
      { includeAdminRoleIds: false, includeUserType: true },
    )
    expect(authService.authenticate.mock.calls[0]?.[0]?.headers).toEqual(httpRequest.headers)
    expect(userService.validate).toHaveBeenCalled()
  })
})
