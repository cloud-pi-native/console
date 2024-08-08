import type { Environment, Permission, User } from '@prisma/client'
import prisma from '@/prisma.js'

// GET
export const getEnvironmentPermissions = (environmentId: Environment['id']) =>
  prisma.permission.findMany({
    where: { environmentId },
  })

export const getUserPermissions = (userId: User['id']) =>
  prisma.permission.findMany({
    where: { userId },
  })

export const getPermissionByUserIdAndEnvironmentId = (
  userId: User['id'], environmentId: Environment['id'],
) =>
  prisma.permission.findUnique({
    select: { level: true },
    where: { userId_environmentId: { userId, environmentId } },
  })

// CREATE
type UpsertPermissionsParams = {
  userId: User['id']
  environmentId: Environment['id']
  level: Permission['level']
}

export const setPermission = ({ userId, environmentId, level }: UpsertPermissionsParams) =>
  prisma.permission.upsert({
    create: { userId, environmentId, level },
    update: { level },
    where: { userId_environmentId: { userId, environmentId } },
  })

// UPDATE
export const upsertPermission = ({ userId, environmentId, level }: UpsertPermissionsParams) =>
  prisma.permission.update({
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

// DELETE
export const deletePermission = (userId: User['id'], environmentId: Environment['id']) =>
  prisma.permission.deleteMany({ where: { userId, environmentId } })

export const deletePermissionById = (permissionId: Permission['id']) =>
  prisma.permission.delete({ where: { id: permissionId } })

// TECH
export const _dropPermissionsTable = prisma.permission.deleteMany
