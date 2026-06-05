import type { User as PrismaUser } from '@prisma/client'
import type { UserContext } from '../auth.service'
import type { AdminPolicyConfig } from './admin-policy.service'
import { AdminAuthorized } from '@cpn-console/shared'
import { ForbiddenException, Injectable } from '@nestjs/common'

@Injectable()
export class AdminService {
  validate(policy: AdminPolicyConfig, user: UserContext): void {
    this.validateAdminPermissions(policy, user.adminPermissions)
    this.validateUserType(policy, user.userType)
  }

  validateAdminPermissions(policy: AdminPolicyConfig, adminPermissions: bigint | undefined): void {
    if (!policy.adminPermissions.length) return

    const hasPermission = policy.adminPermissions.every(
      permName => AdminAuthorized[permName](adminPermissions ?? 0n),
    )

    if (!hasPermission) {
      throw new ForbiddenException()
    }
  }

  validateUserType(policy: AdminPolicyConfig, userType: string | undefined): void {
    if (!policy.userTypes.length) return
    if (typeof userType !== 'string' || !policy.userTypes.includes(userType as PrismaUser['type'])) {
      throw new ForbiddenException('Cannot find requestor in request context')
    }
  }
}
