import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { AuthService } from '../../auth/auth.service'
import { UserPermissionPolicy } from './user-policy.service'
import { UserPermissionService } from './user.service'

type RequestWithAuthContext = FastifyRequest & {
  userId?: string
  adminPermissions?: bigint
  userType?: string
}

@Injectable()
export class UserGuard implements CanActivate {
  private readonly logger = new Logger(UserGuard.name)

  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(UserPermissionService) private readonly userService: UserPermissionService,
    @Inject(UserPermissionPolicy) private readonly userPolicy: UserPermissionPolicy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.userPolicy.build(context)
    const request = this.getRequest(context)
    const user = await this.authenticate(request)

    this.validate(policy, user)
    this.logger.debug(`User auth granted (requestId=${request.id}, userId=${user.userId}, adminPermissions=${user.adminPermissions?.toString()}, userType=${user.userType})`)

    return true
  }

  private getRequest(context: ExecutionContext): RequestWithAuthContext {
    return context.switchToHttp().getRequest<RequestWithAuthContext>()
  }

  private async authenticate(request: RequestWithAuthContext) {
    try {
      const user = await this.authService.authenticate(request, {
        includeAdminRoleIds: true,
        includeUserType: true,
      })

      request.userId = user.userId
      if (user.adminPermissions !== undefined) request.adminPermissions = user.adminPermissions
      if (user.userType !== undefined) request.userType = user.userType

      return user
    } catch (error) {
      this.logger.warn(`User auth ${error instanceof UnauthorizedException ? 'rejected' : 'denied'} (requestId=${request.id}, error=${error instanceof Error ? error.message : String(error)})`)
      throw error
    }
  }

  private validate(policy: ReturnType<UserPermissionPolicy['build']>, user: Awaited<ReturnType<UserGuard['authenticate']>>) {
    this.userService.validate(policy, user)
  }
}
