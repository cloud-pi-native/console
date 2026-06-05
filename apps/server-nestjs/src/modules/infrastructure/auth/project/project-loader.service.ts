import type { Prisma } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { ProjectContext } from './project.guard.js'
import { PROJECT_PERMS } from '@cpn-console/shared'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service.js'

interface ProjectParams {
  projectId?: string
  projectSlug?: string
}

type RequestWithProjectParams = FastifyRequest<{ Params?: ProjectParams }>

export interface ProjectRequirements {
  includeStatus?: boolean
  includeLocked?: boolean
  includePermissions?: boolean
}

@Injectable()
export class ProjectLoaderService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async load(request: RequestWithProjectParams, userId: string, requirements?: ProjectRequirements): Promise<ProjectContext> {
    let where: { id: string } | { slug: string }
    if (request.params?.projectId) {
      where = { id: request.params.projectId }
    } else if (request.params?.projectSlug) {
      where = { slug: request.params.projectSlug }
    } else {
      throw new BadRequestException('projectId or projectSlug is required')
    }

    const raw = await this.prisma.project.findUnique({
      where,
      select: makeProjectSelect(requirements),
    })
    if (!raw) throw new NotFoundException()

    const project: ProjectContext = {
      id: raw.id,
      slug: raw.slug,
    }

    if ('status' in raw && raw.status !== undefined) project.status = raw.status
    if ('locked' in raw && raw.locked !== undefined) project.locked = raw.locked

    if (requirements?.includePermissions && 'ownerId' in raw) {
      project.projectPermissions = this.resolveProjectPermissions(raw as any, userId)
    }

    return project
  }

  private resolveProjectPermissions(raw: { ownerId: string, everyonePerms: bigint, roles: Array<{ id: string, permissions: bigint }>, members: Array<{ userId: string, roleIds: string[] }> }, userId: string): bigint {
    if (raw.ownerId === userId) {
      return PROJECT_PERMS.MANAGE
    }

    const member = raw.members.find(m => m.userId === userId)
    if (!member) {
      return 0n
    }

    const memberRoles = raw.roles.filter(role => member.roleIds.includes(role.id))
    return memberRoles.reduce(
      (acc, curr) => acc | curr.permissions,
      raw.everyonePerms | PROJECT_PERMS.GUEST,
    )
  }
}

function makeProjectSelect(requirements?: ProjectRequirements): Prisma.ProjectSelect {
  const includePermissions = requirements?.includePermissions ?? true
  const includeStatus = requirements?.includeStatus ?? true
  const includeLocked = requirements?.includeLocked ?? true

  return {
    id: true,
    slug: true,
    ...(includeStatus ? { status: true } : {}),
    ...(includeLocked ? { locked: true } : {}),
    ...(includePermissions
      ? {
          ownerId: true,
          everyonePerms: true,
          roles: { select: { id: true, permissions: true } },
          members: { select: { userId: true, roleIds: true } },
        }
      : {}),
  } satisfies Prisma.ProjectSelect
}
