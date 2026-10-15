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

export type AddMemberInput = { email: string } | { userId: string }
export interface PatchMemberInput { userId: string, roles: string[] }

export function listProjectMembersWithUser(tx: Prisma.TransactionClient, projectId: string) {
  return tx.projectMembers.findMany({
    where: { projectId },
    include: projectMemberWithUser,
  })
}

export function upsertProjectMember(
  tx: Prisma.TransactionClient,
  projectId: string,
  member: PatchMemberInput,
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

export function getProjectOwnerId(tx: Prisma.TransactionClient, projectId: string) {
  return tx.project.findUnique({ where: { id: projectId }, select: projectOwnerIdSelect })
}
