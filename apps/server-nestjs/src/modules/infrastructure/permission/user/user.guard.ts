import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { UserPolicyConfig } from './user-policy.service'
import { Inject, Injectable } from '@nestjs/common'
import { AuthService } from '../../auth/auth.service'
import { UserPolicy } from './user-policy.service'
import { UserService } from './user.service'

type RequestWithAuthContext = FastifyRequest & {
  userId?: string
  adminPermissions?: bigint
  userType?: string
}

@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(UserService) private readonly userService: UserService,
    @Inject(UserPolicy) private readonly userPolicy: UserPolicy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.userPolicy.build(context)
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>()
    const requirements = makeRequirements(policy)

    const user = await this.authService.authenticate(request, requirements)

    request.userId = user.userId
    if (user.adminPermissions !== undefined) request.adminPermissions = user.adminPermissions
    if (user.userType !== undefined) request.userType = user.userType

    this.userService.validate(policy, user)

    return true
  }
}

function makeRequirements(policy: UserPolicyConfig) {
  return {
    includeAdminRoleIds: policy.adminPermissions.length > 0,
    includeUserType: policy.userTypes.length > 0,
  }
}
