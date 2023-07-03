import { ProjectRoles } from 'shared'
import { Projects, Users } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export const getRoleByUserIdAndProjectId = async (userId: Users['id'], projectId: Projects['id']) => {
  return await prisma.roles.findFirst({ select: { role: true }, where: { userId, projectId } })
}

export const getSingleOwnerByProjectId = async (projectId: Projects['id']) => {
  return (await prisma.roles.findFirst({
    select: { user: true },
    where: { role: 'owner', projectId },
  })).user
}

// UPDATE
export const updateUserProjectRole = async (userId: Users['id'], projectId: Projects['id'], role: ProjectRoles) => {
  return prisma.roles.update({
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
export const deleteRoleByUserIdAndProjectId = async (userId: Users['id'], projectId: Projects['id']) => {
  return prisma.roles.delete({
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
  await prisma.roles.deleteMany({})
}

export const _createRole = async (data: Parameters<typeof prisma.roles.upsert>[0]['create']) => {
  await prisma.roles.upsert({
    create: data,
    update: data,
    where: {
      userId_projectId: {
        projectId: data.projectId,
        userId: data.userId,
      },
    },
  })
}
