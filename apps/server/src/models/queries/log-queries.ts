import { Log, User } from '@prisma/client'
import prisma from '../../prisma'

// SELECT
export const getAllLogsForUser = async (user: User, offset = 0) => {
  const res = await prisma.log.findMany({
    where: { userId: user.id },
    take: 100,
    skip: offset,
  })
  return res
}
export const countAllLogs = async () => {
  const res = await prisma.log.aggregate({ _count: { id: true } })
  return res
}

export const getAllLogs = async ({ offset, limit }: { offset: number, limit: number}) => {
  const res = await prisma.log.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  })
  return res
}

// CREATE
export const addLogs = async (action: Log['action'], data: Log['data'], userId: User['id']) => {
  const res = await prisma.log.create({
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
  await prisma.log.deleteMany({})
}
