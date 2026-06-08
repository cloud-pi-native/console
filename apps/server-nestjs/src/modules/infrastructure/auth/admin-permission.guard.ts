import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { AdminAuthorized } from '@cpn-console/shared'
import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ADMIN_PERMISSIONS_KEY } from './admin-permission.decorator'
import { AuthService } from './auth.service'

type RequestWithPermissions = FastifyRequest & {
  userId?: string
  adminPermissions?: bigint
}

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithPermissions>()
    const user = await this.authService.authenticateHeaders(request.headers)

    request.userId = user.userId
    request.adminPermissions = user.adminPermissions

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
