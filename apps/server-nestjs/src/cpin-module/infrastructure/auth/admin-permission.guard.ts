import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { AdminAuthorized, tokenHeaderName } from '@cpn-console/shared'
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ADMIN_PERMISSIONS_KEY } from './admin-permission.decorator'
import { AuthService } from './auth.service'

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const tokenValue = request.headers[tokenHeaderName]

    if (typeof tokenValue !== 'string') {
      throw new UnauthorizedException()
    }

    const { adminPermissions } = await this.authService.validateToken(tokenValue)

    const requiredPermissions = this.reflector.get<(keyof typeof AdminAuthorized)[]>(
      ADMIN_PERMISSIONS_KEY,
      context.getHandler(),
    )

    if (!requiredPermissions?.length) {
      return true
    }

    const hasPermission = requiredPermissions.every(
      permName => AdminAuthorized[permName](adminPermissions),
    )

    if (!hasPermission) {
      throw new ForbiddenException()
    }

    return true
  }
}
