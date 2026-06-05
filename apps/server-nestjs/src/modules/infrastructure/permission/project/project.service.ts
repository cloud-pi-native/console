import type { ProjectStatus } from '@prisma/client'
import type { UserContext } from '../../auth/auth.service.js'
import type { ProjectContext } from './project.guard'
import type { ProjectPolicyConfig } from './project.policy'
import { ProjectAuthorized } from '@cpn-console/shared'
import { ForbiddenException, Injectable } from '@nestjs/common'

@Injectable()
export class ProjectService {
  validate(policy: ProjectPolicyConfig, project: ProjectContext, user: UserContext): void {
    this.validateProjectStatus(policy, project.status)
    this.validateProjectLock(policy, project.locked)
    this.validateProjectPermissions(policy, project, user)
  }

  validateProjectStatus(policy: ProjectPolicyConfig, projectStatus: ProjectStatus | undefined): void {
    if (policy.projectStatuses.length > 0 && (!projectStatus || !policy.projectStatuses.includes(projectStatus))) {
      throw new ForbiddenException()
    }
  }

  validateProjectLock(policy: ProjectPolicyConfig, projectLocked: boolean | undefined): void {
    if (policy.projectLocked !== undefined && projectLocked !== policy.projectLocked) {
      throw new ForbiddenException()
    }
  }

  validateProjectPermissions(policy: ProjectPolicyConfig, project: ProjectContext, user: UserContext): void {
    if (!policy.projectPermissions.length) return

    const hasPermission = policy.projectPermissions.every(
      permName => ProjectAuthorized[permName]({ adminPermissions: user.adminPermissions, projectPermissions: project.projectPermissions }),
    )

    if (!hasPermission) {
      throw new ForbiddenException()
    }
  }
}
