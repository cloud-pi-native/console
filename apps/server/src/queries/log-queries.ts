import { Logs, Users } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export const getAllLogsForUser = async (user: Users, offset = 0) => {
  const res = await prisma.logs.findMany({
    where: { userId: user.id },
    take: 100,
    skip: offset,
  })
  return res
}

export const getAllLogs = async ({ offset = 0, limit = 0 }: { offset?: number, limit?: number }) => {
  return prisma.$transaction([
    prisma.logs.count(),
    prisma.logs.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
  ])
}

// CREATE
export const addLogs = async (action: Logs['action'], data: Logs['data'], userId: Users['id']) => {
  const res = await prisma.logs.create({
    data: {
      action,
      userId,
      data,
    },
  })
  return res
}

// TECH
export const _dropLogsTable = async () => {
  await prisma.logs.deleteMany({})
}
