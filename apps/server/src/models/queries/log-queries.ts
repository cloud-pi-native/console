import { userInfo } from 'os'
import { prisma } from '../../connect.js'

// SELECT
export const getAllLogsForUser = async (user, offset = 0) => {
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

export const getAllLogs = async ({ offset, limit }) => {
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
export const addLogs = async (action, data, userId) => {
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
