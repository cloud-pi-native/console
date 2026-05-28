import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { AuthenticatedContext } from './authenticated.guard'
import { AdminAuthorized } from '@cpn-console/shared'
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ADMIN_PERMISSIONS_KEY } from './admin-permission.decorator'

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedContext & FastifyRequest>()
    if (typeof request.adminPermissions !== 'bigint') {
      throw new UnauthorizedException()
    }

    const requiredPermissions = this.reflector.get<(keyof typeof AdminAuthorized)[]>(
      ADMIN_PERMISSIONS_KEY,
      context.getHandler(),
    )

    if (!requiredPermissions?.length) {
      return true
    }

    const hasPermission = requiredPermissions.every(
      permName => AdminAuthorized[permName](request.adminPermissions),
    )

    if (!hasPermission) {
      throw new ForbiddenException()
    }

    return true
  }
}
