import type { AllUsersQuerySchema, LettersQuery, PatchUsersBody } from '@cpn-console/shared'
import type { User } from '@prisma/client'
import type { z } from 'zod'
import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../infrastructure/database/prisma.service'
import {
  buildAllUsersWhere,
  buildMatchingUsersWhere,
  getMatchingUsers,
  getUsers,
  patchUsers,
} from './user-queries.utils'

@Injectable()
export class UserService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  async getAllUsers(
    query: z.infer<typeof AllUsersQuerySchema>,
    relationType: 'OR' | 'AND' = 'AND',
  ): Promise<User[]> {
    const where = await buildAllUsersWhere(this.prisma, query, relationType)
    return getUsers(this.prisma, where)
  }

  async getMatchingUsers(
    query: LettersQuery,
  ): Promise<User[]> {
    const where = buildMatchingUsersWhere(query)
    return getMatchingUsers(this.prisma, where)
  }

  async patchUsers(
    users: PatchUsersBody,
  ): Promise<User[]> {
    const usersBefore = await getUsers(this.prisma, { id: { in: users.map(({ id }) => id) } })
    await this.prisma.$transaction(tx => patchUsers(tx, users))
    await this.emitImpactedRoleEvents(users, usersBefore)
    return getUsers(this.prisma, { id: { in: users.map(({ id }) => id) } })
  }

  private async emitImpactedRoleEvents(
    users: PatchUsersBody,
    usersBefore: User[],
  ): Promise<void> {
    const impactedRoleIds = new Set<string>()
    for (const user of users) {
      usersBefore.find(({ id }) => id === user.id)?.adminRoleIds.forEach(roleId => impactedRoleIds.add(roleId))
      user.adminRoleIds?.forEach(roleId => impactedRoleIds.add(roleId))
    }
    for (const roleId of impactedRoleIds) {
      await this.eventEmitter.emitAsync('adminRole.upsert', { roleId })
    }
  }
}
