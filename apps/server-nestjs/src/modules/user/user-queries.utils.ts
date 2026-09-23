import type { AllUsersQuery, LettersQuery, PatchUsersBody } from '@cpn-console/shared'
import type { Prisma, User } from '@prisma/client'
import type { PrismaService } from '../infrastructure/database/prisma.service'
import { BadRequestException } from '@nestjs/common'

export function getUsers(tx: Prisma.TransactionClient, where?: Prisma.UserWhereInput) {
  return tx.user.findMany({ where })
}

export function getMatchingUsers(tx: Prisma.TransactionClient, where: Prisma.UserWhereInput) {
  return tx.user.findMany({
    where,
    take: 5,
  })
}

export function getUserByEmail(tx: Prisma.TransactionClient, email: User['email']) {
  return tx.user.findUnique({ where: { email } })
}

export function getAdminRolesByName(tx: Prisma.TransactionClient, names: string[]) {
  return tx.adminRole.findMany({ where: { name: { in: names } } })
}

export function updateUserAdminRoleIds(tx: Prisma.TransactionClient, id: User['id'], adminRoleIds: string[]) {
  return tx.user.update({
    where: { id },
    data: { adminRoleIds },
  })
}

export function createUser(tx: Prisma.TransactionClient, data: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'type'>) {
  return tx.user.create({ data })
}

export function patchUsers(tx: Prisma.TransactionClient, users: PatchUsersBody) {
  return Promise.all(users
    .filter((user): user is typeof user & { adminRoleIds: string[] } => user.adminRoleIds !== null)
    .map(user => updateUserAdminRoleIds(tx, user.id, user.adminRoleIds)))
}

export async function buildAllUsersWhere(
  prisma: PrismaService,
  query: AllUsersQuery,
  relationType: 'OR' | 'AND',
): Promise<Prisma.UserWhereInput> {
  const whereInputs: Prisma.UserWhereInput[] = []
  if (query.adminRoleIds?.length) {
    whereInputs.push({ adminRoleIds: { hasEvery: query.adminRoleIds } })
  }
  if (query.adminRoles?.length) {
    const roles = await getAdminRolesByName(prisma, query.adminRoles)
    const adminRoleNameNotFound = query.adminRoles.find(nameQueried => !roles.some(({ name }) => name === nameQueried))
    if (adminRoleNameNotFound) {
      throw new BadRequestException(`Unable to find adminRole ${adminRoleNameNotFound}`)
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
  return { [relationType]: whereInputs }
}

export function buildMatchingUsersWhere(query: LettersQuery): Prisma.UserWhereInput {
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
  return { AND }
}
