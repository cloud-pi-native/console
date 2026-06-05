import type { AdminAuthorized } from '@cpn-console/shared'
import type { ExecutionContext } from '@nestjs/common'
import type { User as PrismaUser } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { USER_TYPES_KEY } from '../user-type.decorator'
import { ADMIN_PERMISSIONS_KEY } from './admin-permission.decorator'

export interface AdminPolicyConfig {
  adminPermissions: (keyof typeof AdminAuthorized)[]
  userTypes: PrismaUser['type'][]
}

@Injectable()
export class AdminPolicy {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  build(context: ExecutionContext): AdminPolicyConfig {
    const targets = [context.getHandler(), context.getClass()]
    return {
      adminPermissions: this.reflector.getAllAndOverride<(keyof typeof AdminAuthorized)[] | undefined>(ADMIN_PERMISSIONS_KEY, targets) ?? [],
      userTypes: this.reflector.getAllAndOverride<PrismaUser['type'][] | undefined>(USER_TYPES_KEY, targets) ?? [],
    }
  }
}
