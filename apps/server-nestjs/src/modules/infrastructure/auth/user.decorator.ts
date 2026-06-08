import type { ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from './auth.service'
import { createParamDecorator } from '@nestjs/common'

export const User = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest<UserContext & FastifyRequest>()
    return {
      userId: request.userId,
      adminPermissions: request.adminPermissions,
    }
  },
)
