import type { AdminAuthorized, ProjectAuthorized } from '@cpn-console/shared'
import type { ExecutionContext } from '@nestjs/common'
import type { Project, User } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ADMIN_PERMISSIONS_KEY } from '../user/user-admin-permission.decorator'
import { USER_TYPES_KEY } from '../user/user-type.decorator'
import { PROJECT_ACCESS_KEY } from './project-access.decorator'
import { PROJECT_LOCKED_KEY } from './project-locked.decorator'
import { PROJECT_PERMISSION_KEY } from './project-permission.decorator'
import { PROJECT_STATUS_KEY } from './project-status.decorator'

export interface ProjectPolicyConfig {
  adminPermissions: (keyof typeof AdminAuthorized)[]
  userTypes: User['type'][]
  projectPermissions: (keyof typeof ProjectAuthorized)[]
  projectStatuses: Project['status'][]
  projectLocked?: boolean
  projectAccess: boolean
}

@Injectable()
export class ProjectPolicy {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  build(context: ExecutionContext): ProjectPolicyConfig {
    const targets = [context.getHandler(), context.getClass()]
    return {
      adminPermissions: this.reflector.getAllAndOverride<(keyof typeof AdminAuthorized)[] | undefined>(ADMIN_PERMISSIONS_KEY, targets) ?? [],
      userTypes: this.reflector.getAllAndOverride<User['type'][] | undefined>(USER_TYPES_KEY, targets) ?? [],
      projectPermissions: this.reflector.getAllAndOverride<(keyof typeof ProjectAuthorized)[] | undefined>(PROJECT_PERMISSION_KEY, targets) ?? [],
      projectStatuses: this.reflector.getAllAndOverride<Project['status'][] | undefined>(PROJECT_STATUS_KEY, targets) ?? [],
      projectLocked: this.reflector.getAllAndOverride<boolean | undefined>(PROJECT_LOCKED_KEY, targets),
      projectAccess: this.reflector.getAllAndOverride<boolean | undefined>(PROJECT_ACCESS_KEY, targets) ?? false,
    }
  }
}
