import type { ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { AuthenticatedContext } from './authenticated.guard'
import { createParamDecorator } from '@nestjs/common'

export const Authenticated = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedContext & FastifyRequest>()
    return {
      userId: request.userId,
      adminPermissions: request.adminPermissions,
    }
  },
)
