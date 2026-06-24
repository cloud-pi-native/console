import type { Prisma } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { ProjectContext } from './project.guard.js'
import { PROJECT_PERMS } from '@cpn-console/shared'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service.js'

type RequestWithProjectParams = FastifyRequest<{ Params?: ProjectParams }>

export interface ProjectRequirements {
  includeStatus?: boolean
  includeLocked?: boolean
  includePermissions?: boolean
}

interface ProjectParams {
  projectId?: string
  projectSlug?: string
}

@Injectable()
export class ProjectLoaderService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async load(request: RequestWithProjectParams, userId: string, requirements?: ProjectRequirements): Promise<ProjectContext> {
    let where: { id: string } | { slug: string }
    if (request.params?.projectId) {
      where = isUuid(request.params.projectId) ? { id: request.params.projectId } : { slug: request.params.projectId }
    } else if (request.params?.projectSlug) {
      where = { slug: request.params.projectSlug }
    } else {
      throw new BadRequestException('projectId or projectSlug is required')
    }

    const raw = await this.prisma.project.findUnique({
      where,
      select: makeProjectSelect(requirements),
    })
    if (!raw) throw new NotFoundException('Projet introuvable')

    const project: ProjectContext = {
      id: raw.id,
      slug: raw.slug,
    }

    if (requirements?.includeStatus) {
      project.status = raw.status
    }
    if (requirements?.includeLocked) {
      project.locked = raw.locked
    }
    if (requirements?.includePermissions) {
      project.projectPermissions = this.resolveProjectPermissions(raw, userId)
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
