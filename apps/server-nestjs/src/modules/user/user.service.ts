import type { Prisma, User } from '@prisma/client'
import type { ClientInferResponseBody } from '@ts-rest/core'
import type { userContract } from '@cpn-console/shared'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PrismaService } from '../infrastructure/database/prisma.service'
import {
  createUser as createUserQuery,
  getAdminRolesByName,
  getUsers,
  getUsersByIds,
  updateUserAdminRoleIds,
} from './user-queries.utils'

type AllUsersResponse = ClientInferResponseBody<typeof userContract.getAllUsers, 200>
type MatchingUsersResponse = ClientInferResponseBody<typeof userContract.getMatchingUsers, 200>
type PatchUsersResponse = ClientInferResponseBody<typeof userContract.patchUsers, 200>

function toContractUser(user: User): AllUsersResponse[number] {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    adminRoleIds: user.adminRoleIds,
    type: user.type,
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  async getAllUsers(
    query: typeof userContract.getAllUsers.query._type,
    relationType: 'OR' | 'AND' = 'AND',
  ): Promise<AllUsersResponse> {
    const whereInputs: Prisma.UserWhereInput[] = []
    if (query.adminRoleIds?.length) {
      whereInputs.push({ adminRoleIds: { hasEvery: query.adminRoleIds } })
    }
    if (query.adminRoles?.length) {
      const roles = query.adminRoles
        ? await getAdminRolesByName(this.prisma, query.adminRoles)
        : []

      const adminRoleNameNotFound = query.adminRoles?.find(nameQueried => !roles.some(({ name }) => name === nameQueried))
      if (adminRoleNameNotFound) {
        throw new Error(`Unable to find adminRole ${adminRoleNameNotFound}`)
      }
      whereInputs.push({ adminRoleIds: { hasEvery: roles.map(({ id }) => id) } })
    }
    if (query.memberOfIds) {
      whereInputs.push({
        AND: query.memberOfIds.map(id => ({
          OR: [
            { projectsOwned: { some: { id } } },
            { ProjectMembers: { some: { project: { id } } } },
          ],
        })),
      })
    }

    return (await getUsers(this.prisma, { [relationType]: whereInputs })).map(toContractUser)
  }

  async getMatchingUsers(
    query: typeof userContract.getMatchingUsers.query._type,
  ): Promise<MatchingUsersResponse> {
    const AND: Prisma.UserWhereInput[] = []
    if (query.notInProjectId) {
      AND.push({ projectMembers: { none: { projectId: query.notInProjectId } } })
      AND.push({ projectsOwned: { none: { id: query.notInProjectId } } })
    }
    const filter = { contains: query.letters, mode: 'insensitive' } as const
    if (query.letters) {
      AND.push({
        OR: [{
          email: filter,
        }, {
          firstName: filter,
        }, {
          lastName: filter,
        }],
      })
      AND.push({ type: 'human' })
    }

    return (await getUsers(this.prisma, { AND })).map(toContractUser)
  }

  async createUser(
    data: Omit<User, 'createdAt' | 'updatedAt'>,
  ): Promise<User> {
    return createUserQuery(this.prisma, data)
  }

  async patchUsers(
    users: { id: string, adminRoleIds: string[] | null }[],
  ): Promise<PatchUsersResponse> {
    for (const user of users) {
      if (user.adminRoleIds) {
        await updateUserAdminRoleIds(this.prisma, user.id, user.adminRoleIds)
      }
    }

    // Mirror legacy: hook.adminRole.upsert for impacted roles
    for (const user of users) {
      for (const roleId of user.adminRoleIds ?? []) {
        await this.eventEmitter.emitAsync('adminRole.upsert', { roleId })
      }
    }

    return (await getUsers(this.prisma, { id: { in: users.map(({ id }) => id) } })).map(toContractUser)
  }

  async deleteUser(userId: string): Promise<void> {
    this.logger.warn(`deleteUser not yet implemented for userId=${userId}`)
  }
}
