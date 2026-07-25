import type { AdminAuthorized } from '@cpn-console/shared'
import type { ExecutionContext } from '@nestjs/common'
import type { User as PrismaUser } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ADMIN_PERMISSIONS_KEY } from './user-admin-permission.decorator'
import { USER_TYPES_KEY } from './user-type.decorator'

export interface UserPolicyConfig {
  adminPermissions: (keyof typeof AdminAuthorized)[]
  userTypes: PrismaUser['type'][]
}

@Injectable()
export class UserPermissionPolicy {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  build(context: ExecutionContext): UserPolicyConfig {
    const targets = [context.getHandler(), context.getClass()]
    return {
      adminPermissions: this.reflector.getAllAndOverride<(keyof typeof AdminAuthorized)[] | undefined>(ADMIN_PERMISSIONS_KEY, targets) ?? [],
      userTypes: this.reflector.getAllAndOverride<PrismaUser['type'][] | undefined>(USER_TYPES_KEY, targets) ?? [],
    }
  }
}
