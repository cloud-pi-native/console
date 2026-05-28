import type { ExecutionContext } from '@nestjs/common'
import type { RequestWithUserContext, UserContext } from './user.guard'
import { createParamDecorator, UnauthorizedException } from '@nestjs/common'

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest<RequestWithUserContext>()
    if (!request.user) throw new UnauthorizedException()
    return request.user
  },
)
