import prisma from '@/prisma.js'
import { Environments, Permissions, Users } from '@prisma/client'

// GET
export const getEnvironmentPermissions = async (environmentId: Environments['id']) => {
  return prisma.permissions.findMany({ where: { environmentId } })
}

export const getUserPermissions = async (userId: Users['id']) => {
  return prisma.permissions.findMany({ where: { userId } })
}

export const getPermissionByUserIdAndEnvironmentId = async (userId: Users['id'], environmentId: Environments['id']) => {
  return prisma.permissions.findMany({
    select: { level: true },
    where: { userId, environmentId },
  })
}

// CREATE
export const setPermission = async ({ userId, environmentId, level }: { userId: Users['id'], environmentId: Environments['id'], level: Permissions['level'] }) => {
  return prisma.permissions.create({ data: { userId, environmentId, level } })
}

// UPDATE
export const updatePermission = async ({ userId, environmentId, level }: { userId: Users['id'], environmentId: Environments['id'], level: Permissions['level'] }) => {
  return prisma.permissions.update({
    where: {
      userId_environmentId: {
        userId,
        environmentId,
      },
    },
    data: {
      userId,
      environmentId,
      level,
    },
  })
}

// DELETE
export const deletePermission = async (userId: Users['id'], environmentId: Environments['id']) => {
  return prisma.permissions.deleteMany({ where: { userId, environmentId } })
}

export const deletePermissionById = async (permissionId: Permissions['id']) => {
  return prisma.permissions.delete({ where: { id: permissionId } })
}

// TECH
export const _dropPermissionsTable = async () => {
  await prisma.permissions.deleteMany({})
}
