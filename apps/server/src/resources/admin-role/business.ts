import type { Project, ProjectRole } from '@prisma/client'
import {
  listAdminRoles,
} from '@/resources/queries-index.js'
import { AdminRole, adminRoleContract } from '@cpn-console/shared'
import { BadRequest400, ErrorResType } from '@/utils/controller.js'
import prisma from '@/prisma.js'

export const listRoles = async () => listAdminRoles()
  .then(roles => roles.map(role => ({ ...role, permissions: role.permissions.toString() })))

export const patchRoles = async (roles: typeof adminRoleContract.patchAdminRoles.body._type): Promise<AdminRole[] | ErrorResType> => {
  const dbRoles = await listRoles()
  const positionsAvailable: number[] = []

  const updatedRoles: (Omit<AdminRole, 'permissions'> & { permissions: bigint })[] = dbRoles.map((dbRole) => {
    const matchingRole = roles.find(role => role.id === dbRole.id)
    if (matchingRole?.position && !positionsAvailable.includes(matchingRole.position)) {
      positionsAvailable.push(matchingRole.position)
    }
    return {
      id: matchingRole?.id ?? dbRole.id,
      name: matchingRole?.name ?? dbRole.name,
      permissions: matchingRole?.permissions ? BigInt(matchingRole?.permissions) : BigInt(dbRole.permissions),
      position: matchingRole?.position ?? dbRole.position,
      oidcGroup: matchingRole?.oidcGroup ?? dbRole.oidcGroup,
    }
  })
  if (positionsAvailable.length && positionsAvailable.length !== dbRoles.length) return new BadRequest400('Les numéros de position des rôles sont incohérentes')
  for (const { id, ...role } of updatedRoles) {
    await prisma.adminRole.update({ where: { id }, data: role })
  }

  return listRoles()
}

export const createRole = async (role: typeof adminRoleContract.createAdminRole.body._type) => {
  const dbMaxPosRole = (await prisma.adminRole.findFirst({
    orderBy: { position: 'desc' },
    select: { position: true },
  }))?.position

  await prisma.adminRole.create({
    data: {
      ...role,
      position: dbMaxPosRole ? dbMaxPosRole + 1 : 0,
      permissions: 0n,
    },
  })

  return listRoles()
}

export const countRolesMembers = async () => {
  const roles = await listRoles()
  const users = await prisma.user.findMany({
    select: { adminRoleIds: true },
  })
  const rolesCounts: Record<ProjectRole['id'], number> = Object.fromEntries(roles.map(role => [role.id, 0])) // {role uuid: 0}
  for (const { adminRoleIds } of users) {
    for (const roleId of adminRoleIds) {
      rolesCounts[roleId]++
    }
  }
  return rolesCounts
}

export const deleteRole = async (roleId: Project['id']) => {
  const allUsers = await prisma.user.findMany({
    where: {
      adminRoleIds: { has: roleId },
    },
  })
  for (const user of allUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { adminRoleIds: user.adminRoleIds.filter(adminRoleId => adminRoleId !== roleId) },
    })
  }
  await prisma.adminRole.delete({ where: { id: roleId } })
  return null
}
