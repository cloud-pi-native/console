import type { ProjectRoles } from '@dso-console/shared'
import type { Project, User } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export const getRoleByUserIdAndProjectId = async (userId: User['id'], projectId: Project['id']) => {
  return await prisma.role.findFirst({ select: { role: true }, where: { userId, projectId } })
}

export const getSingleOwnerByProjectId = async (projectId: Project['id']) => {
  return (await prisma.role.findFirst({
    select: { user: true },
    where: { role: 'owner', projectId },
  }))?.user
}

// UPDATE
export const updateUserProjectRole = async (userId: User['id'], projectId: Project['id'], role: ProjectRoles) => {
  return prisma.role.update({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    data: { role },
  })
}

// DELETE
export const deleteRoleByUserIdAndProjectId = async (userId: User['id'], projectId: Project['id']) => {
  return prisma.role.delete({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  })
}

// TECH
export const _dropRolesTable = async () => {
  await prisma.role.deleteMany({})
}

export const _createRole = async (data: Parameters<typeof prisma.role.upsert>[0]['create']) => {
  await prisma.role.upsert({
    create: data,
    update: data,
    where: {
      userId_projectId: {
        // @ts-ignore
        projectId: data.projectId,
        // @ts-ignore
        userId: data.userId,
      },
    },
  })
}
