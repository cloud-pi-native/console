import type { projectMemberContract } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'

export const projectMemberWithUser = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.ProjectMembersInclude

export type ProjectMemberWithUser = Prisma.ProjectMembersGetPayload<{
  include: typeof projectMemberWithUser
}>

export function listProjectMembersWithUser(db: Prisma.TransactionClient, projectId: string) {
  return db.projectMembers.findMany({
    where: { projectId },
    include: projectMemberWithUser,
  })
}

export function upsertProjectMember(
  tx: Prisma.TransactionClient,
  projectId: string,
  member: typeof projectMemberContract.patchMembers.body._type[number],
) {
  const { userId, roles } = member
  return tx.projectMembers.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, roleIds: roles },
    update: { roleIds: roles },
  })
}

export function upsertProjectMemberIfMissing(tx: Prisma.TransactionClient, projectId: string, userId: string) {
  return tx.projectMembers.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, roleIds: [] },
    update: {},
  })
}

export function createProjectMember(tx: Prisma.TransactionClient, projectId: string, userId: string) {
  return tx.projectMembers.create({ data: { projectId, userId } })
}

export function deleteProjectMember(tx: Prisma.TransactionClient, projectId: string, userId: string) {
  return tx.projectMembers.delete({ where: { projectId_userId: { projectId, userId } } })
}
