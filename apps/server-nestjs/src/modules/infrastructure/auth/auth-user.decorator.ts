import type { ExecutionContext } from '@nestjs/common'
import type { User } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import { createParamDecorator } from '@nestjs/common'

export interface UserContext {
  userId: string
  adminPermissions?: bigint
  adminRoleIds?: string[]
  userType?: User['type']
}

export const AuthUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest<UserContext & FastifyRequest>()
    return {
      userId: request.userId,
      adminPermissions: request.adminPermissions,
      adminRoleIds: request.adminRoleIds,
      userType: request.userType,
    }
  },
)
