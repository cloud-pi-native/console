import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Prisma, Project as PrismaProject } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { RequestWithUserContext } from './user.guard'
import { PROJECT_PERMS } from '@cpn-console/shared'
import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

export interface ProjectContext {
  permissions?: bigint
  id: string
  slug: string
  ownerId: string
  locked: boolean
  status: PrismaProject['status']
  everyonePerms: bigint
  roles: Array<{ id: string, permissions: bigint }>
  members: Array<{ userId: string, roleIds: string[] }>
}

export interface RequestWithProjectContext extends FastifyRequest {
  project?: ProjectContext
}

interface ProjectParams {
  projectId?: string
  projectSlug?: string
}

@Injectable()
export class ProjectContextGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
    RequestWithProjectContext & RequestWithUserContext & FastifyRequest<{ Params?: ProjectParams }>
    >()
    const userId = request.user?.id
    if (typeof userId !== 'string') {
      throw new UnauthorizedException()
    }

    let where: Prisma.ProjectWhereUniqueInput
    if (request.params?.projectId) {
      where = { id: request.params.projectId }
    } else if (request.params?.projectSlug) {
      where = { slug: request.params.projectSlug }
    } else {
      throw new BadRequestException('projectId or projectSlug is required')
    }

    const project = await this.prisma.project.findUnique({
      where,
      select: {
        id: true,
        slug: true,
        ownerId: true,
        locked: true,
        status: true,
        everyonePerms: true,
        roles: { select: { id: true, permissions: true } },
        members: { select: { userId: true, roleIds: true } },
      },
    })
    if (!project) throw new NotFoundException()

    const permissions = resolveProjectPermissions(project, userId)
    request.project = { ...project, permissions } satisfies ProjectContext
    return true
  }
}

function resolveProjectPermissions(
  project: Pick<ProjectContext, 'id' | 'ownerId' | 'locked' | 'status' | 'everyonePerms' | 'roles' | 'members'>,
  userId: string,
) {
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
