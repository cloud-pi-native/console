import type { User as PrismaUser } from '@prisma/client'
import type { UserContext } from '../../auth/auth-user.decorator'
import type { UserPolicyConfig } from './user-policy.service'
import { AdminAuthorized } from '@cpn-console/shared'
import { ForbiddenException, Injectable, Logger } from '@nestjs/common'

@Injectable()
export class UserPermissionService {
  private readonly logger = new Logger(UserPermissionService.name)

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
      this.logger.warn(`User auth denied: missing admin permissions (adminPermissions=${adminPermissions?.toString()}, policy=${JSON.stringify(policy)})`)
      throw new ForbiddenException('Permissions administrateur insuffisantes')
    }
  }

  validateUserType(policy: UserPolicyConfig, userType: string | undefined): void {
    if (!policy.userTypes.length) return
    if (typeof userType !== 'string' || !policy.userTypes.includes(userType as PrismaUser['type'])) {
      this.logger.warn(`User auth denied: invalid user type (userType=${userType}, policy=${JSON.stringify(policy)})`)
      throw new ForbiddenException('Cannot find requestor in request context')
    }
  }
}
