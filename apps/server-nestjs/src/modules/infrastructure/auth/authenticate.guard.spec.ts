import type { ExecutionContext } from '@nestjs/common'
import type { HttpArgumentsHost } from '@nestjs/common/interfaces'
import type { TestingModule } from '@nestjs/testing'
import type { FastifyRequest } from 'fastify'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { AuthenticatedContext } from './authenticated.guard'
import { UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AuthService } from './auth.service'
import { AuthenticatedGuard } from './authenticated.guard'

function makeContext(headers: FastifyRequest['headers'] = {}): DeepMockProxy<ExecutionContext> {
  const context = mockDeep<ExecutionContext>()
  const httpArgumentsHost = mockDeep<HttpArgumentsHost>()
  const request = mockDeep<AuthenticatedContext & FastifyRequest>()

  request.headers = headers
  httpArgumentsHost.getRequest.mockReturnValue(request)
  context.switchToHttp.mockReturnValue(httpArgumentsHost)

  return context
}

describe('authenticatedGuard', () => {
  let module: TestingModule
  let guard: AuthenticatedGuard
  let authService: DeepMockProxy<AuthService>

  beforeEach(async () => {
    authService = mockDeep<AuthService>()

    module = await Test.createTestingModule({
      providers: [
        AuthenticatedGuard,
        { provide: AuthService, useValue: authService },
      ],
    }).compile()

    guard = module.get(AuthenticatedGuard)
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

  it('should attach userId and adminPermissions to request', async () => {
    authService.validateToken.mockResolvedValue({ userId: 'u1', adminPermissions: 123n })
    const ctx = makeContext({ 'x-dso-token': 'tok' })
    const request = ctx.switchToHttp().getRequest<AuthenticatedContext & FastifyRequest>()

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
    expect(request.userId).toBe('u1')
    expect(request.adminPermissions).toBe(123n)
  })
})
