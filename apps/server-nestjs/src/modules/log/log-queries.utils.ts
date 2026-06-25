import type { Prisma } from '@prisma/client'

const logSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  action: true,
  userId: true,
  requestId: true,
  projectId: true,
  data: true,
} satisfies Prisma.LogSelect

export type LogSelect = Prisma.LogGetPayload<{
  select: typeof logSelect
}>

export function countLogs(tx: Prisma.TransactionClient, projectId: string | null | undefined) {
  return tx.log.count({ where: { projectId } })
}

export function listLogs(tx: Prisma.TransactionClient, projectId: string | null | undefined, offset: number, limit: number) {
  return tx.log.findMany({
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    where: { projectId },
    select: logSelect,
  })
}
