import type { AdminRole, adminRoleContract } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { toAdminRoles } from './admin-role.utils'

@Injectable()
export class AdminRoleService {
  private readonly logger = new Logger(AdminRoleService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  @StartActiveSpan()
  async list(): Promise<AdminRole[]> {
    const span = trace.getActiveSpan()
    this.logger.log('adminRole.list started')
    const roles = await this.prisma.adminRole.findMany({
      orderBy: { position: 'asc' },
    })
    span?.setAttribute('admin_role.count', roles.length)
    this.logger.log(`adminRole.list completed (count=${roles.length})`)
    return toAdminRoles(roles)
  }

  @StartActiveSpan()
  async create(body: typeof adminRoleContract.createAdminRole.body._type): Promise<AdminRole> {
    const span = trace.getActiveSpan()
    this.logger.log(`adminRole.create started (name=${body.name})`)
    const created = await this.prisma.$transaction(async (tx) => {
      const maxPosition = (await tx.adminRole.findFirst({
        orderBy: { position: 'desc' },
        select: { position: true },
      }))?.position ?? -1

      return tx.adminRole.create({
        data: {
          name: body.name,
          permissions: 0n,
          position: maxPosition + 1,
        },
      })
    })

    span?.setAttribute('admin_role.id', created.id)
    const createdRole = await this.prisma.adminRole.findUnique({ where: { id: created.id } })
    if (!createdRole) {
      throw new NotFoundException(`Role with id ${created.id} not found`)
    }
    const createdMembers = await this.prisma.user.findMany({
      where: { adminRoleIds: { has: created.id } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
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
    this.logger.log(`adminRole.create completed (id=${created.id})`)
    return this.list()
  }

  @StartActiveSpan()
  async patch(
    roles: typeof adminRoleContract.patchAdminRoles.body._type,
  ): Promise<AdminRole[]> {
    const span = trace.getActiveSpan()
    this.logger.log(`adminRole.patch started (count=${roles.length})`)

    const dbRoles = await this.prisma.adminRole.findMany({
      orderBy: { position: 'asc' },
    })
    const positionsAvailable: number[] = []
    const updatedRoles: Array<{ id: string, data: Prisma.AdminRoleUpdateInput }> = []

    for (const dbRole of dbRoles) {
      const matchingRole = roles.find(role => role.id === dbRole.id)
      if (!matchingRole) continue

      if (typeof matchingRole.position !== 'undefined' && !positionsAvailable.includes(matchingRole.position)) {
        positionsAvailable.push(matchingRole.position)
      }

      updatedRoles.push({
        id: dbRole.id,
        data: {
          name: matchingRole.name ?? dbRole.name,
          permissions: typeof matchingRole.permissions !== 'undefined' ? BigInt(matchingRole.permissions) : dbRole.permissions,
          position: matchingRole.position ?? dbRole.position,
          oidcGroup: matchingRole.oidcGroup ?? dbRole.oidcGroup,
          type: matchingRole.type ?? dbRole.type,
        },
      })
    }

    if (positionsAvailable.length && positionsAvailable.length !== dbRoles.length) {
      throw new BadRequestException('Les numéros de position des rôles sont incohérentes')
    }

    await this.prisma.$transaction(async (tx) => {
      for (const { id, data } of updatedRoles) {
        await tx.adminRole.update({ where: { id }, data })
      }
    })

    await Promise.all(updatedRoles.map(async ({ id }) => {
      const role = await this.prisma.adminRole.findUnique({ where: { id } })
      if (!role) {
        throw new NotFoundException(`Role with id ${id} not found`)
      }
      const members = await this.prisma.user.findMany({
        where: { adminRoleIds: { has: id } },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      })
      await this.eventEmitter.emitAsync('adminRole.upsert', {
        ...role,
        members: members.map(({ id: memberId, email, firstName, lastName }) => ({
          id: memberId,
          email,
          firstName,
          lastName,
        })),
      })
    }))
    span?.setAttribute('admin_role.updated.count', updatedRoles.length)
    this.logger.log(`adminRole.patch completed (updated=${updatedRoles.length})`)
    return this.list()
  }

  @StartActiveSpan()
  async memberCounts() {
    const span = trace.getActiveSpan()
    this.logger.log('adminRole.memberCounts started')
    const roles = await this.prisma.adminRole.findMany({
      where: { oidcGroup: { equals: '' } },
      select: { id: true },
    })
    const roleIds = roles.map(role => role.id)
    const users = await this.prisma.user.findMany({
      where: { adminRoleIds: { hasSome: roleIds } },
      select: { adminRoleIds: true },
    })

    const counts: Record<string, number> = Object.fromEntries(roleIds.map(roleId => [roleId, 0]))
    for (const { adminRoleIds } of users) {
      for (const roleId of adminRoleIds) {
        if (typeof counts[roleId] === 'number') {
          counts[roleId]++
        }
      }
    }

    span?.setAttribute('admin_role.member_counts.count', Object.keys(counts).length)
    this.logger.log(`adminRole.memberCounts completed (roles=${Object.keys(counts).length})`)
    return counts
  }

  @StartActiveSpan()
  async delete(roleId: string): Promise<void> {
    const span = trace.getActiveSpan()
    this.logger.log(`adminRole.delete started (id=${roleId})`)

    const role = await this.prisma.adminRole.findUnique({ where: { id: roleId } })
    if (!role) {
      throw new NotFoundException()
    }

    const members = await this.prisma.user.findMany({
      where: { adminRoleIds: { has: roleId } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
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

    const users = await this.prisma.user.findMany({
      where: { adminRoleIds: { has: roleId } },
      select: { id: true, adminRoleIds: true },
    })

    await this.prisma.$transaction(async (tx) => {
      for (const user of users) {
        await tx.user.update({
          where: { id: user.id },
          data: { adminRoleIds: user.adminRoleIds.filter(adminRoleId => adminRoleId !== roleId) },
        })
      }
      await tx.adminRole.delete({ where: { id: roleId } })
    })

    span?.setAttribute('admin_role.deleted.user_count', users.length)
    this.logger.log(`adminRole.delete completed (id=${roleId}, userCount=${users.length})`)
  }
}
