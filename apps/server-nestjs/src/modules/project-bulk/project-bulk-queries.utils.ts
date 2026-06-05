import type { Prisma } from '@prisma/client'

export const projectNotArchivedSelect = {
  id: true,
} satisfies Prisma.ProjectSelect

export type ProjectIdNotArchived = Prisma.ProjectGetPayload<{
  select: typeof projectNotArchivedSelect
}>

export function listProjectIdsNotArchived(tx: Prisma.TransactionClient): Promise<ProjectIdNotArchived[]> {
  return tx.project.findMany({
    select: projectNotArchivedSelect,
    where: { status: { not: 'archived' } },
  })
}
