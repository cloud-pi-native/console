import prisma from '@/prisma.js'
import type { Environment, Permission, User } from '@prisma/client'

// GET
export const getEnvironmentPermissions = async (environmentId: Environment['id']) => {
  return prisma.permission.findMany({ where: { environmentId } })
}

export const getUserPermissions = async (userId: User['id']) => {
  return prisma.permission.findMany({ where: { userId } })
}

export const getPermissionByUserIdAndEnvironmentId = async (userId: User['id'], environmentId: Environment['id']) => {
  return prisma.permission.findMany({
    select: { level: true },
    where: { userId, environmentId },
  })
}

// CREATE
export const setPermission = async ({ userId, environmentId, level }: { userId: User['id'], environmentId: Environment['id'], level: Permission['level'] }) => {
  return prisma.permission.create({
    data: { userId, environmentId, level },
    include: { environment: true },
  })
}

// UPDATE
export const updatePermission = async ({ userId, environmentId, level }: { userId: User['id'], environmentId: Environment['id'], level: Permission['level'] }) => {
  return prisma.permission.update({
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
export const deletePermission = async (userId: User['id'], environmentId: Environment['id']) => {
  return prisma.permission.deleteMany({ where: { userId, environmentId } })
}

export const deletePermissionById = async (permissionId: Permission['id']) => {
  return prisma.permission.delete({ where: { id: permissionId } })
}

// TECH
export const _dropPermissionsTable = async () => {
  await prisma.permission.deleteMany({})
}
