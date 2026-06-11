import type { AdminRole as AdminRoleContract, adminRoleContract } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import {
  adminRoleSelect,
  createAdminRole,
  getAdminRoleMemberCounts,
  getRoles,
} from './admin-role-queries.utils'
import { toAdminRole, toAdminRoles } from './admin-role.utils'

@Injectable()
export class AdminRoleService {
  private readonly logger = new Logger(AdminRoleService.name)

  constructor(
    @Inject(PrismaService) public readonly prisma: PrismaService,
    @Inject(EventEmitter2) public readonly eventEmitter: EventEmitter2,
  ) {}

  @StartActiveSpan()
  async list(): Promise<AdminRoleContract[]> {
    const span = trace.getActiveSpan()
    this.logger.log('adminRole.list started')
    const roles = await getRoles(this.prisma)
    span?.setAttribute('admin_role.count', roles.length)
    this.logger.log(`adminRole.list completed (count=${roles.length})`)
    return toAdminRoles(roles)
  }

  @StartActiveSpan()
  async create(body: typeof adminRoleContract.createAdminRole.body._type): Promise<AdminRoleContract> {
    const span = trace.getActiveSpan()
    this.logger.log(`adminRole.create started (name=${body.name})`)

    const { role: createdRole, members: createdMembers } = await this.prisma.$transaction(async (tx) => {
      return createAdminRole(tx, body.name)
    })

    await this.eventEmitter.emitAsync('adminRole.upsert', {
      ...createdRole,
      members: createdMembers.map(({ id, email, firstName, lastName }) => ({
        id,
        email,
        firstName,
        lastName,
      })),
    })

    span?.setAttribute('admin_role.id', createdRole.id)
    this.logger.log(`adminRole.create completed (id=${createdRole.id})`)
    return toAdminRole(createdRole)
  }

  @StartActiveSpan()
  async patch(
    roles: typeof adminRoleContract.patchAdminRoles.body._type,
  ): Promise<AdminRoleContract[]> {
    const span = trace.getActiveSpan()
    this.logger.log(`adminRole.patch started (count=${roles.length})`)

    const patchResult = await this.prisma.$transaction(async (tx) => {
      const dbRoles = await getRoles(tx)
      const positionsAvailable: number[] = []
      const updatedRoles: Array<{ id: string, data: Prisma.AdminRoleUpdateInput }> = []

      for (const dbRole of dbRoles) {
        const matchingRole = roles.find(role => role.id === dbRole.id)
        if (!matchingRole) continue

        if (matchingRole.position !== undefined && !positionsAvailable.includes(matchingRole.position)) {
          positionsAvailable.push(matchingRole.position)
        }

        updatedRoles.push({
          id: dbRole.id,
          data: {
            name: matchingRole.name ?? dbRole.name,
            permissions: matchingRole.permissions === undefined ? dbRole.permissions : BigInt(matchingRole.permissions),
            position: matchingRole.position ?? dbRole.position,
            oidcGroup: matchingRole.oidcGroup ?? dbRole.oidcGroup,
            type: matchingRole.type ?? dbRole.type,
          },
        })
      }

      if (positionsAvailable.length && positionsAvailable.length !== dbRoles.length) {
        throw new BadRequestException('Les numéros de position des rôles sont incohérentes')
      }

      for (const { id, data } of updatedRoles) {
        await tx.adminRole.update({ where: { id }, data })
      }

      const results = await Promise.all(updatedRoles.map(async ({ id }) => {
        const role = await tx.adminRole.findFirst({
          where: { id },
          select: adminRoleSelect,
        })
        if (!role) {
          throw new NotFoundException(`Role with id ${id} not found`)
        }
        const members = await tx.user.findMany({
          where: { adminRoleIds: { has: id } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })

        return { role, members: members.map(({ id: memberId, email, firstName, lastName }) => ({
          id: memberId,
          email,
          firstName,
          lastName,
        })) }
      }))

      return results
    })

    await Promise.all(patchResult.map(({ role, members }) => this.eventEmitter.emitAsync('adminRole.upsert', {
      ...role,
      members,
    })))

    span?.setAttribute('admin_role.updated.count', patchResult.length)
    this.logger.log(`adminRole.patch completed (updated=${patchResult.length})`)
    return this.list()
  }

  @StartActiveSpan()
  async memberCounts() {
    const span = trace.getActiveSpan()
    this.logger.log('adminRole.memberCounts started')
    const counts = await this.prisma.$transaction(async tx => getAdminRoleMemberCounts(tx))

    span?.setAttribute('admin_role.member_counts.count', Object.keys(counts).length)
    this.logger.log(`adminRole.memberCounts completed (roles=${Object.keys(counts).length})`)
    return counts
  }

  @StartActiveSpan()
  async delete(roleId: string): Promise<void> {
    const span = trace.getActiveSpan()
    this.logger.log(`adminRole.delete started (id=${roleId})`)

    await this.prisma.$transaction(async (tx) => {
      const [role] = await tx.adminRole.findMany({
        where: { id: roleId },
        select: adminRoleSelect,
      })
      if (!role) {
        throw new NotFoundException()
      }

      const members = await tx.user.findMany({
        where: { adminRoleIds: { has: roleId } },
        select: { id: true, email: true, firstName: true, lastName: true },
      })

      const users = await tx.user.findMany({
        where: { adminRoleIds: { has: roleId } },
        select: { id: true, adminRoleIds: true },
      })

      await this.eventEmitter.emitAsync('adminRole.delete', {
        ...role,
        members: members.map(({ id, email, firstName, lastName }) => ({
          id,
          email,
          firstName,
          lastName,
        })),
      })

      for (const user of users) {
        await tx.user.update({
          where: { id: user.id },
          data: { adminRoleIds: user.adminRoleIds.filter(adminRoleId => adminRoleId !== roleId) },
        })
      }
      await tx.adminRole.delete({ where: { id: roleId } })

      span?.setAttribute('admin_role.deleted.user_count', users.length)
      this.logger.log(`adminRole.delete completed (id=${roleId}, userCount=${users.length})`)
    })
  }
}
