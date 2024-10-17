import type { Log, Prisma, Project, User } from '@prisma/client'
import { exclude } from '@cpn-console/shared'
import prisma from '@/prisma.js'

// SELECT
export function getAllLogsForUser(user: User, offset = 0) {
  return prisma.log.findMany({
    where: { userId: user.id },
    take: 100,
    skip: offset,
  })
}

export function getAllLogs({ skip = 0, take = 5, where }: Prisma.LogFindManyArgs) {
  return prisma.$transaction([
    prisma.log.count({ where }),
    prisma.log.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
      where,
    }),
  ])
}

// CREATE
interface AddLogsArgs {
  action: Log['action']
  data: Record<string, any>
  userId?: User['id'] | null
  requestId: string
  projectId?: Project['id']
}
export function addLogs({ action, data, requestId, userId = null, projectId }: AddLogsArgs) {
  return prisma.log.create({
    data: {
      action,
      userId,
      data: exclude(data, ['cluster', 'user', 'newCreds']),
      requestId,
      projectId,
    },
  })
}

// TECH
export function _createLog(data: Parameters<typeof prisma.log.upsert>[0]['create']) {
  return prisma.log.upsert({
    where: {
      id: data.id,
    },
    create: data,
    update: data,
  })
}
