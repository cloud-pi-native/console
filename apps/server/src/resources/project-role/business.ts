import type { projectRoleContract } from '@cpn-console/shared'
import type { Project, ProjectRole } from '@prisma/client'
import {
  deleteRole as deleteRoleQuery,
  listMembers,
  listRoles as listRolesQuery,
} from '@/resources/queries-index.js'
import { BadRequest400, Forbidden403, NotFound404 } from '@/utils/errors.js'
import prisma from '@/prisma.js'

export async function listRoles(projectId: Project['id']) {
  const roles = await listRolesQuery(projectId)
  return roles.map(role => ({
    ...role,
    permissions: role.permissions.toString(),
    oidcGroup: role.oidcGroup ? role.oidcGroup.replace(/^\/[^/]+\/console/, '') : role.oidcGroup,
  }))
}

export async function patchRoles(projectId: Project['id'], roles: typeof projectRoleContract.patchProjectRoles.body._type) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { slug: true } })
  if (!project) throw new NotFound404()
  const dbRoles = await listRolesQuery(projectId)
  const positionsAvailable: number[] = []

  const updatedRoles: (Omit<ProjectRole, 'permissions'> & { permissions: bigint })[] = []

  for (const dbRole of dbRoles) {
    const matchingRole = roles.find(role => role.id === dbRole.id)
    if (matchingRole) {
      if (dbRole.type === 'system') {
        return new Forbidden403('Ce rôle système ne peut pas être renommé')
      }

      if (typeof matchingRole.position !== 'undefined' && !positionsAvailable.includes(matchingRole.position)) {
        positionsAvailable.push(matchingRole.position)
      }
      if (matchingRole.oidcGroup && !matchingRole.oidcGroup.startsWith('/')) {
        return new BadRequest400('oidcGroup doit commencer par /')
      }
      updatedRoles.push({
        id: dbRole.id,
        name: matchingRole.name ?? dbRole.name,
        permissions: matchingRole.permissions ? BigInt(matchingRole.permissions) : dbRole.permissions,
        position: matchingRole.position ?? dbRole.position,
        oidcGroup: matchingRole.oidcGroup ? `/${project.slug}/console${matchingRole.oidcGroup}` : dbRole.oidcGroup,
        type: matchingRole.type ?? dbRole.type,
        projectId: dbRole.projectId,
      })
    }
  }

  if (positionsAvailable.length && positionsAvailable.length !== dbRoles.length) return new BadRequest400('Les numéros de position des rôles sont incohérentes')
  for (const { id, ...role } of updatedRoles) {
    await prisma.projectRole.update({ where: { id }, data: role })
  }

  return listRoles(projectId)
}

export async function createRole(projectId: Project['id'], role: typeof projectRoleContract.createProjectRole.body._type) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { slug: true } })
  if (!project) throw new NotFound404()
  const dbMaxPosRole = (await prisma.projectRole.findFirst({
    where: { projectId },
    orderBy: { position: 'desc' },
    select: { position: true },
  }))?.position ?? -1

  if (role.type === 'system') {
    return new Forbidden403('Ce rôle système ne peut pas être renommé')
  }

  if (role.oidcGroup && !role.oidcGroup.startsWith('/')) {
    throw new BadRequest400('oidcGroup doit commencer par /')
  }

  await prisma.projectRole.create({
    data: {
      ...role,
      projectId,
      position: dbMaxPosRole + 1,
      permissions: BigInt(role.permissions),
      oidcGroup: role.oidcGroup ? `/${project.slug}/console${role.oidcGroup}` : undefined,
    },
  })

  return listRoles(projectId)
}

export async function countRolesMembers(projectId: Project['id']) {
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

export async function deleteRole(roleId: Project['id']) {
  const role = await prisma.projectRole.findUnique({ where: { id: roleId } })
  if (role?.type === 'system') {
    return new Forbidden403('Ce rôle système ne peut pas être supprimé')
  }
  await deleteRoleQuery(roleId)
  return null
}
