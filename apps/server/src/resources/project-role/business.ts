import type { projectRoleContract } from '@cpn-console/shared'
import type { Project, ProjectRole } from '@prisma/client'
import prisma from '@/prisma.js'
import {
  deleteRole as deleteRoleQuery,
  listMembers,
  listRoles as listRolesQuery,
  updateRole,
} from '@/resources/queries-index.js'
import { BadRequest400, NotFound404 } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'

const oidcRegexp = /^\/[^/]+/
const systemTypePrefix = 'system:'

function isSystemRoleType(type: string | null | undefined) {
  return type?.startsWith(systemTypePrefix)
}

export async function listRoles(projectId: Project['id']) {
  const roles = await listRolesQuery(projectId)
  return roles.map(role => ({
    ...role,
    permissions: role.permissions.toString(),
    oidcGroup: role.oidcGroup ? role.oidcGroup.replace(oidcRegexp, '') : role.oidcGroup,
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
      if (isSystemRoleType(dbRole.type)) {
        return new BadRequest400('Ce rôle système ne peut pas être modifié')
      }
      if (isSystemRoleType(matchingRole.type)) {
        return new BadRequest400('Impossible de modifier un rôle en rôle système')
      }
      if (typeof matchingRole?.position !== 'undefined' && !positionsAvailable.includes(matchingRole?.position)) {
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
        oidcGroup: matchingRole.oidcGroup ? `/${project.slug}${matchingRole.oidcGroup}` : dbRole.oidcGroup,
        type: matchingRole.type ?? dbRole.type,
        projectId: dbRole.projectId,
      })
    }
  }

  if (positionsAvailable.length && positionsAvailable.length !== dbRoles.length) return new BadRequest400('Les numéros de position des rôles sont incohérentes')
  for (const { id, ...role } of updatedRoles) {
    await updateRole(id, role)
    await hook.projectRole.upsert(id)
  }

  return listRoles(projectId)
}

export async function createRole(projectId: Project['id'], role: typeof projectRoleContract.createProjectRole.body._type) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { slug: true } })
  if (!project) throw new NotFound404()
  if (isSystemRoleType(role.type)) {
    throw new BadRequest400('Impossible de créer un rôle système')
  }
  const dbMaxPosRole = (await prisma.projectRole.findFirst({
    where: { projectId },
    orderBy: { position: 'desc' },
    select: { position: true },
  }))?.position ?? -1

  if (role.oidcGroup && !role.oidcGroup.startsWith('/')) {
    throw new BadRequest400('oidcGroup doit commencer par /')
  }

  const createdRole = await prisma.projectRole.create({
    data: {
      ...role,
      projectId,
      position: dbMaxPosRole + 1,
      permissions: BigInt(role.permissions),
      oidcGroup: role.oidcGroup ? `/${project.slug}${role.oidcGroup}` : undefined,
    },
  })

  await hook.projectRole.upsert(createdRole.id)

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
  const role = await prisma.projectRole.findUnique({ where: { id: roleId }, select: { type: true } })
  if (!role) throw new NotFound404()
  if (isSystemRoleType(role.type)) {
    throw new BadRequest400('Ce rôle système ne peut pas être supprimé')
  }
  await hook.projectRole.delete(roleId)
  await deleteRoleQuery(roleId)
  return null
}
