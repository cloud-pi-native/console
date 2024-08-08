import { projectRoleContract } from '@cpn-console/shared'
import type { Project, ProjectRole } from '@prisma/client'
import {
  listRoles as listRolesQuery,
  deleteRole as deleteRoleQuery,
  updateRole,
  listMembers,
} from '@/resources/queries-index.js'
import { BadRequest400 } from '@/utils/errors.js'
import prisma from '@/prisma.js'

export const listRoles = async (projectId: Project['id']) => listRolesQuery(projectId)
  .then(roles => roles.map(role => ({ ...role, permissions: role.permissions.toString() })))

export const patchRoles = async (projectId: Project['id'], roles: typeof projectRoleContract.patchProjectRoles.body._type) => {
  const dbRoles = await listRoles(projectId)
  const positionsAvailable: number[] = []

  const updatedRoles = dbRoles.map((dbRole) => {
    const matchingRole = roles.find(role => role.id === dbRole.id)
    if (matchingRole?.position && !positionsAvailable.includes(matchingRole.position)) {
      positionsAvailable.push(matchingRole.position)
    }
    return {
      id: matchingRole?.id ?? dbRole.id,
      name: matchingRole?.name ?? dbRole.name,
      permissions: matchingRole?.permissions ? BigInt(matchingRole?.permissions) : BigInt(dbRole.permissions),
      position: matchingRole?.position ?? dbRole.position,
    }
  })
  if (positionsAvailable.length && positionsAvailable.length !== dbRoles.length) return new BadRequest400('Les numéros de position des rôles sont incohérentes')
  for (const { id, ...role } of updatedRoles) {
    await updateRole(id, role)
  }

  return listRoles(projectId)
}

export const createRole = async (projectId: Project['id'], role: typeof projectRoleContract.createProjectRole.body._type) => {
  const dbMaxPosRole = (await prisma.projectRole.findFirst({
    where: { projectId },
    orderBy: { position: 'desc' },
    select: { position: true },
  }))?.position

  await prisma.projectRole.create({
    data: {
      ...role,
      projectId,
      position: dbMaxPosRole ? dbMaxPosRole + 1 : 0,
      permissions: BigInt(role.permissions),
    },
  })

  return listRoles(projectId)
}

export const countRolesMembers = async (projectId: Project['id']) => {
  const roles = await listRoles(projectId)
  const members = await listMembers(projectId)
  const rolesCounts: Record<ProjectRole['id'], number> = Object.fromEntries(roles.map(role => [role.id, 0])) // {role uuid: 0}
  for (const { roleIds } of members) {
    for (const roleId of roleIds) {
      rolesCounts[roleId]++
    }
  }
  return rolesCounts
}

export const deleteRole = async (roleId: Project['id']) => {
  await deleteRoleQuery(roleId)
  return null
}
