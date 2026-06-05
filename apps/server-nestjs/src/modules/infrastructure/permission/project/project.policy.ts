import type { ProjectAuthorized } from '@cpn-console/shared'
import type { ExecutionContext } from '@nestjs/common'
import type { Project } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PROJECT_LOCKED_KEY } from './project-locked.decorator'
import { PROJECT_PERMISSION_KEY } from './project-permission.decorator'
import { PROJECT_STATUS_KEY } from './project-status.decorator'

export interface ProjectPolicyConfig {
  projectPermissions: (keyof typeof ProjectAuthorized)[]
  projectStatuses: Project['status'][]
  projectLocked?: boolean
}

@Injectable()
export class ProjectPolicy {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  build(context: ExecutionContext): ProjectPolicyConfig {
    const targets = [context.getHandler(), context.getClass()]
    return {
      projectPermissions: this.reflector.getAllAndOverride<(keyof typeof ProjectAuthorized)[] | undefined>(PROJECT_PERMISSION_KEY, targets) ?? [],
      projectStatuses: this.reflector.getAllAndOverride<Project['status'][] | undefined>(PROJECT_STATUS_KEY, targets) ?? [],
      projectLocked: this.reflector.getAllAndOverride<boolean | undefined>(PROJECT_LOCKED_KEY, targets),
    }
  }
}
