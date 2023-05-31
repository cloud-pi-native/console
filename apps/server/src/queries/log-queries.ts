import { Logs, Users } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export const getAllLogsForUser = async (user: Users, offset = 0) => {
  return prisma.logs.findMany({
    where: { userId: user.id },
    take: 100,
    skip: offset,
  })
}

export const getAllLogs = async ({ offset = 0, limit = 5 }: { offset?: number, limit?: number }) => {
  return await prisma.$transaction([
    prisma.logs.count(),
    prisma.logs.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      skip: Number(offset),
      take: Number(limit),
    }),
  ])
}

// CREATE
export const addLogs = async (action: Logs['action'], data: Logs['data'], userId: Users['id']) => {
  return prisma.logs.create({
    data: {
      action,
      userId,
      data,
    },
  })
}

// TECH
export const _dropLogsTable = async () => {
  await prisma.logs.deleteMany({})
}

export const _createLog = async (data: Parameters<typeof prisma.logs.upsert>[0]['create']) => {
  return prisma.logs.upsert({
    where: {
      id: data.id,
    },
    create: data,
    update: data,
  })
}
