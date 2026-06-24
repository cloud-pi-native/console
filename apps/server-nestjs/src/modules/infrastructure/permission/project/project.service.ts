import type { ProjectStatus, User } from '@prisma/client'
import type { UserContext } from '../../auth/auth.service.js'
import type { ProjectContext } from './project.guard'
import type { ProjectPolicyConfig } from './project.policy'
import { AdminAuthorized, ProjectAuthorized } from '@cpn-console/shared'
import { ForbiddenException, Injectable, Logger } from '@nestjs/common'

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name)

  validate(policy: ProjectPolicyConfig, project: ProjectContext, user: UserContext): void {
    this.validateUserType(policy, user.userType)
    this.validateProjectStatus(policy, project.status)
    this.validateProjectLock(policy, project.locked)
    this.validateProjectAccess(policy, project, user)
    this.validateProjectPermissions(policy, project, user)
  }

  validateProjectStatus(policy: ProjectPolicyConfig, projectStatus: ProjectStatus | undefined): void {
    if (policy.projectStatuses.length > 0 && (!projectStatus || !policy.projectStatuses.includes(projectStatus))) {
      this.logger.warn(`project auth denied: invalid project status (projectStatus=${projectStatus}, policy=${JSON.stringify(policy)})`)
      throw new ForbiddenException('Statut de projet invalide')
    }
  }

  validateProjectLock(policy: ProjectPolicyConfig, projectLocked: boolean | undefined): void {
    if (policy.projectLocked !== undefined && projectLocked !== policy.projectLocked) {
      this.logger.warn(`project auth denied: invalid lock status (projectLocked=${projectLocked}, policy=${JSON.stringify(policy)})`)
      throw new ForbiddenException('État de verrouillage invalide')
    }
  }

  validateUserType(policy: ProjectPolicyConfig, userType: string | undefined): void {
    if (!policy.userTypes.length) return
    if (typeof userType !== 'string' || !policy.userTypes.includes(userType as User['type'])) {
      this.logger.warn(`project auth denied: invalid user type (userType=${userType}, policy=${JSON.stringify(policy)})`)
      throw new ForbiddenException('Cannot find requestor in request context')
    }
  }

  validateProjectAccess(policy: ProjectPolicyConfig, project: ProjectContext, user: UserContext): void {
    if (!policy.projectAccess) return

    const adminPermissions = user.adminPermissions ?? 0n
    const hasAccess = AdminAuthorized.Manage(adminPermissions) || Boolean(project.projectPermissions)
    if (!hasAccess) {
      this.logger.warn(
        `project auth denied: missing project access (projectId=${project.id}, projectSlug=${project.slug}, userId=${user.userId}, adminPermissions=${user.adminPermissions?.toString()}, projectPermissions=${project.projectPermissions?.toString()}, policy=${JSON.stringify(policy)})`,
      )
      throw new ForbiddenException('Permissions insuffisantes pour ce projet')
    }
  }

  validateProjectPermissions(policy: ProjectPolicyConfig, project: ProjectContext, user: UserContext): void {
    if (!policy.projectPermissions.length) return

    const hasPermission = policy.projectPermissions.every(
      permName => ProjectAuthorized[permName]({
        adminPermissions: user.adminPermissions,
        projectPermissions: project.projectPermissions,
      }),
    )

    if (!hasPermission) {
      this.logger.warn(
        `project auth denied: missing project permissions (projectId=${project.id}, projectSlug=${project.slug}, userId=${user.userId}, adminPermissions=${user.adminPermissions?.toString()}, projectPermissions=${project.projectPermissions?.toString()}, policy=${JSON.stringify(policy)})`,
      )
      throw new ForbiddenException('Permissions insuffisantes pour ce projet')
    }
  }
}
