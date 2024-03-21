import type { Log, User } from '@prisma/client'
import prisma from '@/prisma.js'
import { exclude } from '@cpn-console/shared'

// SELECT
export const getAllLogsForUser = async (user: User, offset = 0) => {
  return prisma.log.findMany({
    where: { userId: user.id },
    take: 100,
    skip: offset,
  })
}

export const getAllLogs = async ({ offset = 0, limit = 5 }: { offset?: number, limit?: number }) => {
  return await prisma.$transaction([
    prisma.log.count(),
    prisma.log.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      skip: Number(offset),
      take: Number(limit),
    }),
  ])
}

// CREATE
export const addLogs = async (action: Log['action'], data: Record<string, any>, userId: User['id'], requestId: string = '') => {
  // if (data?.args) delete data?.args
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
export const _dropLogsTable = async () => {
  await prisma.log.deleteMany({})
}

export const _createLog = async (data: Parameters<typeof prisma.log.upsert>[0]['create']) => {
  return prisma.log.upsert({
    where: {
      id: data.id,
    },
    create: data,
    update: data,
  })
}
