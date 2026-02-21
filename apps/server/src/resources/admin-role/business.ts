import type { Project, ProjectRole } from '@prisma/client'
import type { AdminRole, adminRoleContract } from '@cpn-console/shared'
import { addLogs, getAdminRoleById, listAdminRoles } from '@/resources/queries-index.js'
import type { ErrorResType } from '@/utils/errors.js'
import { BadRequest400, Forbidden403 } from '@/utils/errors.js'
import prisma from '@/prisma.js'
import { hook } from '@/utils/hook-wrapper.js'

export async function listRoles() {
  return listAdminRoles()
    .then(roles => roles.map(role => ({ ...role, permissions: role.permissions.toString(), type: role.type ?? 'custom' })))
}

export async function patchRoles(
  roles: typeof adminRoleContract.patchAdminRoles.body._type,
  requestId: string,
): Promise<AdminRole[] | ErrorResType> {
  const dbRoles = await prisma.adminRole.findMany()
  const positionsAvailable: number[] = []
  const updatedRoles: (Omit<AdminRole, 'permissions'> & { permissions: bigint })[] = []

  for (const dbRole of dbRoles) {
    const matchingRole = roles.find(role => role.id === dbRole.id)
    if (matchingRole) {
      if (dbRole.type === 'system') {
        return new Forbidden403('Impossible de modifier un rôle système')
      }

      if (typeof matchingRole.position !== 'undefined' && !positionsAvailable.includes(matchingRole.position)) {
        positionsAvailable.push(matchingRole.position)
      }
      updatedRoles.push({
        id: dbRole.id,
        name: matchingRole.name ?? dbRole.name,
        permissions: matchingRole.permissions ? BigInt(matchingRole.permissions) : dbRole.permissions,
        position: matchingRole.position ?? dbRole.position,
        oidcGroup: matchingRole.oidcGroup ?? dbRole.oidcGroup,
        type: matchingRole.type ?? dbRole.type,
      })
    }
  }

  if (positionsAvailable.length && positionsAvailable.length !== dbRoles.length) return new BadRequest400('Les numéros de position des rôles sont incohérentes')
  for (const { id, ...role } of updatedRoles) {
    if (role.type === 'system') {
      return new Forbidden403('Ce rôle système ne peut pas être renommé')
    }
    await prisma.adminRole.update({ where: { id }, data: role })
    const hookReply = await hook.adminRole.upsert(id)
    await addLogs({ action: 'Update Admin Role', data: hookReply, requestId })
  }

  return listRoles()
}

export async function createRole(
  role: typeof adminRoleContract.createAdminRole.body._type,
  requestId: string,
) {
  const dbMaxPosRole = (await prisma.adminRole.findFirst({
    orderBy: { position: 'desc' },
    select: { position: true },
  }))?.position ?? -1

  const createdRole = await prisma.adminRole.create({
    data: {
      ...role,
      position: dbMaxPosRole + 1,
      permissions: 0n,
    },
  })

  const hookReply = await hook.adminRole.upsert(createdRole.id)
  await addLogs({ action: 'Create Admin Role', data: hookReply, requestId })

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

export async function deleteRole(
  roleId: Project['id'],
  requestId: string,
) {
  const role = await getAdminRoleById(roleId)
  if (role) {
    if (role.type === 'system') return new Forbidden403('Impossible de supprimer un rôle système')
    const hookReply = await hook.adminRole.delete(role)
    await addLogs({ action: 'Delete Admin Role', data: hookReply, requestId })
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
