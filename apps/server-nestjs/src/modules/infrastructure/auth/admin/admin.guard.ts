import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { AdminPolicyConfig } from './admin-policy.service'
import { Inject, Injectable } from '@nestjs/common'
import { AuthService } from '../auth.service'
import { AdminPolicy } from './admin-policy.service'
import { AdminService } from './admin.service'

type RequestWithAuthContext = FastifyRequest & {
  userId?: string
  adminPermissions?: bigint
  userType?: string
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AdminService) private readonly adminService: AdminService,
    @Inject(AdminPolicy) private readonly adminPolicy: AdminPolicy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.adminPolicy.build(context)
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>()
    const requirements = makeRequirements(policy)

    const user = await this.authService.authenticateHeaders(request.headers, requirements)

    request.userId = user.userId
    if (user.adminPermissions !== undefined) request.adminPermissions = user.adminPermissions
    if (user.userType !== undefined) request.userType = user.userType

    this.adminService.validate(policy, user)

    return true
  }
}

function makeRequirements(policy: AdminPolicyConfig) {
  return {
    includeAdminRoleIds: policy.adminPermissions.length > 0,
    includeUserType: policy.userTypes.length > 0,
  }
}
