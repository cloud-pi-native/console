import type { Log, Prisma, User } from '@prisma/client'
import prisma from '@/prisma.js'
import { exclude } from '@cpn-console/shared'

// SELECT
export function getAllLogsForUser(user: User, offset = 0) {
  return prisma.log.findMany({
    where: { userId: user.id },
    take: 100,
    skip: offset,
  })
}

export function getAllLogs({ skip = 0, take = 5 }: Prisma.LogFindManyArgs) {
  return prisma.$transaction([
    prisma.log.count(),
    prisma.log.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    }),
  ])
}

// CREATE
export function addLogs(action: Log['action'], data: Record<string, any>, userId: User['id'], requestId: string = '') {
  return prisma.log.create({
    data: {
      action,
      userId,
      data: exclude(data, ['cluster', 'user', 'newCreds']),
      requestId,
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
