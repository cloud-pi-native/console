import type {
  Prisma,

  Project,
} from '@prisma/client'

import prisma from '@old-server/prisma'

export const listMembers = (projectId: Project['id']) => prisma.projectMembers.findMany({ where: { projectId }, include: { user: true } })

export function upsertMember(data: Prisma.ProjectMembersUncheckedCreateInput) {
  return prisma.projectMembers.upsert({
    where: {
      projectId_userId: {
        userId: data.userId,
        projectId: data.projectId,
      },
    },
    create: data,
    update: {
      roleIds: data.roleIds,
    },
    include: { user: true },
  })
}

export function deleteMember(data: Prisma.ProjectMembersWhereUniqueInput['projectId_userId']) {
  return prisma.projectMembers.delete({
    where: {
      projectId_userId: data,
    },
  })
}
