import type { User as PrismaUser } from '@prisma/client'
import type { UserContext } from '../../auth/auth.service'
import type { UserPolicyConfig } from './user-policy.service'
import { AdminAuthorized } from '@cpn-console/shared'
import { ForbiddenException, Injectable } from '@nestjs/common'

@Injectable()
export class UserService {
  validate(policy: UserPolicyConfig, user: UserContext): void {
    this.validateAdminPermissions(policy, user.adminPermissions)
    this.validateUserType(policy, user.userType)
  }

  validateAdminPermissions(policy: UserPolicyConfig, adminPermissions: bigint | undefined): void {
    if (!policy.adminPermissions.length) return

    const hasPermission = policy.adminPermissions.every(
      permName => AdminAuthorized[permName](adminPermissions ?? 0n),
    )

    if (!hasPermission) {
      throw new ForbiddenException()
    }
  }

  validateUserType(policy: UserPolicyConfig, userType: string | undefined): void {
    if (!policy.userTypes.length) return
    if (typeof userType !== 'string' || !policy.userTypes.includes(userType as PrismaUser['type'])) {
      throw new ForbiddenException('Cannot find requestor in request context')
    }
  }
}
