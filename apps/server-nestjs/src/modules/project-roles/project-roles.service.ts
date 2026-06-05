import type { Project, ProjectRole } from '@prisma/client'
import type {
  CreateProjectRoleInput,
  PatchProjectRolesInput,
} from './project-roles.utils'
import { isSystemRoleType } from '@cpn-console/shared'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { getProjectBySlug, getProjectForUpsert, getProjectRoleForDelete, projectRoleWithProjectSelect } from './project-roles.queries.utils'
import {
  buildUpdatedProjectRoles,
  toProjectRoleResponse,
  validatePatchedProjectRolePositions,
} from './project-roles.utils'

@Injectable()
export class ProjectRolesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  async listRoles(projectId: Project['id']) {
    const roles = await this.prisma.projectRole.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
      select: projectRoleWithProjectSelect,
    })
    return roles.map(role => toProjectRoleResponse(role))
  }

  async patchRoles(projectId: Project['id'], roles: PatchProjectRolesInput) {
    const project = await getProjectBySlug(this.prisma, projectId)
    if (!project) throw new NotFoundException('Projet introuvable')

    const dbRoles = await this.prisma.projectRole.findMany({ where: { projectId }, orderBy: { position: 'asc' } })
    const { requestedPositionsCount, updatedRoles } = buildUpdatedProjectRoles(project.slug, dbRoles, roles)
    validatePatchedProjectRolePositions(dbRoles.length, requestedPositionsCount)

    for (const { id, ...role } of updatedRoles) {
      await this.prisma.projectRole.update({ where: { id }, data: role })
    }

    await this.emitProjectUpsert(projectId)
    return this.listRoles(projectId)
  }

  async createRole(projectId: Project['id'], role: CreateProjectRoleInput) {
    const project = await getProjectBySlug(this.prisma, projectId)
    if (!project) throw new NotFoundException('Projet introuvable')
    if (isSystemRoleType(role.type)) {
      throw new BadRequestException('Impossible de créer un rôle système')
    }

    const dbMaxPosRole = (await this.prisma.projectRole.findFirst({
      where: { projectId },
      orderBy: { position: 'desc' },
      select: { position: true },
    }))?.position ?? -1

    if (role.oidcGroup && !role.oidcGroup.startsWith('/')) {
      throw new BadRequestException('oidcGroup doit commencer par /')
    }

    await this.prisma.projectRole.create({
      data: {
        ...role,
        projectId,
        position: dbMaxPosRole + 1,
        permissions: BigInt(role.permissions),
        oidcGroup: role.oidcGroup ? `/${project.slug}${role.oidcGroup}` : undefined,
      },
    })

    await this.emitProjectUpsert(projectId)
    return this.listRoles(projectId)
  }

  async countRolesMembers(projectId: Project['id']) {
    const roles = await this.listRoles(projectId)
    const members = await this.prisma.projectMembers.findMany({ where: { projectId } })
    const rolesCounts: Record<ProjectRole['id'], number> = Object.fromEntries(roles.map(role => [role.id, 0]))

    for (const { roleIds } of members) {
      for (const roleId of roleIds) {
        rolesCounts[roleId]++
      }
    }

    return rolesCounts
  }

  async deleteRole(roleId: ProjectRole['id']) {
    const role = await getProjectRoleForDelete(this.prisma, roleId)
    if (!role) throw new NotFoundException('Rôle introuvable')
    if (isSystemRoleType(role.type)) {
      throw new BadRequestException('Ce rôle système ne peut pas être supprimé')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectRole.delete({ where: { id: roleId } })
      const attachedMembers = await tx.projectMembers.findMany({
        where: { projectId: role.projectId, roleIds: { has: roleId } },
      })

      for (const member of attachedMembers) {
        await tx.projectMembers.update({
          where: {
            projectId_userId: {
              projectId: role.projectId,
              userId: member.userId,
            },
          },
          data: {
            roleIds: {
              set: member.roleIds.filter(existingRoleId => existingRoleId !== roleId),
            },
          },
        })
      }
    })

    await this.emitProjectUpsert(role.projectId)
  }

  private async emitProjectUpsert(projectId: string): Promise<void> {
    const project = await getProjectForUpsert(this.prisma, projectId)
    if (project) {
      await this.eventEmitter.emitAsync('project.upsert', project)
    }
  }
}
