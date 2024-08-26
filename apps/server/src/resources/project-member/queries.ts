import {
  Prisma,
  type Project,
} from '@prisma/client'

import prisma from '@/prisma.js'

export const listMembers = (projectId: Project['id']) => prisma.projectMembers.findMany({ where: { projectId }, include: { user: true } })

export const upsertMember = (data: Prisma.ProjectMembersUncheckedCreateInput) =>
  prisma.projectMembers.upsert({
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

export const deleteMember = (data: Prisma.ProjectMembersWhereUniqueInput['projectId_userId']) =>
  prisma.projectMembers.delete({
    where: {
      projectId_userId: data,
    },
  })
