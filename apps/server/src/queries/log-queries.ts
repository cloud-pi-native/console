import { Logs, Users } from '@prisma/client'
import prisma from '@/prisma.js'
import { d } from 'vitest/dist/types-2b1c412e'

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
      // TODO
      // take: limit,
      // skip: offset,
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

export const _createLog = async (data: Parameters<typeof prisma.logs.upsert>[0]['create']) => {
  return prisma.logs.upsert({
    where: {
      id: data.id,
    },
    create: data,
    update: data,
  })
}
