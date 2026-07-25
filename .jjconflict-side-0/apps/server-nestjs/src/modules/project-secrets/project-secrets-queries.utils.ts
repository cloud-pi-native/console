import type { Prisma } from '@prisma/client'

export const projectSlugSelect = {
  slug: true,
} satisfies Prisma.ProjectSelect

export type ProjectSlug = Prisma.ProjectGetPayload<{
  select: typeof projectSlugSelect
}>

export function getProjectSlug(tx: Prisma.TransactionClient, projectId: string) {
  return tx.project.findUnique({ where: { id: projectId }, select: projectSlugSelect })
}
