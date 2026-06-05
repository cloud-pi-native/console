import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { ProjectContext } from './project.guard'
import type { UserContext } from './user.guard'
import { PROJECT_PERMS, ProjectAuthorized } from '@cpn-console/shared'
import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PROJECT_PERMISSION_KEY } from './project-permission.decorator'

interface RequestWithProjectAndUser extends FastifyRequest {
  project?: ProjectContext
  user?: UserContext
}

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithProjectAndUser>()
    const requiredPermissions = this.reflector.get<(keyof typeof ProjectAuthorized)[]>(
      PROJECT_PERMISSION_KEY,
      context.getHandler(),
    )

    if (!requiredPermissions?.length) {
      return true
    }

    const project = request.project
    const userId = request.user?.id
    if (!project || !userId) {
      throw new ForbiddenException()
    }

    const adminPermissions = request.user?.adminPermissions ?? 0n
    const projectPermissions = resolveProjectPermissions(project, userId)

    const hasPermission = requiredPermissions.every(
      permName => ProjectAuthorized[permName]({ adminPermissions, projectPermissions }),
    )

    if (!hasPermission) {
      throw new ForbiddenException()
    }

    return true
  }
}

function resolveProjectPermissions(project: ProjectContext, userId: string): bigint | undefined {
  if (project.ownerId === userId) {
    return PROJECT_PERMS.MANAGE
  }

  const member = project.members.find(m => m.userId === userId)
  if (!member) {
    return undefined
  }

  const memberRoles = project.roles.filter(role => member.roleIds.includes(role.id))
  return memberRoles.reduce(
    (acc, curr) => acc | curr.permissions,
    project.everyonePerms | PROJECT_PERMS.GUEST,
  )
}
