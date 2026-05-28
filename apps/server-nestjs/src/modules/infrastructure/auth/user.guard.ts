import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { tokenHeaderName } from '@cpn-console/shared'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

export interface UserContext {
  id: string
  adminPermissions: bigint
}

export interface RequestWithUserContext extends FastifyRequest {
  user?: UserContext
}

@Injectable()
export class UserGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUserContext>()
    const tokenValue = request.headers[tokenHeaderName]

    if (typeof tokenValue !== 'string') {
      throw new UnauthorizedException()
    }

    const { userId, adminPermissions } = await this.authService.validateToken(tokenValue)
    request.user = { id: userId, adminPermissions }

    return true
  }
}
