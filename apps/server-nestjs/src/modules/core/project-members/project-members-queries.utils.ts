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

export const projectOwnerIdSelect = {
  ownerId: true,
} satisfies Prisma.ProjectSelect

export type ProjectMemberWithUser = Prisma.ProjectMembersGetPayload<{
  include: typeof projectMemberWithUser
}>

export type ProjectOwnerId = Prisma.ProjectGetPayload<{
  select: typeof projectOwnerIdSelect
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

export function getHumanUser(tx: Prisma.TransactionClient, opts: { userId?: string, email?: string }) {
  const { userId, email } = opts
  return tx.user.findFirst({
    where: {
      type: 'human',
      ...(typeof userId === 'string' ? { id: userId } : {}),
      ...(typeof email === 'string' ? { email } : {}),
    },
  })
}

export function getProjectOwnerId(db: Prisma.TransactionClient, projectId: string) {
  return db.project.findUnique({ where: { id: projectId }, select: projectOwnerIdSelect })
}
