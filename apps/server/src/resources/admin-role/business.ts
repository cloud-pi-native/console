import type { Project, ProjectRole } from '@prisma/client'
import type { AdminRole, adminRoleContract } from '@cpn-console/shared'
import {
  listAdminRoles,
} from '@/resources/queries-index.js'
import type { ErrorResType } from '@/utils/errors.js'
import { BadRequest400, Forbidden403 } from '@/utils/errors.js'
import prisma from '@/prisma.js'

export async function listRoles() {
  return listAdminRoles()
    .then(roles => roles.map(role => ({ ...role, permissions: role.permissions.toString() })))
}

export async function patchRoles(roles: typeof adminRoleContract.patchAdminRoles.body._type): Promise<AdminRole[] | ErrorResType> {
  const dbRoles = await prisma.adminRole.findMany()
  const positionsAvailable: number[] = []

  const updatedRoles: (Omit<AdminRole, 'permissions'> & { permissions: bigint })[] = dbRoles
    .filter(dbRole => roles.find(role => role.id === dbRole.id)) // filter non concerned dbRoles
    .map((dbRole) => {
      const matchingRole = roles.find(role => role.id === dbRole.id)
      if (typeof matchingRole?.position !== 'undefined' && !positionsAvailable.includes(matchingRole.position)) {
        positionsAvailable.push(matchingRole.position)
      }
      return {
        id: dbRole.id,
        name: matchingRole?.name ?? dbRole.name,
        permissions: matchingRole?.permissions ? BigInt(matchingRole?.permissions) : dbRole.permissions,
        position: matchingRole?.position ?? dbRole.position,
        oidcGroup: matchingRole?.oidcGroup ?? dbRole.oidcGroup,
        type: matchingRole?.type ?? dbRole.type,
      }
    })

  if (positionsAvailable.length && positionsAvailable.length !== dbRoles.length) return new BadRequest400('Les numéros de position des rôles sont incohérentes')
  for (const { id, ...role } of updatedRoles) {
    if (role.type === 'system') {
      return new Forbidden403('Ce rôle système ne peut pas être renommé')
    }
    await prisma.adminRole.update({ where: { id }, data: role })
  }

  return listRoles()
}

export async function createRole(role: typeof adminRoleContract.createAdminRole.body._type) {
  const dbMaxPosRole = (await prisma.adminRole.findFirst({
    orderBy: { position: 'desc' },
    select: { position: true },
  }))?.position ?? -1

  await prisma.adminRole.create({
    data: {
      ...role,
      position: dbMaxPosRole + 1,
      permissions: 0n,
    },
  })

  return listRoles()
}

export async function countRolesMembers() {
  const roles = await prisma.adminRole.findMany({ where: { oidcGroup: { equals: '' } }, select: { id: true } })
  const roleIds = roles.map(role => role.id)
  const users = await prisma.user.findMany({
    where: { adminRoleIds: { hasSome: roleIds } },
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

export async function deleteRole(roleId: Project['id']) {
  const role = await prisma.adminRole.findFirst({ where: { id: roleId } })
  if (role?.type === 'system') {
    throw new Forbidden403('Ce rôle système ne peut pas être supprimé')
  }
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
