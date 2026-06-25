import type { projectRoleContract } from '@cpn-console/shared'
import type { Project, ProjectRole } from '@prisma/client'
import { isSystemRoleType } from '@cpn-console/shared'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../../infrastructure/database/prisma.service.js'
import { projectSelect } from '../project/project-queries.utils.js'

const oidcRegexp = /^\/[^/]+/

type ProjectRoleResponse = Omit<ProjectRole, 'permissions'> & { permissions: string }

@Injectable()
export class ProjectRolesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  async listRoles(projectId: Project['id']) {
    const roles = await this.prisma.projectRole.findMany({ where: { projectId }, orderBy: { position: 'asc' } })
    return roles.map(role => this.toResponse(role))
  }

  async patchRoles(projectId: Project['id'], roles: typeof projectRoleContract.patchProjectRoles.body._type) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { slug: true } })
    if (!project) throw new NotFoundException('Projet introuvable')

    const dbRoles = await this.prisma.projectRole.findMany({ where: { projectId }, orderBy: { position: 'asc' } })
    const positionsAvailable: number[] = []
    const updatedRoles: (Omit<ProjectRole, 'permissions'> & { permissions: bigint })[] = []

    for (const dbRole of dbRoles) {
      const matchingRole = roles.find(role => role.id === dbRole.id)
      if (!matchingRole) continue

      if (isSystemRoleType(dbRole.type)) {
        throw new BadRequestException('Ce rôle système ne peut pas être modifié')
      }
      if (isSystemRoleType(matchingRole.type)) {
        throw new BadRequestException('Impossible de modifier un rôle en rôle système')
      }
      if (typeof matchingRole.position !== 'undefined' && !positionsAvailable.includes(matchingRole.position)) {
        positionsAvailable.push(matchingRole.position)
      }
      if (matchingRole.oidcGroup && !matchingRole.oidcGroup.startsWith('/')) {
        throw new BadRequestException('oidcGroup doit commencer par /')
      }

      updatedRoles.push({
        id: dbRole.id,
        name: matchingRole.name ?? dbRole.name,
        permissions: matchingRole.permissions ? BigInt(matchingRole.permissions) : dbRole.permissions,
        position: matchingRole.position ?? dbRole.position,
        oidcGroup: matchingRole.oidcGroup ? `/${project.slug}${matchingRole.oidcGroup}` : dbRole.oidcGroup,
        type: matchingRole.type ?? dbRole.type,
        projectId: dbRole.projectId,
      })
    }

    if (positionsAvailable.length && positionsAvailable.length !== dbRoles.length) {
      throw new BadRequestException('Les numéros de position des rôles sont incohérentes')
    }

    for (const { id, ...role } of updatedRoles) {
      await this.prisma.projectRole.update({ where: { id }, data: role })
    }

    await this.emitProjectUpsert(projectId)
    return this.listRoles(projectId)
  }

  async createRole(projectId: Project['id'], role: typeof projectRoleContract.createProjectRole.body._type) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { slug: true } })
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
    const role = await this.prisma.projectRole.findUnique({ where: { id: roleId }, select: { type: true, projectId: true } })
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
    return null
  }

  private async emitProjectUpsert(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: projectSelect })
    if (project) {
      await this.eventEmitter.emitAsync('project.upsert', project)
    }
  }

  private toResponse(role: ProjectRole): ProjectRoleResponse {
    return {
      ...role,
      permissions: role.permissions.toString(),
      oidcGroup: role.oidcGroup ? role.oidcGroup.replace(oidcRegexp, '') : role.oidcGroup,
    }
  }
}
