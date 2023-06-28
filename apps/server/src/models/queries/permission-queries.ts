import { prisma } from '../../connect.js'

// GET
export const getEnvironmentPermissions = async (environmentId) => {
  return prisma.permission.findMany({ where: { environmentId } })
}

export const getUserPermissions = async (userId) => {
  return prisma.permission.findMany({ where: { userId } })
}

export const getPermissionByUserIdAndEnvironmentId = async (userId, environmentId) => {
  return prisma.permission.findMany({
    select: { level: true },
    where: { userId, environmentId },
  })
}

// CREATE
export const setPermission = async ({ userId, environmentId, level }) => {
  return prisma.permission.create({ data: { userId, environmentId, level } })
}

// UPDATE
export const updatePermission = async ({ userId, environmentId, level }) => {
  return prisma.permission.update({
    where: {
      userId,
      environmentId,
    },
    data: {
      userId,
      environmentId,
      level,
    },
  })
}

// DELETE
export const deletePermission = async (userId, environmentId) => {
  return prisma.permission.delete({ where: { userId, environmentId } })
}

export const deletePermissionById = async (permissionId) => {
  return prisma.permission.delete({ where: { id: permissionId } })
}

// TECH
export const _dropPermissionsTable = async () => {
  await prisma.permission.deleteMany({})
}
